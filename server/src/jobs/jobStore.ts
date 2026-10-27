import type { Job, SearchFilters } from '../types'
import { searchIndeed } from '../scrapers/indeedScraper'

export async function searchJobs(filters: SearchFilters): Promise<Job[]> {
  // Fetch from multiple sources and deduplicate
  const indeedJobs = await searchIndeed(filters)

  // In production, also search LinkedIn and other sources
  // const linkedinJobs = await searchLinkedIn(filters)

  // Combine and deduplicate by URL
  const allJobs = [...indeedJobs]
  const seenUrls = new Set<string>()
  const uniqueJobs: Job[] = []

  for (const job of allJobs) {
    if (!seenUrls.has(job.url)) {
      seenUrls.add(job.url)
      uniqueJobs.push(job)
    }
  }

  return uniqueJobs
}

export function getJobById(jobs: Job[], jobId: string): Job | undefined {
  return jobs.find(j => j.id === jobId)
}

export function filterJobs(
  jobs: Job[],
  filters: Partial<SearchFilters>
): Job[] {
  return jobs.filter(job => {
    if (filters.salaryMin && job.salary?.min && job.salary.min < filters.salaryMin) {
      return false
    }
    if (filters.salaryMax && job.salary?.max && job.salary.max > filters.salaryMax) {
      return false
    }
    if (filters.jobType && job.jobType !== filters.jobType) {
      return false
    }
    if (filters.experienceLevel && job.experienceLevel !== filters.experienceLevel) {
      return false
    }
    return true
  })
}
