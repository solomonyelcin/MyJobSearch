import type { Job } from '../types'
import { allCompanies, type CompanyConfig } from './companies'
import { fetchCompany } from './sources/ats'
import { jobInLocation } from './location'

export interface CompanyStatus {
  name: string
  ats: string
  ok: boolean
  total: number
  inLocation: number
  error?: string
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    }),
  )
  return out
}

async function runOne(c: CompanyConfig, city: string, queries: string[]): Promise<{ status: CompanyStatus; jobs: Job[] }> {
  try {
    const jobs = await fetchCompany(c, city, queries)
    const inLoc = jobs.filter(j => jobInLocation(j, city))
    return { status: { name: c.name, ats: c.ats, ok: true, total: jobs.length, inLocation: inLoc.length }, jobs }
  } catch (err) {
    const msg = err instanceof Error ? (err.name === 'AbortError' ? 'timed out' : err.message) : 'failed'
    return { status: { name: c.name, ats: c.ats, ok: false, total: 0, inLocation: 0, error: msg }, jobs: [] }
  }
}

export async function fetchAllCompanyJobs(city: string, queries: string[]): Promise<{ jobs: Job[]; statuses: CompanyStatus[] }> {
  const results = await pool(allCompanies(), 6, c => runOne(c, city, queries))
  return { jobs: results.flatMap(r => r.jobs), statuses: results.map(r => r.status) }
}
