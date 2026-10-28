import type { Job } from '../types'

export const DEFAULT_LOCATION = (process.env.DEFAULT_LOCATION || 'Chennai').trim()

/** Old/alternate names so "Chennai" also matches postings that say "Madras". */
const ALIASES: Record<string, string[]> = {
  chennai: [
    'chennai', 'madras', 'sholinganallur', 'siruseri', 'taramani', 'tharamani', 'guindy', 'perungudi', 'navalur', 'ambattur',
    'porur', 'velachery', 'thoraipakkam', 'kelambakkam', 'nandambakkam', 'mahindra world city', 'tidel park', 'pallavaram', 'adyar',
    'anna nagar', 'nungambakkam', 'egmore', 't. nagar', 'manapakkam', 'perumbakkam', 'medavakkam', 'chromepet', 'tambaram', 'oragadam',
  ],
  bengaluru: ['bengaluru', 'bangalore'],
  bangalore: ['bengaluru', 'bangalore'],
  mumbai: ['mumbai', 'bombay', 'navi mumbai', 'thane'],
  'delhi ncr': ['delhi', 'new delhi', 'gurgaon', 'gurugram', 'noida', 'ghaziabad', 'faridabad'],
  delhi: ['delhi', 'new delhi', 'gurgaon', 'gurugram', 'noida'],
  kolkata: ['kolkata', 'calcutta'],
  pune: ['pune', 'pimpri'],
  hyderabad: ['hyderabad', 'secunderabad'],
}

export function isRemoteQuery(location: string): boolean {
  return /^(remote|anywhere|work from home|wfh)$/i.test(location.trim())
}

export function locationTerms(location: string): string[] {
  const city = location.split(',')[0].trim().toLowerCase()
  return ALIASES[city] || (city ? [city] : [])
}

export function jobInLocation(job: Job, location: string): boolean {
  const terms = locationTerms(location)
  if (!terms.length) return true
  const hay = job.location.toLowerCase()
  return terms.some(t => hay.includes(t))
}

/** Strict filter: only the chosen place, plus remote jobs when the user opted in. */
export function filterByLocation(jobs: Job[], location: string, includeRemote: boolean): Job[] {
  if (!location) return jobs
  if (isRemoteQuery(location)) return jobs.filter(j => j.remote)
  return jobs.filter(j => jobInLocation(j, location) || (includeRemote && j.remote))
}
