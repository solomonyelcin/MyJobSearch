import { createHash } from 'crypto'
import type { Job, Profile } from '../types'
import { callClaude, parseJsonLoose } from './anthropic'

const SYSTEM = `You are a meticulous job-hunting researcher with live web search. Find CURRENT, OPEN job postings for one candidate.
Rules:
- Every job must come from a page you actually opened or saw in search results, and "url" must be the direct link to that single posting (not a search-results or company-home page).
- Only include postings located in the requested place. Do not include remote-only roles unless the instructions explicitly allow remote.
- Skip anything that looks closed or older than ~60 days. Never invent a posting, company, URL or detail; leave a field empty if the page does not say.
- "requirements" must be the concrete skills/qualifications listed in the posting (short phrases, max 12).
Return ONLY JSON: {"jobs":[{"title":string,"company":string,"location":string,"url":string,"summary":string,"requirements":[string],"experience":string|null,"salary":string|null,"posted":string|null,"remote":boolean}]}
Return at most 10 jobs.`

interface Angle {
  label: string
  prompt: string
}

function angles(profile: Profile, queries: string[], location: string, includeRemote: boolean): Angle[] {
  const role = queries[0] || profile.headline || 'software engineer'
  const second = queries[1] || role
  const top = profile.skills.filter(s => s.name).slice(0, 8).map(s => s.name)
  const years = profile.totalYears ? `${Math.max(1, Math.round(profile.totalYears))} years` : 'unknown years'
  const remote = includeRemote ? 'Remote roles are acceptable too.' : 'Do NOT include remote or other-city roles.'
  const who = `Candidate: ${profile.headline || role}, about ${years} of experience. Key skills: ${top.join(', ')}.`
  return [
    {
      label: 'job boards',
      prompt: `${who}\nFind open "${role}" jobs in ${location} listed on Naukri, foundit, LinkedIn, Indeed, Glassdoor, Instahyre, Cutshort or Wellfound. ${remote} Prefer postings from the last 30 days and a seniority that suits the candidate.`,
    },
    {
      label: 'company careers',
      prompt: `${who}\nFind open "${second}" jobs in ${location} on the official careers pages of IT and product companies with offices there (for example Zoho, Freshworks, Cognizant, TCS, Infosys, HCL, Wipro, Capgemini, Accenture, Ford, PayPal, Zeta, Chargebee, Kissflow, Mphasis, Hexaware, Virtusa, Amazon, Oracle). ${remote}`,
    },
    {
      label: 'skills',
      prompt: `${who}\nFind open jobs in ${location} that explicitly require ${top.slice(0, 4).join(', ') || role} (any job title that fits these skills). ${remote} Prioritise roles where several of those skills are required.`,
    },
  ]
}

function toJob(j: Record<string, any>): Job | null {
  const url = typeof j.url === 'string' ? j.url.trim() : ''
  if (!/^https?:\/\//i.test(url) || !j.title || !j.company) return null
  const requirements = Array.isArray(j.requirements) ? j.requirements.map(String).filter(Boolean).slice(0, 12) : []
  const summary = String(j.summary || '')
  const posted = Date.parse(String(j.posted || ''))
  return {
    id: 'ai-' + createHash('sha1').update(url.split('#')[0]).digest('hex').slice(0, 12),
    title: String(j.title).trim(),
    company: String(j.company).trim(),
    location: String(j.location || '').trim(),
    remote: Boolean(j.remote),
    salary: j.salary ? { text: String(j.salary) } : undefined,
    description: [summary, requirements.length ? `Requirements: ${requirements.join('; ')}` : '', j.experience ? `Experience: ${j.experience}` : ''].filter(Boolean).join('\n'),
    requirements,
    experienceText: j.experience ? String(j.experience) : undefined,
    url,
    source: 'ai-web',
    postedDate: Number.isFinite(posted) ? new Date(posted).toISOString() : undefined,
  }
}

/**
 * Several differently-angled web searches run in parallel (job boards, company career pages, skill-driven),
 * then merged. One failed angle never loses the others.
 */
export async function searchJobsWithAI(
  profile: Profile,
  queries: string[],
  location: string,
  includeRemote: boolean,
): Promise<{ jobs: Job[]; errors: string[] }> {
  const runs = await Promise.allSettled(
    angles(profile, queries, location, includeRemote).map(async a => {
      const reply = await callClaude({
        system: SYSTEM,
        user: a.prompt,
        maxTokens: 5000,
        webSearch: { maxUses: 6, country: 'IN' },
        timeoutMs: 110000,
      })
      const data = parseJsonLoose<{ jobs?: Array<Record<string, any>> }>(reply)
      return (data.jobs || []).map(toJob).filter((j): j is Job => j !== null)
    }),
  )

  const byId = new Map<string, Job>()
  const errors: string[] = []
  for (const r of runs) {
    if (r.status === 'fulfilled') {
      for (const j of r.value) {
        if (!byId.has(j.id)) byId.set(j.id, j)
      }
    } else {
      errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason))
    }
  }
  return { jobs: Array.from(byId.values()), errors }
}
