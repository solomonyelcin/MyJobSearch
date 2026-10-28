export interface Skill {
  name: string
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  years?: number
}

export interface Experience {
  title: string
  company: string
  location?: string
  startDate?: string
  endDate?: string
  current?: boolean
  years: number
  description?: string
  bullets?: string[]
  skills?: string[]
}

export interface Education {
  degree: string
  institution: string
  field?: string
  graduationYear?: number
}

export interface Certification {
  name: string
  issuer?: string
  date?: string
  url?: string
}

export interface Project {
  name: string
  description?: string
  skills?: string[]
  url?: string
}

export interface ProfileLink {
  label: string
  url: string
}

export interface Profile {
  id?: string
  name?: string
  email?: string
  phone?: string
  location?: string
  headline?: string
  summary?: string
  links?: ProfileLink[]
  totalYears?: number
  skills: Skill[]
  experience: Experience[]
  education: Education[]
  certifications: Certification[]
  projects?: Project[]
  languages?: string[]
  /** Plain text of the resume, kept so AI features work without server-side state. */
  rawText?: string
  extractionMethod?: 'ai' | 'heuristic'
  extractionWarnings?: string[]
  extractedAt?: string
}

export type JobSource = 'remotive' | 'arbeitnow' | 'remoteok' | 'jobicy' | 'adzuna' | 'ai-web' | 'other'

export interface Job {
  id: string
  title: string
  company: string
  location: string
  remote?: boolean
  salary?: {
    min?: number
    max?: number
    currency?: string
    text?: string
  }
  /** Plain text (HTML already stripped). */
  description: string
  requirements: string[]
  benefits?: string[]
  jobType?: string
  experienceLevel?: 'entry' | 'mid' | 'senior'
  url: string
  source: JobSource
  postedDate?: string
  tags?: string[]
  matchScore?: number
  matchBreakdown?: {
    skillMatch: number
    titleMatch: number
    experienceMatch: number
    locationMatch: number
  }
  matchedSkills?: string[]
  missingSkills?: string[]
  aiScored?: boolean
  aiReason?: string
  aiPros?: string[]
  aiGaps?: string[]
}

export interface SearchFilters {
  query?: string
  location?: string
  /** also keep remote jobs that are not in the chosen location */
  includeRemote?: boolean
  country?: string
}

export interface SourceReport {
  name: string
  count: number
  error?: string
}

export interface DiscoverResult {
  jobs: Job[]
  meta: {
    queries: string[]
    sources: SourceReport[]
    total: number
    durationMs: number
    location: string
    includeRemote: boolean
    /** human-readable hints, e.g. a job source that is not configured */
    notices: string[]
  }
}

export interface ApplicationField {
  label: string
  value: string
}

export interface ApplicationKit {
  fields: ApplicationField[]
  coverLetter: string
  summary: string
  answers: Array<{ question: string; answer: string }>
  resumeBullets: string[]
  tips: string[]
  generatedBy: 'ai' | 'template'
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
