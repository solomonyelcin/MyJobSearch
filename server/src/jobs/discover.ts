import type { CompanyStatus, DiscoverResult, Job, Profile, SearchFilters, SourceReport } from '../types'
import { fetchAdzuna, fetchArbeitnow, fetchJobicy, fetchRemoteOk, fetchRemotive } from './sources/boards'
import { calculateMatches } from '../matching/matchCalculator'
import { aiEnabled } from '../ai/anthropic'
import { rankWithAI } from '../ai/rankJobs'
import { searchJobsWithAI } from '../ai/webSearchJobs'
import { DEFAULT_LOCATION, filterByLocation, isRemoteQuery, jobInLocation } from './location'
import { fetchAllCompanyJobs } from './companyJobs'
import { fetchJooble, joobleReady } from './sources/jooble'
import { enrichDescriptions } from './sources/ats'

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
  const location = (filters.location ?? '').trim() || DEFAULT_LOCATION
  const includeRemote = Boolean(filters.includeRemote)
  const remoteSearch = isRemoteQuery(location)
  const wantsRemoteBoards = remoteSearch || includeRemote
  const queries = buildQueries(profile, filters.query)
  const reports: SourceReport[] = []
  const notices: string[] = []
  const tasks: Array<Promise<Job[]>> = []
  const searchFilters: SearchFilters = { ...filters, location }

  const adzunaReady = Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY)

  for (const q of queries) {
    // Remote-only boards are skipped unless the user wants remote jobs: they would never be in a city.
    if (wantsRemoteBoards) {
      tasks.push(settle(`Remotive · ${q}`, () => fetchRemotive(q), reports))
      tasks.push(settle(`Jobicy · ${q}`, () => fetchJobicy(q.split(' ').slice(-1)[0] || q), reports))
      tasks.push(settle(`RemoteOK · ${q}`, () => fetchRemoteOk(q), reports))
    }
    tasks.push(settle(`Arbeitnow · ${q}`, () => fetchArbeitnow(q, searchFilters), reports))
    tasks.push(settle(`Adzuna · ${q}`, () => fetchAdzuna(q, searchFilters), reports))
    if (joobleReady()) tasks.push(settle(`Jooble · ${q}`, () => fetchJooble(q, searchFilters), reports))
  }
  // Company career portals (one fetch per company, not per query)
  let companyStatuses: CompanyStatus[] = []
  if (!remoteSearch) {
    tasks.push(
      settle('Company career pages', async () => {
        const { jobs, statuses } = await fetchAllCompanyJobs(location, queries)
        companyStatuses = statuses
        // report only what is actually in the chosen place, not every role the companies have
        return jobs
      }, reports),
    )
  }
  const aiOn = aiEnabled()
  const useAI = Boolean(opts.useAI) && aiOn
  if (!remoteSearch) {
    if (!aiOn) notices.push('AI web search is off because the server has no ANTHROPIC_API_KEY. It is the best way to find more jobs in ' + location + '.')
    else if (!useAI) notices.push('AI web search is not ticked for this search. Tick "AI web search & ranking" and search again for much wider coverage.')
    if (!adzunaReady && !joobleReady()) notices.push('Optional: a free Jooble key (JOOBLE_API_KEY) or Adzuna keys add more on-site listings.')
  }
  let aiErrors: string[] = []
  if (useAI) {
    tasks.push(
      settle('AI web search', async () => {
        const r = await searchJobsWithAI(profile, queries, location, includeRemote)
        aiErrors = r.errors
        if (r.jobs.length === 0 && r.errors.length) throw new Error(r.errors[0])
        return r.jobs
      }, reports),
    )
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

  // ONLY the chosen location (plus remote when opted in)
  const inPlace = filterByLocation(unique, location, includeRemote)
  const rank = (j: Job) => (j.matchScore || 0) - (j.remote && !jobInLocation(j, location) ? 15 : 0)
  let scored: Job[] = calculateMatches(profile, inPlace, { location }).sort((a, b) => rank(b) - rank(a))

  // Company pages list every role (HR, finance...). Fetch full text for the best few, rescore, then drop clear mismatches.
  if (scored.some(j => j.source === 'company')) {
    try {
      const enriched = await enrichDescriptions(scored, 40)
      scored = calculateMatches(profile, enriched, { location }).sort((a, b) => b.matchScore - a.matchScore)
    } catch {
      /* keep the un-enriched scores */
    }
    scored = scored.filter(j => j.source !== 'company' || (j.matchScore || 0) >= 20)
  }

  if (useAI && scored.length) {
    try {
      scored = (await rankWithAI(profile, scored, 15)).sort((a, b) => rank(b) - rank(a))
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
  if (companyStatuses.length) {
    const bad = companyStatuses.filter(c => !c.ok).length
    if (bad > 0) notices.push(`${bad} of ${companyStatuses.length} company career pages could not be reached (see /api/jobs/companies/health).`)
  }
  const inPlaceCompany = inPlace.filter(j => j.source === 'company').length
  if (merged.has('Company career pages')) merged.get('Company career pages')!.count = inPlaceCompany
  if (aiErrors.length) notices.push(`AI web search had a problem: ${aiErrors[0].slice(0, 220)}`)
  const sources = Array.from(merged.values()).filter(r => !(r.name === 'Adzuna' && r.count === 0 && !r.error))

  return {
    jobs: scored.slice(0, 60),
    meta: { queries, sources, total: scored.length, durationMs: Date.now() - started, location, includeRemote, notices, companies: companyStatuses.length ? companyStatuses : undefined },
  }
}
