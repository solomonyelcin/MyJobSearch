import type { Job, Profile } from '../types'
import { callClaude, parseJsonLoose } from './anthropic'
import { truncate } from '../util/html'

const SYSTEM = `You are a recruiter scoring job fit for one candidate. Be strict and honest; do not flatter.
Return ONLY JSON: {"results":[{"id":string,"score":0-100,"reason":string,"pros":[string],"gaps":[string]}]}
- score reflects real fit of the candidate's actual skills, seniority and domain to the job.
- reason: one sentence. pros/gaps: at most 3 short items each, grounded in the candidate profile and job text.`

function brief(p: Profile): string {
  return JSON.stringify({
    headline: p.headline, years: p.totalYears, location: p.location,
    skills: p.skills.slice(0, 40).map(s => s.name),
    recent: p.experience.slice(0, 3).map(e => ({ title: e.title, company: e.company, years: e.years })),
    education: p.education.slice(0, 2).map(e => `${e.degree} ${e.field || ''}`.trim()),
  })
}

/** AI re-ranks the best heuristic candidates. Any failure leaves the heuristic scores untouched. */
export async function rankWithAI(profile: Profile, jobs: Job[], limit = 12): Promise<Job[]> {
  const top = jobs.slice(0, limit)
  if (!top.length) return jobs
  const payload = top.map(j => ({ id: j.id, title: j.title, company: j.company, location: j.location, text: truncate(j.description, 900) }))
  const reply = await callClaude({
    system: SYSTEM,
    user: `Candidate: ${brief(profile)}\n\nJobs: ${JSON.stringify(payload)}`,
    maxTokens: 3500,
  })
  const parsed = parseJsonLoose<{ results?: Array<{ id: string; score: number; reason?: string; pros?: string[]; gaps?: string[] }> }>(reply)
  const by = new Map((parsed.results || []).map(r => [r.id, r]))
  return jobs.map(j => {
    const r = by.get(j.id)
    if (!r || typeof r.score !== 'number') return j
    const blended = Math.round(Math.max(0, Math.min(100, r.score)) * 0.7 + (j.matchScore || 0) * 0.3)
    return { ...j, matchScore: blended, aiScored: true, aiReason: r.reason, aiPros: r.pros?.slice(0, 3), aiGaps: r.gaps?.slice(0, 3) }
  })
}
