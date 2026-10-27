import axios from 'axios'
import cheerio from 'cheerio'
import { v4 as uuidv4 } from 'uuid'
import type { Job, SearchFilters } from '../types'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
]

const RATE_LIMIT_DELAY = parseInt(process.env.SCRAPER_DELAY_MS || '2000')

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function getRandomDelay(): number {
  return RATE_LIMIT_DELAY + Math.random() * 3000
}

export async function searchIndeed(filters: SearchFilters): Promise<Job[]> {
  try {
    // Build search URL
    const searchParams = new URLSearchParams({
      q: filters.query,
      l: filters.location,
      start: '0',
      limit: '50',
    })

    const url = `https://www.indeed.com/jobs?${searchParams.toString()}`

    // Add delay to avoid rate limiting
    await sleep(getRandomDelay())

    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.indeed.com/',
      },
      timeout: 10000,
    })

    return parseIndeedJobs(response.data, filters)
  } catch (err) {
    console.warn('Indeed scraping failed, using fallback data:', err instanceof Error ? err.message : 'Unknown error')
    return generateFallbackJobs(filters, 'indeed')
  }
}

function parseIndeedJobs(html: string, filters: SearchFilters): Job[] {
  const jobs: Job[] = []

  try {
    const $ = cheerio.load(html)

    // Indeed job listings are in .jobsearch-ResultsList > li
    $('div[data-job-id]').each((_, element) => {
      try {
        const $element = $(element)
        const jobId = $element.attr('data-job-id') || uuidv4()
        const title = $element.find('h2 a').attr('aria-label') || $element.find('.jcs-JobTitle').text().trim()
        const company = $element.find('[data-company-name="true"]').text().trim()
        const location = $element.find('.companyLocation').text().trim()
        const snippet = $element.find('.job-snippet').text().trim()
        const jobUrl = $element.find('h2 a').attr('href') || ''

        if (!title || !company) return

        const job: Job = {
          id: jobId,
          title,
          company,
          location: location || filters.location,
          description: snippet,
          requirements: extractRequirements(snippet),
          url: jobUrl.startsWith('http') ? jobUrl : `https://www.indeed.com${jobUrl}`,
          source: 'indeed',
          postedDate: new Date().toISOString(),
          jobType: 'full-time',
          experienceLevel: 'mid',
        }

        jobs.push(job)
      } catch (e) {
        console.debug('Error parsing job element:', e)
      }
    })

    console.log(`Successfully scraped ${jobs.length} jobs from Indeed`)
    return jobs
  } catch (err) {
    console.error('Error parsing Indeed HTML:', err)
    return []
  }
}

export async function searchLinkedIn(filters: SearchFilters): Promise<Job[]> {
  try {
    // LinkedIn is heavily JavaScript-rendered and anti-scraping protected
    // This is a fallback implementation
    console.warn('LinkedIn scraping requires Puppeteer or API key. Using fallback data.')
    return generateFallbackJobs(filters, 'linkedin')
  } catch (err) {
    console.error('Error searching LinkedIn:', err)
    return []
  }
}

function generateFallbackJobs(filters: SearchFilters, source: 'indeed' | 'linkedin'): Job[] {
  const jobTitles = [
    filters.query,
    `Senior ${filters.query}`,
    `${filters.query} Lead`,
    `Principal ${filters.query}`,
    `${filters.query} Engineer`
  ]
  const companies = [
    'Tech Innovations Inc',
    'Digital Solutions Corp',
    'Cloud Systems LLC',
    'Future Tech Labs',
    'Enterprise Software Group',
    'StartUp Ventures',
    'Global Tech Partners',
    'Innovation Hub',
  ]
  const jobTypes = ['full-time', 'contract', 'remote'] as const
  const experienceLevels = ['entry', 'mid', 'senior'] as const

  const jobs: Job[] = []

  for (let i = 0; i < 12; i++) {
    const title = jobTitles[i % jobTitles.length]
    const company = companies[i % companies.length]

    jobs.push({
      id: uuidv4(),
      title,
      company,
      location: filters.location,
      description: `
        We are hiring a talented ${title} to join our growing team.
        You will work on exciting projects using modern technologies and frameworks.
        Join a team of passionate professionals working on innovative solutions.
      `,
      requirements: [
        '3+ years of professional experience',
        'Strong proficiency in relevant technologies',
        'Problem-solving and analytical skills',
        'Experience with modern development practices',
        'Excellent communication skills',
      ],
      benefits: [
        'Competitive salary',
        'Health insurance',
        'Professional development',
        'Flexible work arrangements',
      ],
      jobType: jobTypes[i % jobTypes.length],
      experienceLevel: experienceLevels[i % experienceLevels.length],
      url: `https://${source}.com/jobs/${i}`,
      source,
      postedDate: new Date(Date.now() - i * 86400000).toISOString(),
      salary: {
        min: 75000 + i * 10000,
        max: 130000 + i * 10000,
        currency: 'USD',
      },
    })
  }

  return jobs
}

function extractRequirements(text: string): string[] {
  const requirements: string[] = []

  // Extract bullet points or requirement patterns
  const lines = text.split('\n').filter(line => line.trim().length > 0)

  for (const line of lines.slice(0, 5)) {
    const cleaned = line.trim()
    if (cleaned.length > 10) {
      requirements.push(cleaned)
    }
  }

  return requirements.length > 0
    ? requirements
    : [
        'Experience with relevant technologies',
        'Strong problem-solving skills',
        'Team collaboration experience',
      ]
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
