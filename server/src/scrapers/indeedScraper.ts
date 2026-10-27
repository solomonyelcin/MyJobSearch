import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import type { Job, SearchFilters } from '../types'

const INDEED_BASE_URL = 'https://www.indeed.com'
const RATE_LIMIT_DELAY = parseInt(process.env.SCRAPER_DELAY_MS || '1000')

export async function searchIndeed(filters: SearchFilters): Promise<Job[]> {
  try {
    // Build search URL
    const searchParams = new URLSearchParams({
      q: filters.query,
      l: filters.location,
      ...(filters.jobType && { jt: filters.jobType }),
    })

    const url = `${INDEED_BASE_URL}/jobs?${searchParams.toString()}`

    // Note: Indeed has anti-scraping measures, so this is a simplified implementation
    // In production, you'd use an API or a proxy service like ScrapingBee or Apify
    console.log(`Searching Indeed: ${url}`)

    // Return mock data for demonstration
    return generateMockJobs(filters, 'indeed')
  } catch (err) {
    console.error('Error searching Indeed:', err)
    return []
  }
}

export async function searchLinkedIn(filters: SearchFilters): Promise<Job[]> {
  try {
    // LinkedIn also has strict anti-scraping policies
    // This would require using their official API or a third-party scraping service
    console.log(`Searching LinkedIn for: ${filters.query} in ${filters.location}`)

    // Return mock data for demonstration
    return generateMockJobs(filters, 'linkedin')
  } catch (err) {
    console.error('Error searching LinkedIn:', err)
    return []
  }
}

function generateMockJobs(filters: SearchFilters, source: 'indeed' | 'linkedin'): Job[] {
  const jobTitles = [filters.query, `Senior ${filters.query}`, `${filters.query} Lead`]
  const companies = ['Tech Corp', 'Innovation Labs', 'Future Systems', 'Digital Solutions', 'Cloud Innovations']
  const jobTypes = ['full-time', 'contract'] as const

  const jobs: Job[] = []

  for (let i = 0; i < 15; i++) {
    const title = jobTitles[i % jobTitles.length]
    const company = companies[i % companies.length]

    jobs.push({
      id: uuidv4(),
      title: `${title} - ${i + 1}`,
      company: `${company} ${i + 1}`,
      location: filters.location,
      description: `
        We are looking for a talented ${title} to join our growing team.
        You will work on exciting projects using modern technologies.
        Requirements include experience with relevant technologies and frameworks.
      `,
      requirements: [
        '5+ years of experience',
        'Strong problem-solving skills',
        'Experience with cloud platforms',
      ],
      jobType: jobTypes[i % jobTypes.length],
      experienceLevel: i % 3 === 0 ? 'entry' : i % 3 === 1 ? 'mid' : 'senior',
      url: `https://${source}.com/jobs/${i}`,
      source,
      postedDate: new Date(Date.now() - i * 86400000).toISOString(),
      salary: {
        min: 80000 + i * 5000,
        max: 120000 + i * 5000,
        currency: 'USD',
      },
    })
  }

  return jobs
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
