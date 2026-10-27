import { useState } from 'react'
import { Search, Loader } from 'lucide-react'
import { apiClient } from '../api/client'
import type { Profile, Job } from '../types'

interface JobSearchProps {
  profile: Profile
  onJobsFound: (jobs: Job[]) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

export default function JobSearch({ profile, onJobsFound, isLoading, setIsLoading }: JobSearchProps) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || !location.trim()) {
      setError('Please enter both job title and location')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const jobs = await apiClient.searchJobs({ query, location })
      const matched = await apiClient.calculateMatches(profile, jobs)
      onJobsFound(matched.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search jobs')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2>Search Jobs</h2>
        <p className="text-slate-600 mb-6">Find jobs that match your skills and experience</p>

        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Job Title</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., React Developer, Product Manager"
              className="input-base"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., San Francisco, Remote"
              className="input-base"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader size={18} className="animate-spin" />
            ) : (
              <Search size={18} />
            )}
            {isLoading ? 'Searching Jobs...' : 'Search Jobs'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
