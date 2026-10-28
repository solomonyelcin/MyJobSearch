import { Router, Request, Response } from 'express'
import { discoverJobs } from '../jobs/discover'
import { buildApplicationKit } from '../ai/applicationKit'
import { aiEnabled, aiModel } from '../ai/anthropic'
import { aiBudgetPerHour, takeToken } from '../util/rateLimit'
import { DEFAULT_LOCATION } from '../jobs/location'
import type { ApiResponse, ApplicationKit, DiscoverResult, Job, Profile } from '../types'

const router = Router()

router.get('/ai-status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      ai: aiEnabled(),
      model: aiEnabled() ? aiModel() : null,
      adzuna: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
      defaultLocation: DEFAULT_LOCATION,
    },
  })
})

/** Find best-match jobs for a profile across live job boards (and AI web search when configured). */
router.post('/discover', async (req: Request, res: Response) => {
  try {
    const { profile, query, location, includeRemote, useAI } = req.body as {
      profile?: Profile; query?: string; location?: string; includeRemote?: boolean; useAI?: boolean
    }
    if (!profile || !Array.isArray(profile.skills)) {
      return res.status(400).json({ success: false, error: 'A profile is required' })
    }
    let wantAI = Boolean(useAI) && aiEnabled()
    if (wantAI && !takeToken(`discover:${req.ip}`, aiBudgetPerHour(), 3600_000)) wantAI = false

    const data = await discoverJobs(profile, { query, location, includeRemote }, { useAI: wantAI })
    res.json({ success: true, data } as ApiResponse<DiscoverResult>)
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to find jobs' })
  }
})

/** Tailored application kit (autofill fields, cover letter, answers) for one job. */
router.post('/apply-kit', async (req: Request, res: Response) => {
  try {
    const { profile, job } = req.body as { profile?: Profile; job?: Job }
    if (!profile || !job) return res.status(400).json({ success: false, error: 'Profile and job are required' })
    let wantAI = aiEnabled()
    if (wantAI && !takeToken(`kit:${req.ip}`, aiBudgetPerHour(), 3600_000)) wantAI = false
    const kit = await buildApplicationKit(profile, job, wantAI)
    res.json({ success: true, data: kit } as ApiResponse<ApplicationKit>)
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to build application kit' })
  }
})

export default router
