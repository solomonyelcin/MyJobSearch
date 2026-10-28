import { useCallback, useEffect, useRef, useState } from 'react'
import { Bookmark, BookmarkCheck, BrainCircuit, Building2, CheckCircle2, ChevronDown, ExternalLink, MapPin, RefreshCw, Search, Send, Wifi } from 'lucide-react'
import { apiClient } from '../api/client'
import { loadJson, saveJson } from '../lib/storage'
import { ScoreRing, Spinner, formatSalary, timeAgo } from './ui'
import type { DiscoverResult, Job, Profile } from '../types'

interface JobsViewProps {
  profile: Profile
  result: DiscoverResult | null
  onResult: (r: DiscoverResult) => void
  savedIds: Set<string>
  appliedIds: Set<string>
  onToggleSave: (job: Job) => void
  onApply: (job: Job) => void
  aiAvailable: boolean
  title?: string
  jobsOverride?: Job[]
}

const DEFAULT_LOCATION = 'Chennai'
const LOCATION_KEY = 'mjs.location'
const REMOTE_KEY = 'mjs.includeRemote'
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** Plain links that open the search on the big job boards in the user's own browser. */
function siteLinks(role: string, place: string): Array<{ name: string; url: string }> {
  const q = encodeURIComponent(role)
  const city = encodeURIComponent(place)
  return [
    { name: 'Naukri', url: `https://www.naukri.com/${slug(role)}-jobs-in-${slug(place)}` },
    { name: 'LinkedIn', url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${city}` },
    { name: 'Indeed', url: `https://in.indeed.com/jobs?q=${q}&l=${city}` },
    { name: 'foundit (Monster)', url: `https://www.foundit.in/srp/results?query=${q}&locations=${city}` },
  ]
}

const PLACES = ['Chennai', 'Bengaluru', 'Hyderabad', 'Mumbai', 'Pune', 'Delhi NCR', 'Remote']

const SOURCE_LABEL: Record<string, string> = {
  company: 'Careers page', remotive: 'Remotive', arbeitnow: 'Arbeitnow', remoteok: 'RemoteOK', jobicy: 'Jobicy', adzuna: 'Adzuna', 'ai-web': 'AI web search', other: 'Web',
}

function JobCard({ job, saved, applied, onToggleSave, onApply }: { job: Job; saved: boolean; applied: boolean; onToggleSave: () => void; onApply: () => void }) {
  const [open, setOpen] = useState(false)
  const salary = formatSalary(job)
  const posted = timeAgo(job.postedDate)
  return (
    <article className="card card-hover animate-slideUp">
      <div className="flex gap-3 sm:gap-4">
        <ScoreRing score={job.matchScore || 0} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="leading-snug text-slate-900">{job.title}</h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1"><Building2 size={14} />{job.company}</span>
                {job.location && <span className="inline-flex items-center gap-1"><MapPin size={14} />{job.location}</span>}
              </p>
            </div>
            <button onClick={onToggleSave} className="btn-ghost !p-2 shrink-0" aria-label={saved ? 'Remove from saved' : 'Save job'} aria-pressed={saved}>
              {saved ? <BookmarkCheck size={19} className="text-primary-600" /> : <Bookmark size={19} />}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {job.remote && <span className="chip"><Wifi size={12} /> Remote</span>}
            {salary && <span className="chip">{salary}</span>}
            {job.jobType && <span className="chip capitalize">{job.jobType}</span>}
            {posted && <span className="chip">{posted}</span>}
            <span className="chip">{SOURCE_LABEL[job.source] || job.source}</span>
            {job.aiScored && <span className="chip-primary"><BrainCircuit size={12} /> AI scored</span>}
          </div>
        </div>
      </div>

      {job.aiReason && <p className="mt-3 rounded-xl bg-primary-50 px-3 py-2 text-sm text-primary-900">{job.aiReason}</p>}

      {((job.matchedSkills?.length ?? 0) > 0 || (job.missingSkills?.length ?? 0) > 0) && (
        <div className="mt-3 space-y-1.5">
          {(job.matchedSkills?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 w-full sm:w-auto">You have</span>
              {job.matchedSkills!.slice(0, 8).map(s => <span key={s} className="chip-success">{s}</span>)}
            </div>
          )}
          {(job.missingSkills?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 w-full sm:w-auto">Gaps</span>
              {job.missingSkills!.slice(0, 5).map(s => <span key={s} className="chip-warning">{s}</span>)}
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="mt-3 animate-fadeIn text-sm leading-relaxed text-slate-600">
          {job.matchBreakdown && (
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([['Skills', job.matchBreakdown.skillMatch], ['Title', job.matchBreakdown.titleMatch], ['Experience', job.matchBreakdown.experienceMatch], ['Location', job.matchBreakdown.locationMatch]] as const).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-2">
                  <div className="flex justify-between text-xs text-slate-500"><span>{k}</span><span className="font-semibold text-slate-700">{v}%</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-primary-500" style={{ width: `${v}%` }} /></div>
                </div>
              ))}
            </div>
          )}
          {job.aiPros?.length ? <p className="mb-1"><span className="font-semibold text-success-700">Strengths: </span>{job.aiPros.join(' · ')}</p> : null}
          {job.aiGaps?.length ? <p className="mb-2"><span className="font-semibold text-warning-700">Gaps: </span>{job.aiGaps.join(' · ')}</p> : null}
          <p className="whitespace-pre-line">{job.description.slice(0, 900)}{job.description.length > 900 ? '…' : ''}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className="btn-primary flex-1 sm:flex-none" onClick={onApply}>
          {applied ? <CheckCircle2 size={16} /> : <Send size={16} />} {applied ? 'Applied · view kit' : 'AI apply'}
        </button>
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 sm:flex-none"><ExternalLink size={16} /> View posting</a>
        <button className="btn-ghost ml-auto" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          Details <ChevronDown size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </article>
  )
}

export default function JobsView({ profile, result, onResult, savedIds, appliedIds, onToggleSave, onApply, aiAvailable, title, jobsOverride }: JobsViewProps) {
  const [query, setQuery] = useState('')
  // Chennai unless the user picked something else (remembered between visits)
  const [location, setLocation] = useState(() => loadJson<string>(LOCATION_KEY, DEFAULT_LOCATION) || DEFAULT_LOCATION)
  const [includeRemote, setIncludeRemote] = useState(() => loadJson<boolean>(REMOTE_KEY, false))
  const [useAI, setUseAI] = useState(aiAvailable)
  const [minScore, setMinScore] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const started = useRef(false)

  useEffect(() => { setUseAI(aiAvailable) }, [aiAvailable])

  const search = useCallback(async (override?: { location?: string; includeRemote?: boolean }) => {
    const place = (override?.location ?? location).trim() || DEFAULT_LOCATION
    const withRemote = override?.includeRemote ?? includeRemote
    setLoading(true)
    setError('')
    saveJson(LOCATION_KEY, place)
    saveJson(REMOTE_KEY, withRemote)
    try {
      const data = await apiClient.discoverJobs({ profile, query: query.trim() || undefined, location: place, includeRemote: withRemote, useAI })
      onResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find jobs')
    } finally {
      setLoading(false)
    }
  }, [profile, query, location, includeRemote, useAI, onResult])

  useEffect(() => {
    if (jobsOverride || started.current || result) return
    started.current = true
    void search()
  }, [jobsOverride, result, search])

  const all = jobsOverride ?? result?.jobs ?? []
  const jobs = all.filter(j => (j.matchScore || 0) >= minScore)
  const shownPlace = result?.meta.location || location

  return (
    <div className="mx-auto max-w-4xl space-y-4 animate-fadeIn">
      <div>
        <h2>{title || 'Your best matches'}</h2>
        {!jobsOverride && (
          <p className="text-sm text-slate-500">
            Jobs in <span className="font-semibold text-slate-700">{shownPlace}</span>{result?.meta.includeRemote ? ' and remote' : ' only'}, matched to your resume.
          </p>
        )}
      </div>

      {!jobsOverride && (
        <form onSubmit={e => { e.preventDefault(); void search() }} className="card !p-3 sm:!p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <label className="label" htmlFor="q">Role</label>
              <input id="q" value={query} onChange={e => setQuery(e.target.value)} placeholder={profile.headline || 'Auto from your resume'} className="input-base" disabled={loading} />
            </div>
            <div>
              <label className="label" htmlFor="loc">Location</label>
              <input id="loc" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, e.g. Chennai" className="input-base" disabled={loading} list="places" autoComplete="off" />
              <datalist id="places">{PLACES.map(p => <option key={p} value={p} />)}</datalist>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading}>
                {loading ? <Spinner /> : result ? <RefreshCw size={16} /> : <Search size={16} />} {loading ? 'Searching…' : result ? 'Search again' : 'Search'}
              </button>
            </div>
          </div>
          <div className="-mx-1 flex flex-wrap gap-1.5" role="group" aria-label="Quick locations">
            {PLACES.map(p => (
              <button key={p} type="button" disabled={loading}
                onClick={() => { setLocation(p); void search({ location: p }) }}
                aria-pressed={location.trim().toLowerCase() === p.toLowerCase()}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${location.trim().toLowerCase() === p.toLowerCase() ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'}`}>{p}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <label className="inline-flex items-center gap-2"><input type="checkbox" className="h-4 w-4 rounded accent-primary-600" checked={includeRemote} onChange={e => setIncludeRemote(e.target.checked)} /> Also include remote jobs</label>
            <label className={`inline-flex items-center gap-2 ${aiAvailable ? '' : 'opacity-50'}`} title={aiAvailable ? '' : 'Add ANTHROPIC_API_KEY on the server to enable'}>
              <input type="checkbox" className="h-4 w-4 rounded accent-primary-600" checked={useAI && aiAvailable} disabled={!aiAvailable} onChange={e => setUseAI(e.target.checked)} />
              <BrainCircuit size={15} className="text-primary-600" /> AI web search &amp; ranking
            </label>
          </div>
        </form>
      )}

      {error && <div role="alert" className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</div>}

      {!jobsOverride && result && result.meta.notices.length > 0 && (
        <div className="rounded-2xl border border-warning-100 bg-warning-50 p-4 text-sm text-warning-700" role="status">
          <ul className="list-disc space-y-1 pl-5">{result.meta.notices.map(n => <li key={n}>{n}</li>)}</ul>
        </div>
      )}

      {all.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0" role="group" aria-label="Minimum match score">
          {[[0, 'All'], [50, '50%+'], [70, '70%+'], [85, '85%+']].map(([v, l]) => (
            <button key={v} onClick={() => setMinScore(Number(v))} aria-pressed={minScore === v}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${minScore === v ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'}`}>{l}</button>
          ))}
          <span className="ml-auto shrink-0 self-center text-sm text-slate-400">{jobs.length} job{jobs.length === 1 ? '' : 's'}</span>
        </div>
      )}

      {loading && all.length === 0 && (
        <div className="space-y-4" aria-busy="true" aria-label="Searching jobs">
          {[0, 1, 2].map(i => (
            <div key={i} className="card flex gap-4"><div className="skeleton h-16 w-16 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-5 w-2/3" /><div className="skeleton h-4 w-1/2" /><div className="skeleton h-4 w-3/4" /></div></div>
          ))}
          <p className="text-center text-sm text-slate-500">Searching job boards and scoring matches…</p>
        </div>
      )}

      {!loading && all.length === 0 && !error && (
        <div className="card text-center text-slate-500">{jobsOverride ? 'Nothing saved yet. Tap the bookmark on a job to keep it here.' : `No jobs found in ${shownPlace}. Try another city above, or tick "Also include remote jobs".`}</div>
      )}

      <div className="space-y-4">
        {jobs.map(job => (
          <JobCard key={job.id} job={job} saved={savedIds.has(job.id)} applied={appliedIds.has(job.id)} onToggleSave={() => onToggleSave(job)} onApply={() => onApply(job)} />
        ))}
      </div>

      {!jobsOverride && (
        <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm">
          <p className="mb-2 font-medium text-slate-700">Also search on other job sites</p>
          <div className="flex flex-wrap gap-2">
            {siteLinks(query.trim() || profile.headline || profile.experience[0]?.title || 'software engineer', result?.meta.location || location).map(l => (
              <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm"><ExternalLink size={13} /> {l.name}</a>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">These open in a new tab, using your own browser and login.</p>
        </div>
      )}

      {result && !jobsOverride && (
        <details className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium">How these were found</summary>
          <p className="mt-2">Searched for: {result.meta.queries.join(', ')} in {result.meta.location} · {result.meta.total} postings in {(result.meta.durationMs / 1000).toFixed(1)}s</p>
          <ul className="mt-2 space-y-1">
            {result.meta.sources.map(s => (
              <li key={s.name} className="flex justify-between gap-3"><span>{s.name}</span><span className={s.error ? 'text-danger-600' : 'text-slate-500'}>{s.error ? `unavailable (${s.error})` : `${s.count} found`}</span></li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
