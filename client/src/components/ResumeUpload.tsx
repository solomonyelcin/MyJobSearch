import { useState } from 'react'
import { Upload, Loader } from 'lucide-react'
import { apiClient } from '../api/client'
import type { Profile } from '../types'

interface ResumeUploadProps {
  onProfileExtracted: (profile: Profile) => void
}

export default function ResumeUpload({ onProfileExtracted }: ResumeUploadProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const handleFile = async (file: File) => {
    if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].includes(file.type)) {
      setError('Only PDF, DOCX, and TXT files are supported')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const profile = await apiClient.uploadResume(file)
      onProfileExtracted(profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process resume')
    } finally {
      setIsLoading(false)
    }
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
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2>Upload Your Resume</h2>
        <p className="text-slate-600 mb-6">Upload your resume to extract skills and find matching opportunities</p>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
            dragActive ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-slate-400'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <input
            type="file"
            id="resume-input"
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            disabled={isLoading}
          />
          <label htmlFor="resume-input" className="cursor-pointer">
            {isLoading ? (
              <Loader className="mx-auto mb-4 animate-spin" size={32} />
            ) : (
              <Upload className="mx-auto mb-4 text-slate-400" size={32} />
            )}
            <p className="text-lg font-medium mb-1">
              {isLoading ? 'Processing your resume...' : 'Drag your resume here or click to upload'}
            </p>
            <p className="text-sm text-slate-500">Supports PDF, DOCX, and TXT (max 5MB)</p>
          </label>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
