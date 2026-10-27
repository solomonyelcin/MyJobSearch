import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react'
import type { Job } from '../types'

interface JobResultsProps {
  jobs: Job[]
  savedJobs: Job[]
  onToggleSave: (job: Job) => void
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-success-500'
  if (score >= 50) return 'text-warning-500'
  return 'text-danger-500'
}

export default function JobResults({ jobs, profile, savedJobs, onToggleSave }: JobResultsProps) {
  const isSaved = (jobId: string) => savedJobs.some(j => j.id === jobId)

  if (jobs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center">
          <p className="text-slate-600">No jobs found. Try a different search.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h2>Found {jobs.length} Matching Jobs</h2>
        <p className="text-slate-600">Sorted by match score</p>
      </div>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div key={job.id} className="card">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-primary-700">{job.title}</h3>
                <p className="text-slate-600">{job.company} • {job.location}</p>
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${getScoreColor(job.matchScore || 0)}`}>
                  {job.matchScore || 0}%
                </div>
                <p className="text-xs text-slate-500">Match Score</p>
              </div>
            </div>

            {/* Match Score Breakdown */}
            {job.matchBreakdown && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-slate-600">Skills</p>
                    <p className="font-semibold">{job.matchBreakdown.skillMatch}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Experience</p>
                    <p className="font-semibold">{job.matchBreakdown.experienceMatch}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Education</p>
                    <p className="font-semibold">{job.matchBreakdown.educationMatch}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Keywords</p>
                    <p className="font-semibold">{job.matchBreakdown.keywordMatch}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Matched Skills */}
            {job.matchedSkills && job.matchedSkills.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Matched Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {job.matchedSkills.slice(0, 5).map((skill, idx) => (
                    <span key={idx} className="px-2 py-1 bg-success-100 text-success-700 rounded text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                  {job.matchedSkills.length > 5 && (
                    <span className="px-2 py-1 text-xs text-slate-500">+{job.matchedSkills.length - 5} more</span>
                  )}
                </div>
              </div>
            )}

            {/* Description Preview */}
            <p className="text-slate-600 mb-4 line-clamp-2 text-sm">
              {job.description.substring(0, 200)}...
            </p>

            {/* Job Details */}
            <div className="flex gap-2 mb-4 text-sm text-slate-600">
              {job.salary && (
                <span>{job.salary.min && job.salary.max ? `$${job.salary.min}k - $${job.salary.max}k` : 'Salary not specified'}</span>
              )}
              {job.jobType && <span>•</span>}
              {job.jobType && <span className="capitalize">{job.jobType}</span>}
              {job.experienceLevel && <span>•</span>}
              {job.experienceLevel && <span className="capitalize">{job.experienceLevel} Level</span>}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} /> Apply on {job.source}
              </a>
              <button
                onClick={() => onToggleSave(job)}
                className={`btn-secondary flex items-center gap-2 ${isSaved(job.id) ? 'bg-primary-100 text-primary-700' : ''}`}
              >
                {isSaved(job.id) ? (
                  <>
                    <BookmarkCheck size={18} /> Saved
                  </>
                ) : (
                  <>
                    <Bookmark size={18} /> Save
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
