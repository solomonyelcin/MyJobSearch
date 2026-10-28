import type { Job, SearchFilters } from '../../types'
import { htmlToText, truncate } from '../../util/html'
import { cached } from '../../util/cache'
import { getJson } from './http'

/**
 * Free, public job-board APIs that allow programmatic access (no scraping, no keys).
 * Response shapes are parsed defensively: a field missing from a board never breaks the others.
 */
const TTL = 15 * 60 * 1000
const s = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v))
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(s).filter(Boolean) : [])
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : parseFloat(s(v))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function reqLines(desc: string): string[] {
  return desc.split('\n').map(l => l.replace(/^•\s*/, '').trim()).filter(l => l.length > 15 && l.length < 220).slice(0, 8)
}

function level(text: string): Job['experienceLevel'] | undefined {
  const t = text.toLowerCase()
  if (/\b(senior|sr\.?|lead|principal|staff|head of|director)\b/.test(t)) return 'senior'
  if (/\b(junior|jr\.?|entry|intern|graduate|trainee|associate)\b/.test(t)) return 'entry'
  return undefined
}

export async function fetchRemotive(query: string): Promise<Job[]> {
  const data = await cached(`remotive:${query}`, TTL, () =>
    getJson<{ jobs?: Array<Record<string, unknown>> }>(`https://remotive.com/api/remote-jobs?limit=40&search=${encodeURIComponent(query)}`),
  )
  return (data.jobs || []).map(j => {
    const description = truncate(htmlToText(s(j.description)), 6000)
    return {
      id: `remotive-${s(j.id)}`,
      title: s(j.title),
      company: s(j.company_name),
      location: s(j.candidate_required_location) || 'Remote',
      remote: true,
      salary: s(j.salary) ? { text: s(j.salary) } : undefined,
      description,
      requirements: reqLines(description),
      jobType: s(j.job_type).replace(/_/g, '-') || undefined,
      experienceLevel: level(s(j.title)),
      url: s(j.url),
      source: 'remotive' as const,
      postedDate: s(j.publication_date) || undefined,
      tags: arr(j.tags),
    }
  })
}

export async function fetchArbeitnow(query: string, f: SearchFilters): Promise<Job[]> {
  // The board has no search parameter, so we pull recent pages and filter locally.
  const pages = await cached('arbeitnow:pages', TTL, async () => {
    const out: Array<Record<string, unknown>> = []
    for (const p of [1, 2, 3]) {
      try {
        const d = await getJson<{ data?: Array<Record<string, unknown>> }>(`https://www.arbeitnow.com/api/job-board-api?page=${p}`)
        out.push(...(d.data || []))
      } catch {
        break
      }
    }
    return out
  })
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  return pages
    .map(j => {
      const description = truncate(htmlToText(s(j.description)), 6000)
      return {
        id: `arbeitnow-${s(j.slug)}`,
        title: s(j.title),
        company: s(j.company_name),
        location: s(j.location) || (j.remote ? 'Remote' : ''),
        remote: Boolean(j.remote),
        description,
        requirements: reqLines(description),
        jobType: arr(j.job_types)[0],
        experienceLevel: level(s(j.title)),
        url: s(j.url),
        source: 'arbeitnow' as const,
        postedDate: typeof j.created_at === 'number' ? new Date(j.created_at * 1000).toISOString() : undefined,
        tags: arr(j.tags),
      }
    })
    .filter(j => {
      const hay = `${j.title} ${j.tags.join(' ')} ${j.description.slice(0, 600)}`.toLowerCase()
      const hit = words.length === 0 || words.some(w => hay.includes(w))
      const loc = !f.location || /remote|anywhere/i.test(f.location) ? true : j.location.toLowerCase().includes(f.location.toLowerCase().split(',')[0])
      return hit && (loc || j.remote)
    })
}

export async function fetchRemoteOk(query: string): Promise<Job[]> {
  const all = await cached('remoteok:all', TTL, () => getJson<Array<Record<string, unknown>>>('https://remoteok.com/api'))
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  return all
    .filter(j => j && j.position && j.company)
    .map(j => {
      const description = truncate(htmlToText(s(j.description)), 6000)
      const min = num(j.salary_min)
      const max = num(j.salary_max)
      return {
        id: `remoteok-${s(j.id)}`,
        title: s(j.position),
        company: s(j.company),
        location: s(j.location) || 'Remote',
        remote: true,
        salary: min || max ? { min, max, currency: 'USD' } : undefined,
        description,
        requirements: reqLines(description),
        experienceLevel: level(s(j.position)),
        url: s(j.apply_url) || s(j.url),
        source: 'remoteok' as const,
        postedDate: s(j.date) || undefined,
        tags: arr(j.tags),
      }
    })
    .filter(j => {
      const hay = `${j.title} ${j.tags.join(' ')}`.toLowerCase()
      return words.length === 0 || words.some(w => hay.includes(w))
    })
}

export async function fetchJobicy(query: string): Promise<Job[]> {
  const data = await cached(`jobicy:${query}`, TTL, () =>
    getJson<{ jobs?: Array<Record<string, unknown>> }>(`https://jobicy.com/api/v2/remote-jobs?count=30&tag=${encodeURIComponent(query)}`),
  )
  return (data.jobs || []).map(j => {
    const description = truncate(htmlToText(s(j.jobDescription) || s(j.jobExcerpt)), 6000)
    const min = num(j.annualSalaryMin)
    const max = num(j.annualSalaryMax)
    return {
      id: `jobicy-${s(j.id)}`,
      title: s(j.jobTitle),
      company: s(j.companyName),
      location: s(j.jobGeo) || 'Remote',
      remote: true,
      salary: min || max ? { min, max, currency: s(j.salaryCurrency) || 'USD' } : undefined,
      description,
      requirements: reqLines(description),
      jobType: arr(j.jobType)[0]?.toLowerCase(),
      experienceLevel: level(`${s(j.jobTitle)} ${s(j.jobLevel)}`),
      url: s(j.url),
      source: 'jobicy' as const,
      postedDate: s(j.pubDate) || undefined,
      tags: arr(j.jobIndustry),
    }
  })
}

/** Adzuna covers on-site jobs in many countries (incl. India). Needs a free key: ADZUNA_APP_ID / ADZUNA_APP_KEY. */
export async function fetchAdzuna(query: string, f: SearchFilters): Promise<Job[]> {
  const id = process.env.ADZUNA_APP_ID
  const key = process.env.ADZUNA_APP_KEY
  if (!id || !key) return []
  const country = (f.country || process.env.ADZUNA_COUNTRY || 'in').toLowerCase()
  const where = f.location && !/remote/i.test(f.location) ? `&where=${encodeURIComponent(f.location)}` : ''
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${id}&app_key=${key}&results_per_page=30&what=${encodeURIComponent(query)}${where}&content-type=application/json`
  const data = await cached(`adzuna:${country}:${query}:${f.location || ''}`, TTL, () => getJson<{ results?: Array<Record<string, any>> }>(url))
  return (data.results || []).map(j => {
    const description = truncate(htmlToText(s(j.description)), 3000)
    return {
      id: `adzuna-${s(j.id)}`,
      title: htmlToText(s(j.title)),
      company: s(j.company?.display_name),
      location: s(j.location?.display_name),
      salary: num(j.salary_min) || num(j.salary_max) ? { min: num(j.salary_min), max: num(j.salary_max) } : undefined,
      description,
      requirements: reqLines(description),
      jobType: s(j.contract_time).replace('_', '-') || undefined,
      experienceLevel: level(s(j.title)),
      url: s(j.redirect_url),
      source: 'adzuna' as const,
      postedDate: s(j.created) || undefined,
      tags: s(j.category?.label) ? [s(j.category.label)] : [],
    }
  })
}
