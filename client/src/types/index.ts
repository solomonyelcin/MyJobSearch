export interface Skill {
  name: string
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  years?: number
}

export interface Experience {
  title: string
  company: string
  startDate?: string
  endDate?: string
  years: number
  description?: string
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

export interface Profile {
  id?: string
  name?: string
  email?: string
  phone?: string
  location?: string
  summary?: string
  skills: Skill[]
  experience: Experience[]
  education: Education[]
  certifications: Certification[]
  extractedAt?: string
}

export interface Job {
  id: string
  title: string
  company: string
  location: string
  salary?: {
    min?: number
    max?: number
    currency?: string
  }
  description: string
  requirements: string[]
  benefits?: string[]
  jobType?: 'full-time' | 'part-time' | 'contract' | 'remote'
  experienceLevel?: 'entry' | 'mid' | 'senior'
  url: string
  source: 'indeed' | 'linkedin' | 'other'
  postedDate?: string
  matchScore?: number
  matchBreakdown?: {
    skillMatch: number
    experienceMatch: number
    educationMatch: number
    keywordMatch: number
  }
  matchedSkills?: string[]
}

export interface SearchFilters {
  query: string
  location: string
  salaryMin?: number
  salaryMax?: number
  jobType?: string
  experienceLevel?: string
  remote?: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
