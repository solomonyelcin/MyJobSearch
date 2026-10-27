import { Router, Request, Response } from 'express'
import multer from 'multer'
import { promises as fs, mkdirSync } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { parseResume } from '../parsers/resumeParser'
import { extractProfile } from '../skills/skillExtractor'
import type { Profile, ApiResponse } from '../types'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_RESUME_SIZE || '5242880')

mkdirSync(UPLOAD_DIR, { recursive: true })

const router = Router()

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  },
})

// Store profiles in memory (replace with database in production)
const profileStore = new Map<string, Profile>()

router.post('/upload', upload.single('resume'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' })
    }

    // Parse resume
    const resumeText = await parseResume(req.file.path, req.file.mimetype)

    // Extract profile information
    const profile = extractProfile(resumeText)
    profile.id = uuidv4()
    profile.extractedAt = new Date().toISOString()

    // Store profile
    profileStore.set(profile.id, profile)

    // Clean up uploaded file
    await fs.unlink(req.file.path)

    res.json({ success: true, data: profile } as ApiResponse<Profile>)
  } catch (err) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {})
    }
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to process resume',
    })
  }
})

router.post('/extract', async (req: Request, res: Response) => {
  try {
    const { text } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Resume text is required' })
    }

    const profile = extractProfile(text)
    profile.id = uuidv4()
    profile.extractedAt = new Date().toISOString()

    profileStore.set(profile.id, profile)

    res.json({ success: true, data: profile } as ApiResponse<Profile>)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to extract profile',
    })
  }
})

router.get('/:profileId', (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const profile = profileStore.get(profileId)

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    res.json({ success: true, data: profile } as ApiResponse<Profile>)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to retrieve profile',
    })
  }
})

router.put('/:profileId', (req: Request, res: Response) => {
  try {
    const { profileId } = req.params
    const updatedProfile = req.body as Profile

    if (!profileStore.has(profileId)) {
      return res.status(404).json({ success: false, error: 'Profile not found' })
    }

    updatedProfile.id = profileId
    updatedProfile.extractedAt = new Date().toISOString()
    profileStore.set(profileId, updatedProfile)

    res.json({ success: true, data: updatedProfile } as ApiResponse<Profile>)
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update profile',
    })
  }
})

export default router
