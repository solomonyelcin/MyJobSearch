import type { Job } from '../../types'
import type { CompanyConfig } from '../companies'
import { htmlToText, truncate } from '../../util/html'
import { cached } from '../../util/cache'
import { getJson, postJson } from './http'

const TTL = 30 * 60 * 1000
const s = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v))

/** Greenhouse returns HTML that is itself entity-escaped. */
function unescapeHtml(v: string): string {
  return v.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
}

function reqLines(desc: string): string[] {
  return desc.split('\n').map(l => l.replace(/^•\s*/, '').trim()).filter(l => l.length > 15 && l.length < 220).slice(0, 8)
}

function level(text: string): Job['experienceLevel'] | undefined {
  const t = text.toLowerCase()
  if (/\b(senior|sr\.?|lead|principal|staff|head of|director|architect)\b/.test(t)) return 'senior'
  if (/\b(junior|jr\.?|entry|intern|graduate|trainee|associate)\b/.test(t)) return 'entry'
  return undefined
}

function base(c: CompanyConfig, id: string, title: string, location: string, url: string, description: string, posted?: string): Job {
  const desc = truncate(description, 6000)
  return {
    id: `${c.ats}-${c.slug}-${id}`,
    title,
    company: c.name,
    location,
    remote: /\bremote\b/i.test(location),
    description: desc,
    requirements: reqLines(desc),
    experienceLevel: level(title),
    url,
    source: 'company',
    postedDate: posted,
  }
}

/** Detail pages fetched later, only for the best matches (Workday lists carry no description). */
const DETAIL_URLS = new Map<string, string>()

/* ---------------------------------- adapters ---------------------------------- */

async function greenhouse(c: CompanyConfig): Promise<Job[]> {
  const d = await cached(`gh:${c.slug}`, TTL, () =>
    getJson<{ jobs?: Array<Record<string, any>> }>(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(c.slug)}/jobs?content=true`, 12000),
  )
  return (d.jobs || []).map(j =>
    base(c, s(j.id), s(j.title), s(j.location?.name), s(j.absolute_url), htmlToText(unescapeHtml(s(j.content))), s(j.updated_at) || undefined),
  )
}

async function lever(c: CompanyConfig): Promise<Job[]> {
  const d = await cached(`lv:${c.slug}`, TTL, () =>
    getJson<Array<Record<string, any>>>(`https://api.lever.co/v0/postings/${encodeURIComponent(c.slug)}?mode=json`, 12000),
  )
  return (Array.isArray(d) ? d : []).map(j => {
    const cats = j.categories || {}
    const where = [s(cats.location), ...(Array.isArray(cats.allLocations) ? cats.allLocations.map(s) : [])].filter(Boolean)
    const loc = Array.from(new Set(where)).join(' / ') + (s(j.workplaceType) === 'remote' ? ' (Remote)' : '')
    return base(c, s(j.id), s(j.text), loc, s(j.hostedUrl) || s(j.applyUrl), s(j.descriptionPlain), typeof j.createdAt === 'number' ? new Date(j.createdAt).toISOString() : undefined)
  })
}

async function smartRecruiters(c: CompanyConfig, city: string): Promise<Job[]> {
  const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(c.slug)}/postings?limit=100&city=${encodeURIComponent(city)}`
  const d = await cached(`sr:${c.slug}:${city}`, TTL, () => getJson<{ content?: Array<Record<string, any>> }>(url, 12000))
  return (d.content || []).map(j => {
    const loc = [s(j.location?.city), s(j.location?.region), s(j.location?.country).toUpperCase()].filter(Boolean).join(', ')
    const id = s(j.id)
    const job = base(c, id, s(j.name), loc, `https://jobs.smartrecruiters.com/${c.slug}/${id}`, s(j.department?.label), s(j.releasedDate) || undefined)
    if (j.ref) DETAIL_URLS.set(job.id, s(j.ref))
    return job
  })
}

async function workday(c: CompanyConfig, city: string): Promise<Job[]> {
  if (!c.host || !c.site) throw new Error('workday host/site missing')
  const api = `https://${c.host}/wday/cxs/${c.slug}/${c.site}/jobs`
  const pages = await cached(`wd:${c.slug}:${city}`, TTL, async () => {
    const out: Array<Record<string, any>> = []
    for (let offset = 0; offset < 60; offset += 20) {
      const d = await postJson<{ jobPostings?: Array<Record<string, any>>; total?: number }>(api, { appliedFacets: {}, limit: 20, offset, searchText: city }, 12000)
      const batch = d.jobPostings || []
      out.push(...batch)
      if (batch.length < 20 || offset + 20 >= (d.total ?? 0)) break
    }
    return out
  })
  return pages.map(j => {
    const path = s(j.externalPath)
    // A location like "3 Locations" hides the city, so it will not pass the strict location filter. That is deliberate.
    const job = base(c, path.split('_').pop() || path, s(j.title), s(j.locationsText), `https://${c.host}/${c.site}${path}`, '', undefined)
    job.postedDate = undefined
    DETAIL_URLS.set(job.id, `https://${c.host}/wday/cxs/${c.slug}/${c.site}${path}`)
    return job
  })
}

async function amazon(c: CompanyConfig, city: string, queries: string[]): Promise<Job[]> {
  const out = new Map<string, Job>()
  for (const q of queries.slice(0, 3)) {
    const url = `https://www.amazon.jobs/en/search.json?loc_query=${encodeURIComponent(city)}&base_query=${encodeURIComponent(q)}&result_limit=50`
    const d = await cached(`az:${city}:${q}`, TTL, () => getJson<{ jobs?: Array<Record<string, any>> }>(url, 12000))
    for (const j of d.jobs || []) {
      const desc = htmlToText([s(j.description_short), s(j.basic_qualifications), s(j.preferred_qualifications)].join('\n'))
      const job = base(c, s(j.id_icims || j.id), s(j.title), s(j.normalized_location) || s(j.location), `https://www.amazon.jobs${s(j.job_path)}`, desc)
      const posted = Date.parse(s(j.posted_date))
      if (Number.isFinite(posted)) job.postedDate = new Date(posted).toISOString()
      out.set(job.id, job)
    }
  }
  return Array.from(out.values())
}

export async function fetchCompany(c: CompanyConfig, city: string, queries: string[]): Promise<Job[]> {
  switch (c.ats) {
    case 'greenhouse': return greenhouse(c)
    case 'lever': return lever(c)
    case 'smartrecruiters': return smartRecruiters(c, city)
    case 'workday': return workday(c, city)
    case 'amazon': return amazon(c, city, queries)
    default: throw new Error(`Unknown ATS: ${String(c.ats)}`)
  }
}

/** Fetch full descriptions for the few best matches, so skill matching has real text to work with. */
export async function enrichDescriptions(jobs: Job[], limit = 12): Promise<Job[]> {
  const targets = jobs.filter(j => j.source === 'company' && !j.description && DETAIL_URLS.has(j.id)).slice(0, limit)
  const filled = new Map<string, string>()
  await Promise.all(
    targets.map(async j => {
      try {
        const d = await cached(`detail:${j.id}`, TTL, () => getJson<Record<string, any>>(DETAIL_URLS.get(j.id)!, 8000))
        const text = s(d.jobPostingInfo?.jobDescription) || s(d.jobAd?.sections?.jobDescription?.text) || s(d.description)
        if (text) filled.set(j.id, truncate(htmlToText(text), 6000))
      } catch {
        /* keep the job without a description */
      }
    }),
  )
  return jobs.map(j => {
    const text = filled.get(j.id)
    return text ? { ...j, description: text, requirements: reqLines(text) } : j
  })
}
