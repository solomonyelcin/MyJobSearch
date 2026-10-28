import { Router, Request, Response } from 'express'
import { calculateMatches } from '../matching/matchCalculator'
import type { Profile, Job, ApiResponse } from '../types'

const router = Router()

router.post('/', (req: Request, res: Response) => {
  const { profile, jobs } = req.body as { profile: Profile; jobs: Job[] }
  if (!profile || !Array.isArray(jobs)) {
    return res.status(400).json({ success: false, error: 'Profile and jobs array are required' })
  }
  const matched = calculateMatches(profile, jobs).sort((a, b) => b.matchScore - a.matchScore)
  res.json({ success: true, data: matched } as ApiResponse<Job[]>)
})

export default router
