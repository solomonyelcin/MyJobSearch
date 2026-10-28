import type { Profile, Job } from '../types'
import { findSkills } from '../skills/vocabulary'

export type MatchResult = Job & { matchScore: number }

const STOP = new Set(['the', 'and', 'for', 'with', 'senior', 'junior', 'sr', 'jr', 'lead', 'staff', 'principal', 'ii', 'iii', 'remote'])
const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w))

const SYNONYMS: Record<string, string> = {
  developer: 'engineer', programmer: 'engineer', swe: 'engineer', sde: 'engineer', frontend: 'front', 'front-end': 'front',
  backend: 'back', 'back-end': 'back', fullstack: 'full', 'full-stack': 'full',
}
const norm = (w: string) => SYNONYMS[w] || w

function titleSimilarity(profile: Profile, job: Job): number {
  const wanted = [profile.headline, ...profile.experience.slice(0, 3).map(e => e.title)].filter(Boolean) as string[]
  if (!wanted.length) return 50
  const jt = new Set(tokens(job.title).map(norm))
  if (!jt.size) return 40
  let best = 0
  wanted.forEach((w, i) => {
    const wt = tokens(w).map(norm)
    if (!wt.length) return
    const overlap = wt.filter(t => jt.has(t)).length / Math.max(wt.length, jt.size)
    best = Math.max(best, overlap * (i === 0 ? 1 : 0.9))
  })
  return Math.min(100, Math.round(best * 130))
}

function requiredYears(text: string): number {
  let max = 0
  for (const m of text.matchAll(/(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years?|yrs?)(?:\s+of)?(?:\s+(?:relevant|professional|work|industry|hands-on))?(?:\s+experience)?/gi)) {
    const n = parseInt(m[1], 10)
    if (n > 0 && n <= 20) max = Math.max(max, n)
  }
  return max
}

function locationFit(profile: Profile, job: Job, wantRemote?: boolean): number {
  if (job.remote && (wantRemote || !profile.location)) return 100
  if (!profile.location) return 60
  const city = profile.location.split(',')[0].trim().toLowerCase()
  const jl = job.location.toLowerCase()
  if (city && jl.includes(city)) return 100
  if (job.remote) return 80
  return 35
}

export function scoreJob(profile: Profile, job: Job, opts: { wantRemote?: boolean } = {}): MatchResult {
  const mine = new Map(profile.skills.map(s => [s.name.toLowerCase(), s.name]))
  const hard = [...mine.values()]
  const jobText = `${job.title}\n${job.requirements.join('\n')}\n${job.description}\n${(job.tags || []).join(' ')}`
  const jobSkills = findSkills(jobText).map(h => h.name)

  const matched = jobSkills.filter(s => mine.has(s.toLowerCase()))
  const missing = jobSkills.filter(s => !mine.has(s.toLowerCase())).slice(0, 8)

  const titleMatch = titleSimilarity(profile, job)
  let skillMatch: number
  // No recognisable skills in the posting: lean on the title instead of giving free points.
  if (jobSkills.length === 0) skillMatch = hard.length ? Math.round(10 + titleMatch * 0.5) : 0
  else skillMatch = Math.min(100, Math.round((matched.length / Math.min(jobSkills.length, 10)) * 100))

  const need = requiredYears(`${job.title} ${job.description}`)
  const have = profile.totalYears ?? profile.experience.reduce((a, e) => a + (e.years || 0), 0)
  let experienceMatch = 70
  if (need > 0) experienceMatch = Math.round(Math.min(1, have / need) * 100)
  else if (job.experienceLevel === 'senior') experienceMatch = have >= 5 ? 95 : have >= 3 ? 70 : 40
  else if (job.experienceLevel === 'entry') experienceMatch = have <= 3 ? 100 : 80

  const locationMatch = locationFit(profile, job, opts.wantRemote)

  let matchScore = Math.round(skillMatch * 0.45 + titleMatch * 0.25 + experienceMatch * 0.2 + locationMatch * 0.1)
  // A job that shares neither skills nor title with the candidate is not a match, whatever the location.
  if (titleMatch < 15 && skillMatch < 35) matchScore = Math.round(matchScore * 0.6)
  return {
    ...job,
    matchScore: Math.max(0, Math.min(100, matchScore)),
    matchBreakdown: { skillMatch, titleMatch, experienceMatch, locationMatch },
    matchedSkills: matched.slice(0, 12),
    missingSkills: missing,
  }
}

export function calculateMatches(profile: Profile, jobs: Job[], opts: { wantRemote?: boolean } = {}): MatchResult[] {
  return jobs.map(j => scoreJob(profile, j, opts))
}
