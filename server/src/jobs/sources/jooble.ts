import type { Job, SearchFilters } from '../../types'
import { htmlToText, truncate } from '../../util/html'
import { cached } from '../../util/cache'
import { postJson } from './http'

const s = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v))

export function joobleReady(): boolean {
  return Boolean(process.env.JOOBLE_API_KEY)
}

/** Jooble aggregates many Indian boards. Free key: request one at jooble.org/api/about. */
export async function fetchJooble(query: string, f: SearchFilters): Promise<Job[]> {
  const key = process.env.JOOBLE_API_KEY
  if (!key) return []
  const location = f.location || ''
  const data = await cached(`jooble:${query}:${location}`, 15 * 60 * 1000, () =>
    postJson<{ jobs?: Array<Record<string, unknown>> }>(`https://jooble.org/api/${key}`, { keywords: query, location, page: 1 }, 12000),
  )
  return (data.jobs || []).map(j => {
    const description = truncate(htmlToText(s(j.snippet)), 3000)
    const posted = Date.parse(s(j.updated))
    return {
      id: `jooble-${s(j.id) || Buffer.from(s(j.link)).toString('base64').slice(0, 16)}`,
      title: htmlToText(s(j.title)),
      company: s(j.company),
      location: s(j.location),
      salary: s(j.salary) ? { text: s(j.salary) } : undefined,
      description,
      requirements: [],
      jobType: s(j.type) || undefined,
      url: s(j.link),
      source: 'other' as const,
      postedDate: Number.isFinite(posted) ? new Date(posted).toISOString() : undefined,
    }
  })
}
