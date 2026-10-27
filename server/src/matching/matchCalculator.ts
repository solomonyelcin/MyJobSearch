import type { Profile, Job } from '../types'
import { skillRegex } from '../skills/skillRegex'

export interface MatchResult extends Job {
  matchScore: number
  matchBreakdown: {
    skillMatch: number
    experienceMatch: number
    educationMatch: number
    keywordMatch: number
  }
  matchedSkills: string[]
}

export function calculateMatches(profile: Profile, jobs: Job[]): MatchResult[] {
  return jobs.map(job => calculateJobMatch(profile, job))
}

function calculateJobMatch(profile: Profile, job: Job): MatchResult {
  const userSkillNames = profile.skills.map(s => s.name.toLowerCase())
  const jobDescription = (job.description + ' ' + job.requirements.join(' ')).toLowerCase()

  // Calculate individual match components
  const skillMatch = calculateSkillMatch(userSkillNames, jobDescription)
  const experienceMatch = calculateExperienceMatch(profile, jobDescription)
  const educationMatch = calculateEducationMatch(profile, jobDescription)
  const keywordMatch = calculateKeywordMatch(jobDescription)

  // Weighted scoring
  const matchScore = Math.round(
    skillMatch * 0.40 +
    experienceMatch * 0.30 +
    educationMatch * 0.20 +
    keywordMatch * 0.10
  )

  // Find matched skills
  const matchedSkills = findMatchedSkills(userSkillNames, jobDescription)

  return {
    ...job,
    matchScore: Math.min(100, Math.max(0, matchScore)),
    matchBreakdown: {
      skillMatch: Math.round(skillMatch),
      experienceMatch: Math.round(experienceMatch),
      educationMatch: Math.round(educationMatch),
      keywordMatch: Math.round(keywordMatch),
    },
    matchedSkills,
  }
}

function calculateSkillMatch(userSkills: string[], jobDescription: string): number {
  if (userSkills.length === 0) return 0

  const matchedCount = userSkills.filter(skill => {
    const skillPattern = skillRegex(skill)
    return skillPattern.test(jobDescription)
  }).length

  return (matchedCount / userSkills.length) * 100
}

function calculateExperienceMatch(profile: Profile, jobDescription: string): number {
  const experienceYears = profile.experience.reduce((sum, exp) => sum + exp.years, 0)

  // Look for experience level requirements
  let requiredYears = 0
  const yearMatches = jobDescription.match(/(\d+)\+?\s*years?/gi) || []

  if (yearMatches.length > 0) {
    const matches = yearMatches.map(m => parseInt(m))
    requiredYears = Math.max(...matches)
  }

  if (requiredYears === 0) {
    return experienceYears > 0 ? 75 : 50
  }

  const experienceRatio = Math.min(experienceYears / requiredYears, 1)
  return experienceRatio * 100
}

function calculateEducationMatch(profile: Profile, jobDescription: string): number {
  if (profile.education.length === 0) return 50

  let score = 0
  const educationText = profile.education.map(e => e.degree + ' ' + (e.field || '')).join(' ').toLowerCase()

  // Check for degree match
  if (/bachelor|b\.s\.|b\.a\./i.test(jobDescription)) {
    if (/bachelor|b\.s\.|b\.a\./i.test(educationText)) score += 40
  }

  if (/master|m\.s\.|m\.a\.|mba/i.test(jobDescription)) {
    if (/master|m\.s\.|m\.a\.|mba/i.test(educationText)) score += 40
  }

  // Check for field match
  const fields = ['computer science', 'engineering', 'mathematics', 'physics', 'information technology']
  for (const field of fields) {
    if (jobDescription.includes(field) && educationText.includes(field)) {
      score += 20
      break
    }
  }

  return Math.min(score, 100)
}

function calculateKeywordMatch(jobDescription: string): number {
  const keywords = [
    'innovative', 'dynamic', 'collaborative', 'fast-paced',
    'challenging', 'creative', 'motivated', 'detail-oriented'
  ]

  let score = 0
  for (const keyword of keywords) {
    if (jobDescription.includes(keyword)) {
      score += 10
    }
  }

  return Math.min(score, 100)
}

function findMatchedSkills(userSkills: string[], jobDescription: string): string[] {
  return userSkills
    .filter(skill => {
      const skillPattern = skillRegex(skill)
      return skillPattern.test(jobDescription)
    })
    .map(skill => skill.charAt(0).toUpperCase() + skill.slice(1))
    .slice(0, 10)
}
