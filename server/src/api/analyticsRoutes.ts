import { Router, Request, Response } from 'express'
import type { Job, Profile, ApiResponse } from '../types'

const router = Router()

router.post('/score-distribution', (req: Request, res: Response) => {
  try {
    const { jobs } = req.body as { jobs: Job[] }

    if (!jobs || !Array.isArray(jobs)) {
      return res.status(400).json({
        success: false,
        error: 'Jobs array is required',
      })
    }

    const distribution = {
      '0-50': jobs.filter(j => (j.matchScore || 0) < 50).length,
      '50-70': jobs.filter(j => (j.matchScore || 0) >= 50 && (j.matchScore || 0) < 70).length,
      '70-85': jobs.filter(j => (j.matchScore || 0) >= 70 && (j.matchScore || 0) < 85).length,
      '85+': jobs.filter(j => (j.matchScore || 0) >= 85).length,
    }

    res.json({
      success: true,
      data: Object.entries(distribution).map(([range, count]) => ({ range, count })),
    } as ApiResponse<Array<{ range: string; count: number }>>)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to calculate distribution',
    })
  }
})

router.post('/top-skills', (req: Request, res: Response) => {
  try {
    const { jobs, profile } = req.body as { jobs: Job[]; profile: Profile }

    if (!jobs || !profile) {
      return res.status(400).json({
        success: false,
        error: 'Jobs and profile are required',
      })
    }

    const skillCount = new Map<string, number>()

    // Count skill occurrences across all matched jobs
    for (const job of jobs) {
      if (job.matchedSkills) {
        for (const skill of job.matchedSkills) {
          skillCount.set(skill, (skillCount.get(skill) || 0) + 1)
        }
      }
    }

    // Sort by count and return top 10
    const topSkills = Array.from(skillCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }))

    res.json({
      success: true,
      data: topSkills,
    } as ApiResponse<Array<{ skill: string; count: number }>>)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get top skills',
    })
  }
})

router.post('/summary', (req: Request, res: Response) => {
  try {
    const { jobs, profile } = req.body as { jobs: Job[]; profile: Profile }

    if (!jobs || !profile) {
      return res.status(400).json({
        success: false,
        error: 'Jobs and profile are required',
      })
    }

    const avgScore = jobs.length > 0 ? Math.round(jobs.reduce((sum, j) => sum + (j.matchScore || 0), 0) / jobs.length) : 0
    const highMatchJobs = jobs.filter(j => (j.matchScore || 0) >= 80).length
    const mediumMatchJobs = jobs.filter(j => (j.matchScore || 0) >= 50 && (j.matchScore || 0) < 80).length
    const lowMatchJobs = jobs.filter(j => (j.matchScore || 0) < 50).length

    const summary = {
      totalJobs: jobs.length,
      averageScore: avgScore,
      highMatchCount: highMatchJobs,
      mediumMatchCount: mediumMatchJobs,
      lowMatchCount: lowMatchJobs,
      userSkillsCount: profile.skills.length,
      userExperienceYears: profile.experience.reduce((sum, exp) => sum + exp.years, 0),
    }

    res.json({ success: true, data: summary } as ApiResponse<typeof summary>)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get summary',
    })
  }
})

export default router
