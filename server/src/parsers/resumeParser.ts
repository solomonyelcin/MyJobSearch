import fs from 'fs'
import path from 'path'
import PDFParser from 'pdf-parse'
import mammoth from 'mammoth'

export async function parseResume(filePath: string, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      return await parsePDF(filePath)
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await parseDOCX(filePath)
    } else if (mimeType === 'text/plain') {
      return parseTXT(filePath)
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`)
    }
  } catch (err) {
    throw new Error(`Failed to parse resume: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function parsePDF(filePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath)
  const data = await PDFParser(fileBuffer)
  return data.text
}

async function parseDOCX(filePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath)
  const result = await mammoth.extractRawText({ buffer: fileBuffer })
  return result.value
}

function parseTXT(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8')
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function extractSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {}

  const sectionPatterns = {
    summary: /(?:summary|objective|professional summary)(.*?)(?=\n\s*[A-Z][A-Z\s]*$|\n[A-Z]{2,}|\Z)/is,
    experience: /(?:experience|work experience|employment)(.*?)(?=\n\s*[A-Z][A-Z\s]*$|\n[A-Z]{2,}|\Z)/is,
    education: /(?:education|academic background)(.*?)(?=\n\s*[A-Z][A-Z\s]*$|\n[A-Z]{2,}|\Z)/is,
    skills: /(?:skills|technical skills|core competencies)(.*?)(?=\n\s*[A-Z][A-Z\s]*$|\n[A-Z]{2,}|\Z)/is,
    certifications: /(?:certifications?|licenses?|awards?)(.*?)(?=\n\s*[A-Z][A-Z\s]*$|\n[A-Z]{2,}|\Z)/is,
  }

  for (const [section, pattern] of Object.entries(sectionPatterns)) {
    const match = text.match(pattern)
    if (match) {
      sections[section] = match[1].trim()
    }
  }

  return sections
}
