import type { Profile, Experience, Education, Certification, Skill, Project } from '../types'
import { callClaude, parseJsonLoose } from './anthropic'
import { extractProfileHeuristic } from '../extraction/heuristic'
import { canonicalSkill } from '../skills/vocabulary'
import { findRange, mergedYears, monthsBetween, round1, toIso } from '../util/dates'

const SYSTEM = `You extract structured data from resumes. Return ONLY one JSON object, no prose.
Rules:
- Copy values exactly as written in the resume. NEVER invent, infer or "improve" anything. Use null when a value is absent.
- name: the candidate's personal name only (not a job title, company or skill).
- Dates as written, e.g. "Jan 2020", "2019", "Present". Do not guess missing months.
- experience: every job/internship, newest first. "bullets" are the achievement lines for that role, verbatim.
- skills: only skills/technologies/tools explicitly named in the resume.
JSON shape:
{"name":string|null,"email":string|null,"phone":string|null,"location":string|null,"headline":string|null,"summary":string|null,
"links":[{"label":string,"url":string}],
"experience":[{"title":string,"company":string,"location":string|null,"start":string|null,"end":string|null,"bullets":[string]}],
"education":[{"degree":string,"field":string|null,"institution":string,"year":number|null}],
"skills":[string],
"certifications":[{"name":string,"issuer":string|null,"year":string|null}],
"projects":[{"name":string,"description":string|null,"skills":[string]}],
"languages":[string]}`

interface AiExperience { title?: string; company?: string; location?: string | null; start?: string | null; end?: string | null; bullets?: string[] }
interface AiResume {
  name?: string | null; email?: string | null; phone?: string | null; location?: string | null
  headline?: string | null; summary?: string | null
  links?: Array<{ label?: string; url?: string }>
  experience?: AiExperience[]
  education?: Array<{ degree?: string; field?: string | null; institution?: string; year?: number | null }>
  skills?: string[]
  certifications?: Array<{ name?: string; issuer?: string | null; year?: string | null }>
  projects?: Array<{ name?: string; description?: string | null; skills?: string[] }>
  languages?: string[]
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** A value the model returned is only trusted if it is really present in the resume text. */
function appearsIn(text: string, value: string | undefined): boolean {
  if (!value) return false
  const squash = (s: string) => s.toLowerCase().replace(/[\s\-().]/g, '')
  return squash(text).includes(squash(value))
}

export async function extractProfileWithAI(resumeText: string): Promise<Profile> {
  const heuristic = extractProfileHeuristic(resumeText)
  const reply = await callClaude({
    system: SYSTEM,
    user: `Resume text:\n"""\n${resumeText.slice(0, 24000)}\n"""`,
    maxTokens: 6000,
    temperature: 0,
  })
  const ai = parseJsonLoose<AiResume>(reply)
  return mergeProfiles(ai, heuristic, resumeText)
}

export function mergeProfiles(ai: AiResume, h: Profile, text: string): Profile {
  const email = appearsIn(text, str(ai.email)) ? str(ai.email)!.toLowerCase() : h.email
  const phone = appearsIn(text, str(ai.phone)) ? str(ai.phone) : h.phone
  const name = appearsIn(text, str(ai.name)) ? str(ai.name) : h.name

  const ranges: Array<{ start: import('../util/dates').YearMonth; end: import('../util/dates').YearMonth }> = []
  const experience: Experience[] = (ai.experience || [])
    .filter(e => str(e.title) || str(e.company))
    .map(e => {
      const range = e.start ? findRange(`${e.start} - ${e.end || 'Present'}`) : null
      if (range) ranges.push({ start: range.start, end: range.end })
      const bullets = (e.bullets || []).map(b => String(b).trim()).filter(Boolean)
      return {
        title: str(e.title) || '',
        company: str(e.company) || '',
        location: str(e.location),
        startDate: range ? toIso(range.start) : str(e.start),
        endDate: range ? (range.current ? undefined : toIso(range.end)) : str(e.end),
        current: range?.current || undefined,
        years: range ? round1(monthsBetween(range.start, range.end) / 12) : 0,
        description: bullets.join('\n') || undefined,
        bullets: bullets.length ? bullets : undefined,
      }
    })

  const education: Education[] = (ai.education || [])
    .filter(e => str(e.degree) || str(e.institution))
    .map(e => ({
      degree: str(e.degree) || '',
      field: str(e.field),
      institution: str(e.institution) || '',
      graduationYear: typeof e.year === 'number' ? e.year : undefined,
    }))

  // skills: model list, kept only if the text really mentions them; heuristic skills fill the gaps
  const seen = new Set<string>()
  const skills: Skill[] = []
  const push = (s: Skill) => {
    const k = s.name.toLowerCase()
    if (!seen.has(k)) {
      seen.add(k)
      skills.push(s)
    }
  }
  const heurByName = new Map(h.skills.map(s => [s.name.toLowerCase(), s]))
  for (const raw of ai.skills || []) {
    const name = canonicalSkill(String(raw)) || str(raw)
    if (!name || !appearsIn(text, name) && !appearsIn(text, String(raw))) continue
    push(heurByName.get(name.toLowerCase()) || { name })
  }
  for (const s of h.skills) push(s)

  const certifications: Certification[] = (ai.certifications || []).filter(c => str(c.name)).map(c => ({
    name: str(c.name)!, issuer: str(c.issuer), date: str(c.year),
  }))
  const projects: Project[] = (ai.projects || []).filter(p => str(p.name)).map(p => ({
    name: str(p.name)!, description: str(p.description), skills: p.skills,
  }))

  const useAiExperience = experience.length > 0
  return {
    ...h,
    name, email, phone,
    location: str(ai.location) && appearsIn(text, str(ai.location)!.split(',')[0]) ? str(ai.location) : h.location,
    headline: str(ai.headline) || h.headline,
    summary: str(ai.summary) || h.summary,
    links: ai.links?.length ? ai.links.filter(l => str(l.url)).map(l => ({ label: str(l.label) || 'Link', url: str(l.url)! })) : h.links,
    experience: useAiExperience ? experience : h.experience,
    totalYears: useAiExperience ? (ranges.length ? mergedYears(ranges) : h.totalYears) : h.totalYears,
    education: education.length ? education : h.education,
    skills,
    certifications: certifications.length ? certifications : h.certifications,
    projects: projects.length ? projects : h.projects,
    languages: ai.languages?.length ? ai.languages.map(String) : h.languages,
    extractionMethod: 'ai',
    extractionWarnings: h.extractionWarnings,
  }
}
