import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import resumeRoutes from './api/resumeRoutes'
import jobsRoutes from './api/jobsRoutes'
import matchRoutes from './api/matchRoutes'
import analyticsRoutes from './api/analyticsRoutes'

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

// Serve static files (frontend)
app.use(express.static(join(__dirname, '../public')))

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/resume', resumeRoutes)
app.use('/api/jobs', jobsRoutes)
app.use('/api/match', matchRoutes)
app.use('/api/analytics', analyticsRoutes)

// Profile management endpoint
app.get('/api/profile/:profileId', (req: Request, res: Response) => {
  // Proxy to resume routes
  const handler = resumeRoutes.stack.find((layer: any) => layer.route?.path === '/:profileId' && layer.route?.methods.get)
  if (handler) {
    handler.handle(req, res)
  } else {
    res.status(404).json({ success: false, error: 'Profile not found' })
  }
})

app.put('/api/profile/:profileId', (req: Request, res: Response) => {
  // Proxy to resume routes
  const handler = resumeRoutes.stack.find((layer: any) => layer.route?.path === '/:profileId' && layer.route?.methods.put)
  if (handler) {
    handler.handle(req, res)
  } else {
    res.status(404).json({ success: false, error: 'Failed to update profile' })
  }
})

// Serve frontend index.html for all other routes (SPA support)
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(__dirname, '../public/index.html'))
  } else {
    res.status(404).json({ success: false, error: 'API endpoint not found' })
  }
})

// Error handling middleware
app.use((err: any, req: Request, res: Response) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 API: http://localhost:${PORT}/api`)
})

export default app
