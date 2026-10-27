import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import type { Profile, Skill, Experience, Education, Certification } from '../types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const skillsList = JSON.parse(
  readFileSync(join(__dirname, 'skillsList.json'), 'utf-8')
) as Record<string, string[]>

const allSkills = [
  ...skillsList.technical,
  ...skillsList.soft_skills,
  ...skillsList.platforms,
  ...skillsList.methodologies,
].map(s => s.toLowerCase())

export function extractProfile(resumeText: string): Profile {
  const cleanText = resumeText.toLowerCase()

  return {
    skills: extractSkills(cleanText),
    experience: extractExperience(cleanText),
    education: extractEducation(cleanText),
    certifications: extractCertifications(cleanText),
  }
}

function extractSkills(text: string): Skill[] {
  const foundSkills = new Set<string>()
  const skillFreq = new Map<string, number>()

  for (const skill of allSkills) {
    const pattern = new RegExp(`\\b${skill}\\b`, 'gi')
    const matches = text.match(pattern)
    if (matches) {
      foundSkills.add(skill)
      skillFreq.set(skill, matches.length)
    }
  }

  // Sort by frequency
  return Array.from(foundSkills)
    .sort((a, b) => (skillFreq.get(b) || 0) - (skillFreq.get(a) || 0))
    .slice(0, 50)
    .map(skill => ({
      name: skill.charAt(0).toUpperCase() + skill.slice(1),
      proficiency: skillFreq.get(skill)! > 3 ? 'advanced' : 'intermediate',
    }))
}

function extractExperience(text: string): Experience[] {
  const experiences: Experience[] = []

  // Look for common job title patterns
  const jobTitlePattern = /(software engineer|developer|manager|analyst|designer|architect|lead|senior|junior|intern)[\w\s]*/gi
  const matches = text.match(jobTitlePattern) || []

  if (matches.length > 0) {
    // Group unique matches
    const uniqueMatches = Array.from(new Set(matches.map(m => m.trim())))
    return uniqueMatches.slice(0, 10).map(title => ({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      company: 'Not specified',
      years: 1,
    }))
  }

  return []
}

function extractEducation(text: string): Education[] {
  const educations: Education[] = []

  // Look for degree patterns
  const degreePattern = /(bachelor|master|phd|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?)[\w\s]*(computer science|engineering|management|mathematics|physics)*/gi
  const matches = text.match(degreePattern) || []

  return matches.slice(0, 5).map(match => {
    const parts = match.split('in')
    return {
      degree: parts[0].trim().charAt(0).toUpperCase() + parts[0].trim().slice(1),
      institution: 'Not specified',
      field: parts[1]?.trim() || 'Not specified',
    }
  })
}

function extractCertifications(text: string): Certification[] {
  const certifications: Certification[] = []

  // Look for certification patterns
  const certPattern = /(aws|azure|gcp|kubernetes|docker|tensorflow|certified|certificate)[\w\s]*/gi
  const matches = text.match(certPattern) || []

  return Array.from(new Set(matches.map(m => m.trim())))
    .slice(0, 5)
    .map(cert => ({
      name: cert.charAt(0).toUpperCase() + cert.slice(1),
    }))
}
