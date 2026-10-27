import { Router, Request, Response } from 'express'
import { searchJobs, filterJobs, getJobById } from '../jobs/jobStore'
import { calculateMatches } from '../matching/matchCalculator'
import type { SearchFilters, Job, ApiResponse, Profile } from '../types'

const router = Router()

// Store bookmarks in memory (replace with database in production)
const bookmarks = new Map<string, Set<string>>()

router.get('/search', async (req: Request, res: Response) => {
  try {
    const { query, location, salaryMin, salaryMax, jobType, experienceLevel } = req.query

    if (!query || !location) {
      return res.status(400).json({
        success: false,
        error: 'Query and location parameters are required',
      })
    }

    const filters: SearchFilters = {
      query: query as string,
      location: location as string,
      salaryMin: salaryMin ? parseInt(salaryMin as string) : undefined,
      salaryMax: salaryMax ? parseInt(salaryMax as string) : undefined,
      jobType: jobType as string,
      experienceLevel: experienceLevel as string,
    }

    const allJobs = await searchJobs(filters)
    const filtered = filterJobs(allJobs, filters)

    res.json({ success: true, data: filtered } as ApiResponse<Job[]>)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to search jobs',
    })
  }
})

router.get('/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params

    // In production, fetch from database
    // For now, return a placeholder
    res.json({
      success: true,
      data: {
        id: jobId,
        title: 'Job Title',
        company: 'Company Name',
        location: 'Location',
        description: 'Job description',
        requirements: [],
        url: '#',
        source: 'indeed' as const,
      },
    } as ApiResponse<Job>)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get job',
    })
  }
})

router.post('/:jobId/bookmark', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' })
    }

    if (!bookmarks.has(userId)) {
      bookmarks.set(userId, new Set())
    }

    bookmarks.get(userId)!.add(jobId)

    res.json({ success: true, data: { bookmarked: true } })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to bookmark job',
    })
  }
})

router.get('/:userId/bookmarks', (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const userBookmarks = bookmarks.get(userId)

    res.json({
      success: true,
      data: userBookmarks ? Array.from(userBookmarks) : [],
    } as ApiResponse<string[]>)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get bookmarks',
    })
  }
})

export default router
