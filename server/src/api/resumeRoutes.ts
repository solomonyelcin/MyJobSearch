import { Router, Request, Response } from 'express'
import multer from 'multer'
import { promises as fs, mkdirSync } from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { detectKind, parseResume } from '../parsers/resumeParser'
import { extractProfileHeuristic, normalizeResumeText } from '../extraction/heuristic'
import { extractProfileWithAI } from '../ai/extractProfileAI'
import { aiEnabled } from '../ai/anthropic'
import { aiBudgetPerHour, takeToken } from '../util/rateLimit'
import type { Profile, ApiResponse } from '../types'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(os.tmpdir(), 'resume-uploads')
const MAX_FILE_SIZE = parseInt(process.env.MAX_RESUME_SIZE || '5242880')
mkdirSync(UPLOAD_DIR, { recursive: true })

const router = Router()

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (detectKind(file.originalname, file.mimetype)) cb(null, true)
    else cb(new Error('Invalid file type. Please upload a PDF, DOCX or TXT file.'))
  },
})

const profileStore = new Map<string, Profile>()

async function buildProfile(text: string, ip: string): Promise<Profile> {
  let profile: Profile
  const allowAI = aiEnabled() && takeToken(`extract:${ip}`, aiBudgetPerHour(), 3600_000)
  if (allowAI) {
    try {
      profile = await extractProfileWithAI(text)
    } catch (err) {
      console.warn('AI extraction failed, using rule-based extraction:', err instanceof Error ? err.message : err)
      profile = extractProfileHeuristic(text)
    }
  } else {
    profile = extractProfileHeuristic(text)
  }
  const id: string = uuidv4()
  profile.id = id
  profile.extractedAt = new Date().toISOString()
  profile.rawText = text.slice(0, 30000)
  profileStore.set(id, profile)
  return profile
}

router.post('/upload', upload.single('resume'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' })
    const text = await parseResume(req.file.path, req.file.originalname, req.file.mimetype)
    if (text.replace(/\s/g, '').length < 40) {
      return res.status(422).json({
        success: false,
        error: "We couldn't read any text from this file. It may be a scanned image. Please upload a text-based PDF or DOCX, or paste your resume text.",
      })
    }
    const profile = await buildProfile(text, req.ip || 'anon')
    res.json({ success: true, data: profile } as ApiResponse<Profile>)
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to process resume' })
  } finally {
    if (req.file) await fs.unlink(req.file.path).catch(() => {})
  }
})

router.post('/extract', async (req: Request, res: Response) => {
  try {
    const { text } = req.body
    if (!text || typeof text !== 'string' || text.trim().length < 40) {
      return res.status(400).json({ success: false, error: 'Please paste at least a few lines of your resume.' })
    }
    const profile = await buildProfile(normalizeResumeText(text), req.ip || 'anon')
    res.json({ success: true, data: profile } as ApiResponse<Profile>)
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to extract profile' })
  }
})

router.get('/:profileId', (req: Request, res: Response) => {
  const profile = profileStore.get(req.params.profileId)
  if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' })
  res.json({ success: true, data: profile } as ApiResponse<Profile>)
})

// The client sends the full edited profile; accept it even if the server restarted (in-memory store).
router.put('/:profileId', (req: Request, res: Response) => {
  const incoming = req.body as Profile
  if (!incoming || !Array.isArray(incoming.skills)) {
    return res.status(400).json({ success: false, error: 'Invalid profile' })
  }
  const existing = profileStore.get(req.params.profileId)
  const updated: Profile = { ...existing, ...incoming, id: req.params.profileId, extractedAt: new Date().toISOString() }
  profileStore.set(updated.id!, updated)
  res.json({ success: true, data: updated } as ApiResponse<Profile>)
})

export default router
