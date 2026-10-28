import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Bookmark, Briefcase, CheckCircle2, FileUp, RotateCcw, Sparkles, UserRound } from 'lucide-react'
import ResumeUpload from './components/ResumeUpload'
import ProfileDisplay from './components/ProfileDisplay'
import JobsView from './components/JobsView'
import Dashboard from './components/Dashboard'
import ApplyDrawer from './components/ApplyDrawer'
import { apiClient } from './api/client'
import { loadJson, removeKey, saveJson } from './lib/storage'
import type { DiscoverResult, Job, Profile } from './types'

type View = 'upload' | 'profile' | 'jobs' | 'saved' | 'insights'

const KEYS = { profile: 'mjs.profile', saved: 'mjs.saved', applied: 'mjs.applied' }

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(() => loadJson<Profile | null>(KEYS.profile, null))
  const [view, setView] = useState<View>(() => (loadJson<Profile | null>(KEYS.profile, null) ? 'jobs' : 'upload'))
  const [result, setResult] = useState<DiscoverResult | null>(null)
  const [saved, setSaved] = useState<Job[]>(() => loadJson<Job[]>(KEYS.saved, []))
  const [applied, setApplied] = useState<Job[]>(() => loadJson<Job[]>(KEYS.applied, []))
  const [applyJob, setApplyJob] = useState<Job | null>(null)
  const [aiAvailable, setAiAvailable] = useState(false)

  useEffect(() => {
    apiClient.aiStatus().then(s => setAiAvailable(s.ai)).catch(() => setAiAvailable(false))
  }, [])

  useEffect(() => { if (profile) saveJson(KEYS.profile, profile) }, [profile])
  useEffect(() => saveJson(KEYS.saved, saved), [saved])
  useEffect(() => saveJson(KEYS.applied, applied), [applied])

  const savedIds = useMemo(() => new Set(saved.map(j => j.id)), [saved])
  const appliedIds = useMemo(() => new Set(applied.map(j => j.id)), [applied])

  const handleProfileExtracted = (p: Profile) => {
    setProfile(p)
    setResult(null)
    setView('profile')
    window.scrollTo({ top: 0 })
  }

  const handleProfileUpdated = (p: Profile) => {
    setProfile(p)
    setResult(null) // matches depend on the profile
  }

  const toggleSave = useCallback((job: Job) => {
    setSaved(list => (list.some(j => j.id === job.id) ? list.filter(j => j.id !== job.id) : [job, ...list]))
  }, [])

  const markApplied = useCallback((job: Job) => {
    setApplied(list => (list.some(j => j.id === job.id) ? list : [job, ...list]))
  }, [])

  const startOver = () => {
    removeKey(KEYS.profile)
    setProfile(null)
    setResult(null)
    setView('upload')
  }

  const goto = (v: View) => {
    setView(v)
    window.scrollTo({ top: 0 })
  }

  const nav: Array<{ id: View; label: string; icon: typeof FileUp; needsProfile: boolean; badge?: number }> = [
    { id: 'jobs', label: 'Matches', icon: Briefcase, needsProfile: true },
    { id: 'saved', label: 'Saved', icon: Bookmark, needsProfile: true, badge: saved.length },
    { id: 'insights', label: 'Insights', icon: BarChart3, needsProfile: true },
    { id: 'profile', label: 'Profile', icon: UserRound, needsProfile: true },
    { id: 'upload', label: 'Resume', icon: FileUp, needsProfile: false },
  ]
  const items = nav.filter(n => !n.needsProfile || profile)

  return (
    <div className="min-h-dvh pb-20 sm:pb-0">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <button onClick={() => goto(profile ? 'jobs' : 'upload')} className="flex items-center gap-2.5" aria-label="MyJobSearch home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-sm"><Sparkles size={18} /></span>
            <span className="text-lg font-bold tracking-tight">MyJob<span className="gradient-text">Search</span></span>
          </button>

          <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
            {items.map(({ id, label, icon: Icon, badge }) => (
              <button key={id} onClick={() => goto(id)} aria-current={view === id ? 'page' : undefined}
                className={`relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${view === id ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon size={16} /> {label}
                {badge ? <span className="rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">{badge}</span> : null}
              </button>
            ))}
          </nav>

          {profile && (
            <button onClick={startOver} className="btn-ghost btn-sm" title="Remove this resume and start over"><RotateCcw size={14} /> <span className="hidden sm:inline">Start over</span></button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        {view === 'upload' && <ResumeUpload onProfileExtracted={handleProfileExtracted} />}
        {view === 'profile' && profile && <ProfileDisplay profile={profile} onProfileUpdated={handleProfileUpdated} onFindJobs={() => goto('jobs')} />}
        {view === 'jobs' && profile && (
          <JobsView profile={profile} result={result} onResult={setResult} savedIds={savedIds} appliedIds={appliedIds} onToggleSave={toggleSave} onApply={setApplyJob} aiAvailable={aiAvailable} />
        )}
        {view === 'saved' && profile && (
          <JobsView profile={profile} result={result} onResult={setResult} savedIds={savedIds} appliedIds={appliedIds} onToggleSave={toggleSave} onApply={setApplyJob} aiAvailable={aiAvailable} title="Saved jobs" jobsOverride={saved} />
        )}
        {view === 'insights' && profile && (
          <>
            {applied.length > 0 && (
              <div className="mx-auto mb-4 flex max-w-4xl items-center gap-2 rounded-2xl border border-success-100 bg-success-50 px-4 py-3 text-sm text-success-700">
                <CheckCircle2 size={16} /> You've marked {applied.length} job{applied.length === 1 ? '' : 's'} as applied.
              </div>
            )}
            <Dashboard jobs={result?.jobs || saved} profile={profile} />
          </>
        )}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur sm:hidden" aria-label="Main">
        <div className="mx-auto flex max-w-md justify-around px-2 pt-1.5">
          {items.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => goto(id)} aria-current={view === id ? 'page' : undefined}
              className={`relative flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium ${view === id ? 'text-primary-700' : 'text-slate-500'}`}>
              <Icon size={20} />
              {label}
              {badge ? <span className="absolute right-1 top-0 rounded-full bg-primary-600 px-1.5 text-[9px] font-bold text-white">{badge}</span> : null}
            </button>
          ))}
        </div>
      </nav>

      {applyJob && profile && (
        <ApplyDrawer job={applyJob} profile={profile} applied={appliedIds.has(applyJob.id)} onMarkApplied={markApplied} onClose={() => setApplyJob(null)} />
      )}
    </div>
  )
}
