import type { DiscoverResult, Job, Profile, SearchFilters, SourceReport } from '../types'
import { fetchAdzuna, fetchArbeitnow, fetchJobicy, fetchRemoteOk, fetchRemotive } from './sources/boards'
import { calculateMatches } from '../matching/matchCalculator'
import { aiEnabled } from '../ai/anthropic'
import { rankWithAI } from '../ai/rankJobs'
import { searchJobsWithAI } from '../ai/webSearchJobs'

const GENERIC = /^(senior|junior|lead|principal|staff|associate|sr\.?|jr\.?)\s+/i

/** Search queries derived from the resume: headline, recent titles, then top skills. */
export function buildQueries(profile: Profile, userQuery?: string): string[] {
  const out: string[] = []
  const add = (q?: string) => {
    const t = (q || '').replace(GENERIC, '').replace(/\s+/g, ' ').trim()
    if (t && t.length > 2 && !out.some(o => o.toLowerCase() === t.toLowerCase())) out.push(t)
  }
  add(userQuery)
  add(profile.headline)
  profile.experience.slice(0, 2).forEach(e => add(e.title))
  if (out.length < 2) profile.skills.filter(s => s.years || true).slice(0, 2).forEach(s => add(s.name))
  return out.slice(0, 3)
}

async function settle(name: string, run: () => Promise<Job[]>, reports: SourceReport[]): Promise<Job[]> {
  try {
    const jobs = (await run()).filter(j => j.title && j.company && /^https?:\/\//.test(j.url))
    reports.push({ name, count: jobs.length })
    return jobs
  } catch (err) {
    reports.push({ name, count: 0, error: err instanceof Error ? err.message : 'failed' })
    return []
  }
}

export async function discoverJobs(profile: Profile, filters: SearchFilters, opts: { useAI?: boolean } = {}): Promise<DiscoverResult> {
  const started = Date.now()
  const queries = buildQueries(profile, filters.query)
  const reports: SourceReport[] = []
  const tasks: Array<Promise<Job[]>> = []

  for (const q of queries) {
    tasks.push(settle(`Remotive · ${q}`, () => fetchRemotive(q), reports))
    tasks.push(settle(`Jobicy · ${q}`, () => fetchJobicy(q.split(' ').slice(-1)[0] || q), reports))
    tasks.push(settle(`RemoteOK · ${q}`, () => fetchRemoteOk(q), reports))
    tasks.push(settle(`Arbeitnow · ${q}`, () => fetchArbeitnow(q, filters), reports))
    tasks.push(settle(`Adzuna · ${q}`, () => fetchAdzuna(q, filters), reports))
  }
  const useAI = Boolean(opts.useAI) && aiEnabled()
  if (useAI) {
    tasks.push(settle('AI web search', () => searchJobsWithAI(profile, queries[0] || 'software', filters.location || ''), reports))
  }

  const all = (await Promise.all(tasks)).flat()

  const seen = new Set<string>()
  const unique = all.filter(j => {
    const key = `${j.company}|${j.title}`.toLowerCase().replace(/\s+/g, ' ')
    const urlKey = j.url.split('?')[0]
    if (seen.has(key) || seen.has(urlKey)) return false
    seen.add(key)
    seen.add(urlKey)
    return true
  })

  let scored: Job[] = calculateMatches(profile, unique, { wantRemote: filters.remote }).sort((a, b) => b.matchScore - a.matchScore)

  if (useAI && scored.length) {
    try {
      scored = (await rankWithAI(profile, scored, 12)).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    } catch (err) {
      reports.push({ name: 'AI ranking', count: 0, error: err instanceof Error ? err.message : 'failed' })
    }
  }

  // collapse the per-query source reports into one row per source
  const merged = new Map<string, SourceReport>()
  for (const r of reports) {
    const name = r.name.split(' · ')[0]
    const cur = merged.get(name) || { name, count: 0 }
    cur.count += r.count
    if (r.error) cur.error = r.error
    merged.set(name, cur)
  }
  // Adzuna without keys is "not configured", not a failure
  const sources = Array.from(merged.values()).filter(r => !(r.name === 'Adzuna' && r.count === 0 && !r.error))

  return {
    jobs: scored.slice(0, 60),
    meta: { queries, sources, total: scored.length, durationMs: Date.now() - started },
  }
}
