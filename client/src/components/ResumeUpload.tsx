import { useState } from 'react'
import { FileText, ShieldCheck, Sparkles, Target, Upload, Wand2 } from 'lucide-react'
import { apiClient } from '../api/client'
import { Spinner } from './ui'
import type { Profile } from '../types'

interface ResumeUploadProps {
  onProfileExtracted: (profile: Profile) => void
}

const ALLOWED_EXT = ['.pdf', '.docx', '.txt']

export default function ResumeUpload({ onProfileExtracted }: ResumeUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [mode, setMode] = useState<'file' | 'paste'>('file')
  const [pasted, setPasted] = useState('')

  const run = async (task: () => Promise<Profile>) => {
    setIsLoading(true)
    setError('')
    try {
      onProfileExtracted(await task())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process resume')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFile = (file: File) => {
    const name = file.name.toLowerCase()
    if (!ALLOWED_EXT.some(ext => name.endsWith(ext))) {
      setError('Only PDF, DOCX and TXT files are supported.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File is larger than 5 MB.')
      return
    }
    void run(() => apiClient.uploadResume(file))
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && !isLoading) handleFile(file)
  }

  return (
    <div className="mx-auto max-w-3xl animate-fadeIn">
      <div className="text-center mb-8 sm:mb-10">
        <span className="chip-primary mb-4">
          <Sparkles size={14} /> AI-powered job matching
        </span>
        <h1>
          Find jobs that fit <span className="gradient-text">your real resume</span>
        </h1>
        <p className="mt-3 text-slate-600 text-base sm:text-lg max-w-xl mx-auto">
          Upload your resume once. We read it, search live job boards for you, rank the best matches and prepare each application.
        </p>
      </div>

      <div className="card !p-3 sm:!p-4">
        <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1 text-sm font-medium" role="tablist">
          {(['file', 'paste'] as const).map(m => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setError('') }}
              className={`rounded-lg px-4 py-1.5 transition ${mode === m ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {m === 'file' ? 'Upload file' : 'Paste text'}
            </button>
          ))}
        </div>

        {mode === 'file' ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed px-4 py-10 sm:py-14 text-center transition ${
              dragActive ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-300 hover:bg-primary-50/40'
            } ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
          >
            <input
              type="file"
              id="resume-input"
              className="sr-only"
              accept=".pdf,.docx,.txt"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ''
              }}
              disabled={isLoading}
            />
            <label htmlFor="resume-input" className="block">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-lift">
                {isLoading ? <Spinner size={24} /> : <Upload size={26} />}
              </div>
              <p className="text-base sm:text-lg font-semibold">
                {isLoading ? 'Reading your resume…' : 'Drop your resume here, or tap to browse'}
              </p>
              <p className="mt-1 text-sm text-slate-500">PDF, DOCX or TXT · up to 5 MB</p>
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <label htmlFor="paste" className="label">Resume text</label>
            <textarea
              id="paste"
              value={pasted}
              onChange={e => setPasted(e.target.value)}
              rows={10}
              placeholder="Paste the full text of your resume here…"
              className="input-base font-mono text-[13px] leading-relaxed"
              disabled={isLoading}
            />
            <button
              className="btn-primary w-full sm:w-auto"
              disabled={isLoading || pasted.trim().length < 40}
              onClick={() => void run(() => apiClient.extractProfile(pasted))}
            >
              {isLoading ? <Spinner /> : <Wand2 size={16} />} Analyse resume
            </button>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { icon: FileText, title: 'Accurate parsing', text: 'Reads columns, dates, skills and education, then lets you correct anything.' },
          { icon: Target, title: 'Live matches', text: 'Searches job boards and ranks roles against your skills and seniority.' },
          { icon: ShieldCheck, title: 'Apply faster', text: 'Cover letter, answers and autofill details prepared for each job.' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
            <Icon size={20} className="mb-2 text-primary-600" />
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
