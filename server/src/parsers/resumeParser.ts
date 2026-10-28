import fs from 'fs'
import path from 'path'
import PDFParser from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import { layoutPageText } from './pdfLayout'
import { normalizeResumeText } from '../extraction/heuristic'

const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export type ResumeKind = 'pdf' | 'docx' | 'txt'

/** Browsers/OSes often send the wrong MIME type, so the file extension counts too. */
export function detectKind(fileName: string, mimeType: string): ResumeKind | null {
  const ext = path.extname(fileName || '').toLowerCase()
  if (mimeType === PDF_MIME || ext === '.pdf') return 'pdf'
  if (mimeType === DOCX_MIME || ext === '.docx') return 'docx'
  if (mimeType === 'text/plain' || ext === '.txt' || ext === '.md') return 'txt'
  return null
}

export async function parseResume(filePath: string, fileName: string, mimeType: string): Promise<string> {
  const kind = detectKind(fileName, mimeType)
  if (!kind) {
    throw new Error('Unsupported file type. Please upload a PDF, DOCX or TXT file.')
  }
  try {
    const raw = kind === 'pdf' ? await parsePDF(filePath) : kind === 'docx' ? await parseDOCX(filePath) : fs.readFileSync(filePath, 'utf-8')
    return normalizeResumeText(raw)
  } catch (err) {
    throw new Error(`Failed to read resume: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

async function parsePDF(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath)
  const result = await PDFParser(buffer, {
    pagerender: async (pageData: any) => {
      const content = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: true })
      let width: number | undefined
      try {
        width = pageData.getViewport(1.0).width
      } catch {
        width = undefined
      }
      return layoutPageText(content.items, width)
    },
  })
  return result.text
}

async function parseDOCX(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath)
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}
