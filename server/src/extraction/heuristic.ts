import type { Profile, Experience, Education, Certification, Project, Skill, ProfileLink } from '../types'
import { findSkills, canonicalSkill, isSoftSkill } from '../skills/vocabulary'
import { findRange, mergedYears, monthsBetween, round1, toIso, RANGE_SOURCE } from '../util/dates'

/* ------------------------------------------------------------------ */
/* Text normalisation                                                   */
/* ------------------------------------------------------------------ */

export function normalizeResumeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[​‌‍﻿­]/g, '')
    .replace(/ /g, ' ')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/[●▪■•◦‣⁃∙➢➤►❖]/g, '•')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/^[ \t]*page\s+\d+\s*(?:of|\/)\s*\d+[ \t]*$/gim, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/* ------------------------------------------------------------------ */
/* Section detection                                                    */
/* ------------------------------------------------------------------ */

type SectionKey =
  | 'header'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'languages'
  | 'other'

const HEADING_ALIASES: Record<Exclude<SectionKey, 'header'>, string[]> = {
  summary: [
    'summary', 'professional summary', 'profile', 'professional profile', 'about me', 'about', 'objective',
    'career objective', 'career summary', 'executive summary', 'personal statement', 'overview', 'summary of qualifications',
  ],
  experience: [
    'experience', 'work experience', 'professional experience', 'employment history', 'employment', 'work history',
    'career history', 'relevant experience', 'internships', 'internship', 'internship experience', 'trainee experience', 'training and internship', 'professional background',
    'work experience and internships', 'industry experience',
  ],
  education: [
    'education', 'academic background', 'academics', 'education and training', 'academic qualifications',
    'educational qualifications', 'qualifications', 'education and certifications', 'academic profile',
  ],
  skills: [
    'skills', 'technical skills', 'key skills', 'core skills', 'core competencies', 'competencies', 'technologies',
    'tech stack', 'skills and tools', 'tools and technologies', 'areas of expertise', 'expertise', 'technical expertise',
    'skills and technologies', 'technical proficiencies', 'skills summary', 'professional skills', 'it skills', 'tools',
    'skills and abilities', 'programming languages',
  ],
  projects: [
    'projects', 'personal projects', 'academic projects', 'key projects', 'selected projects', 'side projects',
    'project experience', 'notable projects',
  ],
  certifications: [
    'certifications', 'certificates', 'licenses', 'licenses and certifications', 'certifications and licenses',
    'courses', 'courses and certifications', 'training', 'training and certifications', 'professional development',
    'certification', 'licenses and certificates',
  ],
  awards: ['awards', 'honors', 'honours', 'achievements', 'awards and honors', 'accomplishments', 'awards and achievements'],
  languages: ['languages', 'language skills'],
  other: [
    'interests', 'hobbies', 'references', 'volunteer experience', 'volunteering', 'publications', 'activities',
    'extracurricular', 'extracurricular activities', 'declaration', 'personal details', 'personal information',
    'contact', 'contact information', 'contact details', 'links', 'social', 'strengths',
  ],
}

const HEADING_LOOKUP = new Map<string, SectionKey>()
for (const key of Object.keys(HEADING_ALIASES) as Array<Exclude<SectionKey, 'header'>>) {
  for (const alias of HEADING_ALIASES[key]) HEADING_LOOKUP.set(alias, key)
}

function headingKey(line: string): SectionKey | null {
  let s = line.trim()
  if (!s || s.length > 48) return null
  if (/[.!?]$/.test(s)) return null
  s = s.replace(/^[•\-*\s]+/, '')
  if (/^(?:[A-Za-z]\s){3,}[A-Za-z]$/.test(s)) s = s.replace(/\s/g, '') // "S K I L L S"
  s = s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return HEADING_LOOKUP.get(s) ?? null
}

/** ALL-CAPS short line that is not a known heading (e.g. "HOBBIES & INTERESTS") still ends the previous section. */
function isUnknownHeading(line: string): boolean {
  const t = line.trim()
  if (!/^[A-Z][A-Z &/\-]{3,27}$/.test(t)) return false
  const words = t.split(/\s+/)
  if (words.length >= 2) return true
  return t.length >= 9 && !canonicalSkill(t)
}

function splitSections(lines: string[]): Record<SectionKey, string[]> {
  const sections: Record<SectionKey, string[]> = {
    header: [], summary: [], experience: [], education: [], skills: [],
    projects: [], certifications: [], awards: [], languages: [], other: [],
  }
  let current: SectionKey = 'header'
  for (const line of lines) {
    const key = headingKey(line)
    if (key) {
      current = key
      continue
    }
    if (current !== 'header' && isUnknownHeading(line)) {
      current = 'other'
      continue
    }
    sections[current].push(line)
  }
  return sections
}

/* ------------------------------------------------------------------ */
/* Contact details                                                      */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}/
const URL_RE = /(?:https?:\/\/|www\.)[^\s,;|)>\]]+|(?:linkedin\.com\/(?:in|pub)\/|github\.com\/|gitlab\.com\/|behance\.net\/|dribbble\.com\/|medium\.com\/@|kaggle\.com\/|leetcode\.com\/|stackoverflow\.com\/users\/)[^\s,;|)>\]]+/gi

function extractEmail(text: string): string | undefined {
  const m = text.match(EMAIL_RE)
  return m ? m[0].replace(/[.,;]+$/, '').toLowerCase() : undefined
}

function extractPhone(text: string): string | undefined {
  const candidates = text.match(/(?:\+\s?\d{1,3}[\s.\-]?)?\(?\d{2,5}\)?[\s.\-]?\d{3,5}[\s.\-]?\d{3,6}/g) || []
  for (const raw of candidates) {
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 14) continue
    // skip date ranges like "2019 - 2021" or "01/2019 - 03/2021"
    if (/(?:19|20)\d{2}\s*[-–/]\s*(?:19|20)?\d{2}/.test(raw) && digits.length <= 12 && !/^\s*\+/.test(raw)) continue
    if (/^(?:19|20)\d{2}(?:19|20)\d{2}$/.test(digits)) continue
    return raw.replace(/\s+/g, ' ').trim()
  }
  return undefined
}

function extractLinks(text: string): ProfileLink[] {
  const links: ProfileLink[] = []
  const seen = new Set<string>()
  const matches = text.match(URL_RE) || []
  for (const raw of matches) {
    let url = raw.replace(/[.,;:)]+$/, '')
    if (EMAIL_RE.test(url)) continue
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    const key = url.toLowerCase().replace(/\/$/, '')
    if (seen.has(key)) continue
    seen.add(key)
    let label = 'Website'
    if (/linkedin\.com/i.test(url)) label = 'LinkedIn'
    else if (/github\.com/i.test(url)) label = 'GitHub'
    else if (/gitlab\.com/i.test(url)) label = 'GitLab'
    else if (/behance\.net/i.test(url)) label = 'Behance'
    else if (/dribbble\.com/i.test(url)) label = 'Dribbble'
    else if (/kaggle\.com/i.test(url)) label = 'Kaggle'
    else if (/leetcode\.com/i.test(url)) label = 'LeetCode'
    else if (/medium\.com/i.test(url)) label = 'Medium'
    links.push({ label, url })
  }
  return links.slice(0, 8)
}

const NOT_A_NAME =
  /\b(engineer|developer|manager|analyst|designer|architect|consultant|specialist|administrator|director|officer|scientist|researcher|intern|lead|head|programmer|coordinator|executive|associate|assistant|technician|strategist|accountant|teacher|professor|writer|editor|recruiter|representative|supervisor|founder|president|tester|devops|resume|curriculum|vitae|cv|portfolio|profile|summary|objective|contact|skills|experience|education|projects|address|email|phone|mobile|linkedin|github|information|details|page|university|college|institute|school|street|road|avenue|india|usa|remote)\b/i

function looksLikeName(s: string): boolean {
  const t = s.trim().replace(/^name\s*[:\-]\s*/i, '')
  if (t.length < 3 || t.length > 40) return false
  if (/[0-9@/\\:;_=+<>{}[\]|•]/.test(t)) return false
  if (NOT_A_NAME.test(t)) return false
  if (canonicalSkill(t) || findSkills(t, { includeSoft: true }).length > 0) return false
  const words = t.split(/\s+/)
  if (words.length < 2 || words.length > 4) return false
  return words.every(w => /^(?:\p{Lu}[\p{L}'.\-]*|\p{Lu}+|(?:de|da|van|von|bin|binti|al|el|la|le|di|du|dos|ibn|mc|mac))$/u.test(w))
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-'])(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase())
}

function extractName(lines: string[]): string | undefined {
  const scan = (limit: number): string | undefined => {
    for (const line of lines.slice(0, limit)) {
      const segments = line.split(/\s{3,}|\s*[|•·]\s*|\s+[–—]\s+|\t+/)
      for (const seg of segments) {
        const labeled = seg.match(/^name\s*[:\-]\s*(.+)$/i)
        const candidate = (labeled ? labeled[1] : seg).trim()
        if (looksLikeName(candidate)) {
          return candidate === candidate.toUpperCase() ? toTitleCase(candidate) : candidate
        }
      }
    }
    return undefined
  }
  return scan(10) || scan(40)
}

const LOCATION_RE = /^\p{Lu}[\p{L}.'\- ]+,\s*\p{Lu}[\p{L}.'\- ]+(?:,\s*\p{Lu}[\p{L}.'\- ]+)?$/u

function cleanLocationCandidate(s: string): string {
  return s
    .replace(/^(?:location|address|city|based in|current location)\s*[:\-]\s*/i, '')
    .replace(/[\s,\-]*\b\d{4,6}(?:-\d{4})?\s*$/, '')
    .replace(/[,\s]+$/, '')
    .trim()
}

function isLocationLike(s: string): boolean {
  const t = cleanLocationCandidate(s)
  if (!t || t.length > 60 || /[0-9@]/.test(t)) return false
  if (/^(remote|hybrid|on-?site)$/i.test(t)) return false
  if (NOT_A_NAME.test(t) && !/\b(india|usa|remote)\b/i.test(t)) return false
  return LOCATION_RE.test(t)
}

function extractLocation(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 15)) {
    const labeled = line.match(/(?:location|address|based in)\s*[:\-]\s*(.+)$/i)
    if (labeled) {
      const t = cleanLocationCandidate(labeled[1].split(/\s{3,}|\s*[|•·]\s*/)[0])
      if (t) return t
    }
    for (const seg of line.split(/\s{2,}|\s*[|•·]\s*|\s+[–—]\s+|\t+/)) {
      if (EMAIL_RE.test(seg) || /\d{5,}/.test(seg.replace(/\D/g, '')) && /^[+\d(]/.test(seg.trim())) continue
      if (isLocationLike(seg)) return cleanLocationCandidate(seg)
    }
  }
  return undefined
}

/* ------------------------------------------------------------------ */
/* Experience                                                           */
/* ------------------------------------------------------------------ */

const JOB_TITLE_RE =
  /\b(engineer|engineering|developer|programmer|manager|analyst|designer|architect|consultant|specialist|administrator|director|officer|scientist|researcher|intern|internship|trainee|lead|head|coordinator|executive|associate|assistant|technician|strategist|accountant|teacher|lecturer|professor|writer|editor|recruiter|representative|supervisor|founder|co-founder|owner|president|vp|cto|ceo|cfo|coo|tester|sdet|devops|sre|freelancer|freelance|apprentice|fellow|advisor|adviser|planner|buyer|auditor|paralegal|nurse|technologist|operator|clerk|agent|partner|principal|manager|evangelist|owner)\b/i

const COMPANY_RE =
  /\b(inc|llc|ltd|limited|corp|corporation|co|company|technologies|technology|solutions|systems|labs|software|group|pvt|private|gmbh|plc|ag|services|consulting|studio|studios|bank|agency|partners|ventures|networks|digital|infotech|infosystems|global|industries|enterprises|university|institute)\b\.?/i

const EMPLOYMENT_TAG_RE = /^(full[- ]?time|part[- ]?time|contract|contractor|internship|freelance|permanent|temporary)$/i
const BULLET_RE = /^\s*(?:[•\-*▪◦‣›»>]|\d{1,2}[.)])\s+/
const SMALL_WORDS = new Set(['and', 'of', 'at', 'for', 'the', 'in', 'to', 'a', 'an', '&', 'on', 'with', 'de', 'la', 'von'])

function isBullet(line: string): boolean {
  return BULLET_RE.test(line)
}

function stripBullet(line: string): string {
  return line.replace(BULLET_RE, '').trim()
}

/** Does this line look like a title / company header rather than a sentence from a bullet list? */
function qualifiesAsHeader(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > 90) return false
  if (isBullet(t) || headingKey(t)) return false
  if (new RegExp(RANGE_SOURCE, 'i').test(t)) return false
  if (EMAIL_RE.test(t) || /^https?:/i.test(t)) return false
  if (/[;]$/.test(t) || (/[.,]$/.test(t) && !/\b(inc|ltd|llc|corp|co|pvt|sr|jr)\.$/i.test(t))) return false
  const words = t.split(/\s+/)
  if (words.length > 11) return false
  if (/^\p{Ll}/u.test(t)) return false
  const significant = words.filter(w => w.length > 2 && !SMALL_WORDS.has(w.toLowerCase()))
  if (significant.length === 0) return true
  const capitalised = significant.filter(w => /^[\p{Lu}0-9(@]/u.test(w)).length
  return capitalised / significant.length >= 0.6
}

function splitSegments(s: string): string[] {
  let parts = s.split(/\s*\|\s*|\s*[•·]\s*|\s+[–—‒-]\s+|\s{3,}|\t+|\s+@\s+|\s+at\s+/i)
  parts = parts.map(p => p.trim().replace(/^[,\-–—|]+|[,\-–—|]+$/g, '').trim()).filter(Boolean)
  // "Stripe Inc., Austin, TX" -> company + location
  parts = parts.flatMap(p => {
    const i = p.indexOf(',')
    if (i === -1 || JOB_TITLE_RE.test(p)) return [p]
    const head = p.slice(0, i).trim()
    const tail = p.slice(i + 1).trim()
    if (COMPANY_RE.test(head) && isLocationLike(tail)) return [head, tail]
    if (!isLocationLike(head) && isLocationLike(tail) && /\p{Lu}/u.test(head) && head.split(/\s+/).length <= 5 && !isLocationLike(p)) return [head, tail]
    return [p]
  })
  if (parts.length === 1) {
    const commaParts = parts[0].split(/,\s+/)
    if (commaParts.length === 2 && JOB_TITLE_RE.test(commaParts[0]) && !isLocationLike(parts[0])) {
      return commaParts
    }
  }
  return parts
}

function pickTitleCompany(segments: string[]): { title: string; company: string; location?: string } {
  let location: string | undefined
  const usable: string[] = []
  for (const seg of segments) {
    if (EMPLOYMENT_TAG_RE.test(seg)) continue
    if (/^(remote|hybrid|on-?site)$/i.test(seg)) {
      location = location || seg
      continue
    }
    if (!JOB_TITLE_RE.test(seg) && !COMPANY_RE.test(seg) && isLocationLike(seg)) {
      location = location || seg
      continue
    }
    usable.push(seg)
  }

  let titleIdx = usable.findIndex(s => JOB_TITLE_RE.test(s) && !(COMPANY_RE.test(s) && !/\b(engineer|developer|manager|analyst|designer|architect|consultant|intern|lead|director)\b/i.test(s)))
  if (titleIdx === -1) titleIdx = usable.findIndex(s => JOB_TITLE_RE.test(s))

  let companyIdx = -1
  if (titleIdx !== -1) {
    companyIdx = usable.findIndex((s, i) => i !== titleIdx && COMPANY_RE.test(s))
    if (companyIdx === -1) companyIdx = usable.findIndex((_s, i) => i !== titleIdx)
  } else if (usable.length >= 2) {
    companyIdx = usable.findIndex(s => COMPANY_RE.test(s))
    if (companyIdx === -1) companyIdx = 0
    titleIdx = usable.findIndex((_s, i) => i !== companyIdx)
  } else if (usable.length === 1) {
    titleIdx = 0
  }

  return {
    title: titleIdx >= 0 ? usable[titleIdx] : '',
    company: companyIdx >= 0 ? usable[companyIdx] : '',
    location,
  }
}

function buildBullets(lines: string[]): string[] {
  const bullets: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (isBullet(line)) {
      bullets.push(stripBullet(line))
    } else if (bullets.length > 0 && (/^\p{Ll}/u.test(line) || !/[.!?:;]$/.test(bullets[bullets.length - 1]))) {
      bullets[bullets.length - 1] += ' ' + line
    } else {
      bullets.push(line)
    }
  }
  return bullets.map(b => b.replace(/\s+/g, ' ').trim()).filter(b => b.length > 1)
}

interface Anchor {
  idx: number
  range: NonNullable<ReturnType<typeof findRange>>
  rest: string
  pre: string[]
  preStart: number
  post: string[]
}

function parseExperience(lines: string[], allowUndated: boolean): { entries: Experience[]; ranges: Array<{ start: import('../util/dates').YearMonth; end: import('../util/dates').YearMonth }> } {
  const anchorIdx: number[] = []
  const anchorRange = new Map<number, NonNullable<ReturnType<typeof findRange>>>()

  lines.forEach((line, i) => {
    if (!line.trim() || isBullet(line) || line.length > 160) return
    const range = findRange(line)
    if (!range) return
    // A real entry header has little besides the date; long prose lines containing dates are not headers.
    const rest = line.replace(range.matched, ' ').trim()
    if (rest.split(/\s+/).length > 14) return
    anchorIdx.push(i)
    anchorRange.set(i, range)
  })

  if (anchorIdx.length === 0) return { entries: allowUndated ? parseUndatedExperience(lines) : [], ranges: [] }

  const anchors: Anchor[] = anchorIdx.map((idx, k) => {
    const range = anchorRange.get(idx)!
    const rest = lines[idx].replace(range.matched, ' ').replace(/[()\[\]]/g, ' ').replace(/\s+/g, ' ').trim()
    const prevAnchor = k > 0 ? anchorIdx[k - 1] : -1

    const pre: string[] = []
    let preStart = idx
    let j = idx - 1
    let skippedBlank = false
    while (j > prevAnchor && pre.length < 2) {
      const l = lines[j]
      if (!l.trim()) {
        if (pre.length === 0 && !skippedBlank) {
          skippedBlank = true
          j--
          continue
        }
        break
      }
      if (!qualifiesAsHeader(l)) break
      pre.unshift(l.trim())
      preStart = j
      j--
    }
    if (pre.length === 0) preStart = idx
    return { idx, range, rest, pre, preStart, post: [] }
  })

  const entries: Experience[] = []
  const ranges: Array<{ start: import('../util/dates').YearMonth; end: import('../util/dates').YearMonth }> = []

  anchors.forEach((a, k) => {
    const nextPreStart = k + 1 < anchors.length ? anchors[k + 1].preStart : lines.length
    let segs = [...a.pre.flatMap(splitSegments), ...splitSegments(a.rest)]
    let picked = pickTitleCompany(segs)
    let descStart = a.idx + 1

    // Header split across lines *after* the date line ("Jan 2020 - Present" / "Senior Engineer" / "Acme")
    if (!picked.title || !picked.company) {
      const post: string[] = []
      let p = a.idx + 1
      while (p < nextPreStart && post.length < 2) {
        const l = lines[p]
        if (!l || !l.trim() || !qualifiesAsHeader(l)) break
        post.push(l.trim())
        p++
      }
      if (post.length) {
        const retry = pickTitleCompany([...segs, ...post.flatMap(splitSegments)])
        if ((retry.title && retry.company) || (!picked.title && !picked.company)) {
          picked = retry
          segs = [...segs, ...post]
          descStart = a.idx + 1 + post.length
        }
      }
    }

    const body = lines.slice(descStart, nextPreStart)
    const bullets = buildBullets(body)
    const years = round1(monthsBetween(a.range.start, a.range.end) / 12)
    const text = [picked.title, ...bullets].join(' ')
    const skills = findSkills(text).map(h => h.name).slice(0, 25)

    if (!picked.title && !picked.company && bullets.length === 0) return

    ranges.push({ start: a.range.start, end: a.range.end })
    entries.push({
      title: picked.title,
      company: picked.company,
      location: picked.location,
      startDate: toIso(a.range.start),
      endDate: a.range.current ? undefined : toIso(a.range.end),
      current: a.range.current || undefined,
      years,
      description: bullets.join('\n') || undefined,
      bullets: bullets.length ? bullets : undefined,
      skills: skills.length ? skills : undefined,
    })
  })

  return { entries, ranges }
}

function parseUndatedExperience(lines: string[]): Experience[] {
  const groups: string[][] = []
  let current: string[] = []
  for (const l of lines) {
    if (!l.trim()) {
      if (current.length) groups.push(current)
      current = []
    } else {
      current.push(l)
    }
  }
  if (current.length) groups.push(current)

  const entries: Experience[] = []
  for (const g of groups) {
    const header = g[0]
    if (!qualifiesAsHeader(header) || !(JOB_TITLE_RE.test(header) || g.length > 1)) continue
    const picked = pickTitleCompany(splitSegments(header))
    if (!picked.title && !picked.company) continue
    const bullets = buildBullets(g.slice(1))
    entries.push({
      title: picked.title,
      company: picked.company,
      location: picked.location,
      years: 0,
      description: bullets.join('\n') || undefined,
      bullets: bullets.length ? bullets : undefined,
      skills: findSkills([picked.title, ...bullets].join(' ')).map(h => h.name).slice(0, 25),
    })
  }
  return entries.slice(0, 12)
}

/* ------------------------------------------------------------------ */
/* Education                                                            */
/* ------------------------------------------------------------------ */

const DEGREE_LONG =
  /\b(bachelor(?:'s)?(?:\s+of\s+(?!in\b)[A-Za-z&]+(?:\s+(?!in\b)[A-Za-z&]+)?)?|master(?:'s)?(?:\s+of\s+(?!in\b)[A-Za-z&]+(?:\s+(?!in\b)[A-Za-z&]+)?)?|doctorate|doctor of philosophy|diploma|associate(?:'s)?\s+degree|post[- ]?graduate(?:\s+diploma)?|undergraduate|higher secondary|senior secondary|secondary school|high school|class\s?(?:x|xii|10|12)|intermediate)\b/i
const DEGREE_SHORT =
  /(?<![A-Za-z0-9])(B\.?\s?Tech|M\.?\s?Tech|B\.?E\.?|M\.?E\.?|B\.?Sc?\.?|M\.?Sc?\.?|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|B\.?Com\.?|M\.?Com\.?|BCA|MCA|BBA|MBA|Ph\.?\s?D\.?|PGDM|LL\.?B\.?|LL\.?M\.?|MBBS|BDS|B\.?Arch|M\.?Arch|B\.?Des|M\.?Des|HSC|SSC)(?![A-Za-z0-9])/
const INSTITUTION_RE =
  /\b(university|college|institute|institution|school|academy|polytechnic|iit|nit|iiit|bits|vit|mit|universit[àáéä]t?|universidad|hochschule|campus)\b/i
const FIELD_HINT_RE =
  /\b(computer|engineering|science|sciences|management|business|economics|arts|commerce|mathematics|maths|physics|chemistry|biology|information|technology|design|finance|marketing|accounting|law|medicine|statistics|electronics|electrical|mechanical|civil|data|software|psychology|history|english|literature|administration|architecture|networking|cyber|artificial|robotics|analytics)\b/i
const YEAR_OR_SCORE_RE = /^\(?(?:(?:19|20)\d{2}(?:\s*[-–/]\s*(?:19|20)?\d{2,4})?|\d+(?:\.\d+)?\s*(?:%|\/\s*\d+(?:\.\d+)?|cgpa|gpa)?|(?:c?gpa|cgpa|percentage|score|grade)\b.*|expected.*|present|ongoing)\)?$/i

function findDegree(line: string): { index: number; text: string } | null {
  const long = DEGREE_LONG.exec(line)
  const short = DEGREE_SHORT.exec(line)
  const m = long && short ? (long.index <= short.index ? long : short) : long || short
  return m ? { index: m.index, text: m[0] } : null
}

function parseEducation(lines: string[], strict: boolean): Education[] {
  const degreeLines: number[] = []
  lines.forEach((l, i) => {
    if (!l.trim() || (l.length > 160 && !isBullet(l))) return
    if (!findDegree(l)) return
    if (strict && !DEGREE_LONG.test(l) && !/(?:B\.?Tech|M\.?Tech|MBA|Ph\.?D|BCA|MCA|BBA)/.test(l)) return
    degreeLines.push(i)
  })

  const claimed = new Set<number>(degreeLines)
  const results: Education[] = []

  for (const d of degreeLines) {
    // "(Computer Science)" -> ", Computer Science ," so it becomes its own part; drop (2018) / (7.8 CGPA)
    const prepared = stripBullet(lines[d])
      .replace(/\(([^)]*)\)/g, (_m, inner: string) => (YEAR_OR_SCORE_RE.test(inner.trim()) ? ' ' : ` , ${inner} , `))
      .replace(/\b(?:c?gpa|percentage|score)\s*[:\-]?\s*[\d.]+(?:\s*\/\s*[\d.]+)?/gi, ' ')
    const parts = prepared
      .split(/\s*[|–—]\s*|\s+-\s+|\s{3,}|\t+|\s*,\s+|\s*,\s*$|^\s*,\s*/)
      .map(p => p.replace(/^[\s,\-–—|:]+|[\s,\-–—|:]+$/g, ''))
      .filter(Boolean)

    const degreeIdx = parts.findIndex(p => findDegree(p))
    if (degreeIdx === -1) continue
    const degreeMatch = findDegree(parts[degreeIdx])!
    let degreeText = parts[degreeIdx].slice(degreeMatch.index).trim()
    let degree = degreeText
    let field: string | undefined

    const inSplit = degreeText.match(/^(.*?)\s+\bin\b\s+(.+)$/i)
    if (inSplit) {
      degree = inSplit[1].trim()
      field = inSplit[2].trim()
    } else if (DEGREE_SHORT.test(degreeText) && degreeText.toLowerCase().startsWith(degreeMatch.text.toLowerCase())) {
      const rest = degreeText.slice(degreeMatch.text.length).replace(/^\s*(?:of|in)\s+/i, '').trim()
      if (rest && /^[A-Za-z&/ ]{3,50}$/.test(rest)) {
        degree = degreeMatch.text.trim()
        field = rest
      }
    }
    degree = degree.replace(/[,\-–—:|(\s]+$/, '').trim()
    if (field) field = field.replace(/[,\-–—:|(\s]+$/, '').trim()

    // the remaining parts: field, institution, year/score
    const others = parts.filter((_p, i) => i !== degreeIdx)
    let institution = ''

    const instIdx = others.findIndex(p => INSTITUTION_RE.test(p))
    if (instIdx !== -1) {
      const chunk = [others[instIdx]]
      for (let k = instIdx + 1; k < others.length && chunk.length < 3; k++) {
        const p = others[k]
        if (YEAR_OR_SCORE_RE.test(p) || /\d/.test(p) || p.length > 28 || FIELD_HINT_RE.test(p) || findDegree(p)) break
        if (!/^\p{Lu}/u.test(p)) break
        chunk.push(p)
      }
      institution = chunk.join(', ')
    }

    if (!field) {
      const f = others.find(p => !INSTITUTION_RE.test(p) && FIELD_HINT_RE.test(p) && !YEAR_OR_SCORE_RE.test(p) && p.length <= 50)
      if (f) field = f
    }

    if (!institution) {
      const guess = others.find(
        p => p !== field && !YEAR_OR_SCORE_RE.test(p) && !FIELD_HINT_RE.test(p) && !findDegree(p) && /[A-Za-z]{3,}/.test(p) && p.length <= 60 && /^\p{Lu}/u.test(p),
      )
      if (guess) institution = guess
    }

    if (!institution) {
      for (const delta of [-1, 1, -2, 2]) {
        const n = d + delta
        if (n < 0 || n >= lines.length || claimed.has(n)) continue
        const cand = lines[n].trim()
        if (!cand || isBullet(cand) || cand.length > 90 || !INSTITUTION_RE.test(cand)) continue
        institution = cand
          .split(/\s*[|–—]\s*|\s{3,}/)[0]
          .replace(/\(.*?\)/g, '')
          .replace(/\b(?:19|20)\d{2}\b.*$/, '')
          .replace(/[,\-–—\s]+$/, '')
          .trim()
        claimed.add(n)
        break
      }
    }

    let year: number | undefined
    for (const delta of [0, 1, -1, 2, -2]) {
      const n = d + delta
      if (n < 0 || n >= lines.length) continue
      if (delta !== 0 && degreeLines.includes(n)) continue
      const years = (lines[n].match(/\b(?:19[6-9]\d|20[0-4]\d)\b/g) || []).map(Number)
      if (years.length) {
        year = Math.max(...years)
        break
      }
    }

    if (!degree) continue
    results.push({ degree, institution, field, graduationYear: year })
  }

  const seen = new Set<string>()
  return results
    .filter(e => {
      const key = `${e.degree}|${e.institution}`.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)
}

/* ------------------------------------------------------------------ */
/* Skills                                                               */
/* ------------------------------------------------------------------ */

const SKILL_PREFIX_RE = /^(?:proficient in|familiar with|knowledge of|experience (?:in|with)|working knowledge of|hands-on (?:experience )?(?:in|with)|basic|advanced|intermediate|expert in|strong)\s+/i
const SKILL_NOISE_RE = /^(?:and|or|etc\.?|others?|more|\.{3}|n\/a|none)$/i

function parseSkillsSection(lines: string[]): string[] {
  const tokens: string[] = []
  for (const raw of lines) {
    let line = stripBullet(raw).replace(/[●○★☆▪■□◆◇]+/g, ' ')
    line = line.replace(/\(([^)]*)\)/g, ', $1, ')
    const labeled = line.match(/^([A-Za-z][A-Za-z &/+.\-]{1,40}):\s*(.+)$/)
    if (labeled) line = labeled[2]
    for (let t of line.split(/[,;|•·]|\s{2,}|\s+\/\s+|\t+/)) {
      t = t.trim().replace(SKILL_PREFIX_RE, '').replace(/[.:]+$/, '').trim()
      if (!t || t.length > 40 || SKILL_NOISE_RE.test(t)) continue
      if (/^\d+$/.test(t) || t.split(/\s+/).length > 5) continue
      tokens.push(t)
    }
  }
  return tokens
}

function buildSkills(
  fullText: string,
  sectionTokens: string[],
  experience: Experience[],
): Skill[] {
  const order: string[] = []
  const display = new Map<string, string>()
  const add = (name: string) => {
    const key = name.toLowerCase()
    if (!display.has(key)) {
      display.set(key, name)
      order.push(key)
    }
  }

  // 1. what the candidate explicitly listed
  for (const tok of sectionTokens) {
    add(canonicalSkill(tok) || tok)
  }
  // 2. vocabulary skills mentioned anywhere (experience, projects, summary)
  for (const hit of findSkills(fullText)) add(hit.name)

  const experienceText = experience.map(e => [e.title, e.description || ''].join(' ')).join('\n')
  const expHits = new Map(findSkills(experienceText, { includeSoft: true }).map(h => [h.name.toLowerCase(), h.count]))

  const skills: Skill[] = order.slice(0, 70).map(key => {
    const name = display.get(key)!
    // years of experience in entries that mention this skill
    let years = 0
    for (const e of experience) {
      const body = [e.title, e.description || ''].join(' ').toLowerCase()
      const known = canonicalSkill(name) !== null
      const mentioned = (e.skills || []).some(s => s.toLowerCase() === key) || (!known && body.includes(key))
      if (e.years > 0 && mentioned) years += e.years
    }
    years = round1(Math.min(years, 40))
    const mentions = expHits.get(key) || 0
    let proficiency: Skill['proficiency']
    if (years >= 5) proficiency = 'expert'
    else if (years >= 2.5 || mentions >= 4) proficiency = 'advanced'
    else if (years >= 1 || mentions >= 1) proficiency = 'intermediate'
    return { name, proficiency, years: years > 0 ? years : undefined }
  })

  // hard skills first, soft skills last
  return skills.sort((a, b) => Number(isSoftSkill(a.name)) - Number(isSoftSkill(b.name)))
}

/* ------------------------------------------------------------------ */
/* Certifications, projects, languages                                  */
/* ------------------------------------------------------------------ */

const KNOWN_CERT_RE =
  /\b(AWS Certified [A-Za-z\- ]{3,50}|Microsoft Certified[: ]+[A-Za-z0-9\- ]{3,50}|Google (?:Cloud )?(?:Professional |Associate )?[A-Za-z ]{3,30} Certif\w+|Certified [A-Z][A-Za-z\- ]{3,45}|Oracle Certified [A-Za-z\- ]{3,40}|CompTIA [A-Za-z+\- ]{3,20}|Cisco Certified [A-Za-z\- ]{3,30}|PMP|CISSP|CCNA|CCNP|CKAD?|CKS|PSM ?I{1,3}|CSM|CSPO|ITIL(?: Foundation)?|Six Sigma [A-Za-z ]{3,15})/g

function parseCertifications(lines: string[], fullText: string): Certification[] {
  const certs: Certification[] = []
  const seen = new Set<string>()
  const push = (c: Certification) => {
    const key = c.name.toLowerCase()
    if (!c.name || seen.has(key) || c.name.length > 120) return
    seen.add(key)
    certs.push(c)
  }

  for (const raw of lines) {
    const line = stripBullet(raw)
    if (!line || line.length < 3 || /^(?:19|20)\d{2}$/.test(line)) continue
    const yearMatch = line.match(/\b((?:19|20)\d{2})\b/)
    const cleaned = line.replace(/[(\[]?\b(?:19|20)\d{2}\b[)\]]?/g, '').replace(/[\s,\-–—|:]+$/, '').trim()
    const parts = cleaned.split(/\s+[–—|]\s+|\s+-\s+|,\s+(?=\p{Lu})/u).map(p => p.trim()).filter(Boolean)
    const name = parts[0] || cleaned
    const issuer = parts[1]
    if (name.length < 3) continue
    push({ name, issuer, date: yearMatch ? yearMatch[1] : undefined })
  }

  if (certs.length === 0) {
    for (const m of fullText.matchAll(KNOWN_CERT_RE)) push({ name: m[0].trim() })
  }
  return certs.slice(0, 15)
}

function parseProjects(lines: string[]): Project[] {
  const projects: Project[] = []
  let current: { name: string; body: string[] } | null = null
  const flush = () => {
    if (!current) return
    const bullets = buildBullets(current.body)
    projects.push({
      name: current.name,
      description: bullets.join('\n') || undefined,
      skills: findSkills([current.name, ...bullets].join(' ')).map(h => h.name).slice(0, 15),
    })
    current = null
  }
  for (const raw of lines) {
    if (!raw.trim()) continue
    if (!isBullet(raw) && qualifiesAsHeader(raw) && raw.length <= 90) {
      flush()
      current = { name: splitSegments(raw)[0] || raw.trim(), body: [] }
    } else if (current) {
      current.body.push(raw)
    }
  }
  flush()
  return projects.filter(p => p.name.length > 1).slice(0, 8)
}

function parseLanguages(lines: string[]): string[] {
  const out: string[] = []
  for (const raw of lines) {
    for (const tok of stripBullet(raw).split(/[,;|•·]|\s{2,}/)) {
      const t = tok.replace(/\(.*?\)/g, '').replace(/[-–:].*$/, '').trim()
      if (t && t.length <= 25 && /^\p{Lu}/u.test(t)) out.push(t)
    }
  }
  return Array.from(new Set(out)).slice(0, 8)
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

export function extractProfileHeuristic(rawText: string): Profile {
  const text = normalizeResumeText(rawText)
  const lines = text.split('\n')
  const sections = splitSections(lines)
  const headerLines = sections.header.length ? sections.header : lines.slice(0, 15)
  const contactBlock = lines.slice(0, 40).join('\n')

  const email = extractEmail(contactBlock) || extractEmail(text)
  const phone = extractPhone(contactBlock) || extractPhone(sections.other.join('\n'))
  const links = extractLinks(text)
  const name = extractName(lines)
  const location = extractLocation(headerLines.length ? headerLines : lines)

  // Experience: prefer the labelled section, otherwise search the non-education/skills body.
  let experienceLines = sections.experience
  if (experienceLines.length === 0) {
    experienceLines = lines.filter(
      l => !sections.education.includes(l) && !sections.skills.includes(l) && !sections.certifications.includes(l),
    )
  }
  const { entries: experience, ranges } = parseExperience(experienceLines, sections.experience.length > 0)
  const totalYears = ranges.length ? mergedYears(ranges) : undefined

  // Education: labelled section, else strict scan of the whole text.
  const education = sections.education.length
    ? parseEducation(sections.education, false)
    : parseEducation(lines, true)

  const sectionSkillTokens = parseSkillsSection(sections.skills)
  const skills = buildSkills(text, sectionSkillTokens, experience)

  const certifications = parseCertifications(sections.certifications, text)
  const projects = parseProjects(sections.projects)
  const languages = parseLanguages(sections.languages)

  const summaryText = sections.summary.join(' ').replace(/\s+/g, ' ').trim()
  const summary = summaryText ? summaryText.slice(0, 900) : undefined

  // headline: a title-like line right under the name, otherwise the latest job title
  let headline: string | undefined
  const nameIdx = name ? lines.findIndex(l => l.includes(name) || l.toLowerCase().includes(name.toLowerCase())) : -1
  if (nameIdx >= 0) {
    for (const l of lines.slice(nameIdx, nameIdx + 4)) {
      for (const seg of l.split(/\s{3,}|\s*[|•·]\s*/)) {
        const t = seg.replace(name || '', '').trim()
        if (t && t.length <= 70 && JOB_TITLE_RE.test(t) && !EMAIL_RE.test(t) && !headingKey(t)) {
          headline = t
          break
        }
      }
      if (headline) break
    }
  }
  if (!headline && experience.length) headline = experience[0].title || undefined

  const warnings: string[] = []
  if (text.length < 250) warnings.push('Very little text could be read from this file. It may be a scanned image. Try a text-based PDF or DOCX.')
  if (!name) warnings.push("Couldn't confidently detect your name.")
  if (!email) warnings.push("Couldn't find an email address.")
  if (!phone) warnings.push("Couldn't find a phone number.")
  if (experience.length === 0) warnings.push("Couldn't detect any work experience entries.")
  else if (ranges.length === 0) warnings.push('Experience was found but without dates, so total years of experience is unknown.')
  if (education.length === 0) warnings.push("Couldn't detect an education entry.")
  if (skills.length === 0) warnings.push("Couldn't detect any skills.")

  return {
    name,
    email,
    phone,
    location,
    headline,
    summary,
    links: links.length ? links : undefined,
    totalYears,
    skills,
    experience,
    education,
    certifications,
    projects: projects.length ? projects : undefined,
    languages: languages.length ? languages : undefined,
    extractionMethod: 'heuristic',
    extractionWarnings: warnings,
  }
}
