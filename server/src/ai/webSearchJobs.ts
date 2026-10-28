import { createHash } from 'crypto'
import type { Job, Profile } from '../types'
import { callClaude, parseJsonLoose } from './anthropic'

const SYSTEM = `You are a job-hunting assistant with live web search. Find CURRENT, real, open job postings for the candidate.
Rules: only include postings located in the requested location (and remote roles only if explicitly allowed); only include postings you actually found via search results with a direct URL on a careers page or job board. Never invent a posting or URL.
Return ONLY JSON: {"jobs":[{"title":string,"company":string,"location":string,"url":string,"summary":string,"salary":string|null,"remote":boolean}]}
Return at most 8 jobs.`

export async function searchJobsWithAI(profile: Profile, query: string, location: string, includeRemote: boolean): Promise<Job[]> {
  const skills = profile.skills.slice(0, 12).map(s => s.name).join(', ')
  const reply = await callClaude({
    system: SYSTEM,
    user: `Candidate: ${profile.headline || query}, ~${profile.totalYears ?? '?'} years experience, skills: ${skills}.\nSearch for: "${query}" roles located in ${location || 'any location'}. ${includeRemote ? 'Remote roles are also acceptable.' : 'Do NOT include remote or other-city roles.'} Prefer postings from the last 30 days.`,
    maxTokens: 4000,
    webSearch: { maxUses: 4 },
    timeoutMs: 90000,
  })
  const data = parseJsonLoose<{ jobs?: Array<Record<string, any>> }>(reply)
  return (data.jobs || [])
    .filter(j => typeof j.url === 'string' && /^https?:\/\//.test(j.url) && j.title && j.company)
    .map(j => ({
      id: 'ai-' + createHash('sha1').update(String(j.url)).digest('hex').slice(0, 12),
      title: String(j.title),
      company: String(j.company),
      location: String(j.location || ''),
      remote: Boolean(j.remote),
      salary: j.salary ? { text: String(j.salary) } : undefined,
      description: String(j.summary || ''),
      requirements: [],
      url: String(j.url),
      source: 'ai-web' as const,
    }))
}
