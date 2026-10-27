import { Router, Request, Response } from 'express'
import { calculateMatches, MatchResult } from '../matching/matchCalculator'
import type { Profile, Job, ApiResponse } from '../types'

const router = Router()

router.post('/', (req: Request, res: Response) => {
  try {
    const { profile, jobs } = req.body as { profile: Profile; jobs: Job[] }

    if (!profile || !jobs || !Array.isArray(jobs)) {
      return res.status(400).json({
        success: false,
        error: 'Profile and jobs array are required',
      })
    }

    const matchedJobs = calculateMatches(profile, jobs) as MatchResult[]

    // Sort by match score
    matchedJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))

    res.json({ success: true, data: matchedJobs } as ApiResponse<MatchResult[]>)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to calculate matches',
    })
  }
})

export default router
