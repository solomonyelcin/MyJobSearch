import { useState } from 'react'
import { FileUp, Briefcase, BarChart3, Bookmark } from 'lucide-react'
import ResumeUpload from './components/ResumeUpload'
import ProfileDisplay from './components/ProfileDisplay'
import JobSearch from './components/JobSearch'
import JobResults from './components/JobResults'
import Dashboard from './components/Dashboard'
import type { Profile, Job } from './types'

type View = 'upload' | 'profile' | 'search' | 'results' | 'dashboard' | 'saved'

export default function App() {
  const [view, setView] = useState<View>('upload')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [savedJobs, setSavedJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleProfileExtracted = (extractedProfile: Profile) => {
    setProfile(extractedProfile)
    setView('profile')
  }

  const handleProfileUpdated = (updatedProfile: Profile) => {
    setProfile(updatedProfile)
  }

  const handleJobsFound = (foundJobs: Job[]) => {
    setJobs(foundJobs)
    setView('results')
  }

  const toggleSaveJob = (job: Job) => {
    const isSaved = savedJobs.some(j => j.id === job.id)
    if (isSaved) {
      setSavedJobs(savedJobs.filter(j => j.id !== job.id))
    } else {
      setSavedJobs([...savedJobs, job])
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary-600">Job Search Intelligence</h1>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setView('upload')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                  view === 'upload' ? 'bg-primary-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <FileUp size={18} /> Resume
              </button>
              {profile && (
                <>
                  <button
                    onClick={() => setView('profile')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                      view === 'profile' ? 'bg-primary-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setView('search')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                      view === 'search' ? 'bg-primary-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <Briefcase size={18} /> Search
                  </button>
                  <button
                    onClick={() => setView('dashboard')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                      view === 'dashboard' ? 'bg-primary-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <BarChart3 size={18} /> Analytics
                  </button>
                  {savedJobs.length > 0 && (
                    <button
                      onClick={() => setView('saved')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                        view === 'saved' ? 'bg-primary-600 text-white' : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      <Bookmark size={18} /> Saved ({savedJobs.length})
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'upload' && (
          <ResumeUpload onProfileExtracted={handleProfileExtracted} />
        )}
        {view === 'profile' && profile && (
          <ProfileDisplay profile={profile} onProfileUpdated={handleProfileUpdated} />
        )}
        {view === 'search' && profile && (
          <JobSearch
            profile={profile}
            onJobsFound={handleJobsFound}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
        {view === 'results' && profile && (
          <JobResults
            jobs={jobs}
            profile={profile}
            savedJobs={savedJobs}
            onToggleSave={toggleSaveJob}
          />
        )}
        {view === 'dashboard' && profile && (
          <Dashboard jobs={jobs} profile={profile} />
        )}
        {view === 'saved' && (
          <JobResults
            jobs={savedJobs}
            profile={profile}
            savedJobs={savedJobs}
            onToggleSave={toggleSaveJob}
          />
        )}
      </main>
    </div>
  )
}
