import express, { Express, NextFunction, Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { join } from 'path'
import resumeRoutes from './api/resumeRoutes'
import jobsRoutes from './api/jobsRoutes'
import matchRoutes from './api/matchRoutes'
import analyticsRoutes from './api/analyticsRoutes'

dotenv.config()

const app: Express = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN || 'http://localhost:5173',
}))

app.set('trust proxy', 1)
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ limit: '2mb', extended: true }))

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

app.use('/api/profile', resumeRoutes)

// Serve frontend index.html for all other routes (SPA support)
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(__dirname, '../public/index.html'))
  } else {
    res.status(404).json({ success: false, error: 'API endpoint not found' })
  }
})

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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
