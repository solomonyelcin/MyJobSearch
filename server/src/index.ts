import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app: Express = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes (placeholder - will be filled in)
app.use('/api/resume', (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Resume routes not yet implemented' })
})

app.use('/api/jobs', (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Jobs routes not yet implemented' })
})

app.use('/api/match', (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Match routes not yet implemented' })
})

app.use('/api/analytics', (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Analytics routes not yet implemented' })
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
