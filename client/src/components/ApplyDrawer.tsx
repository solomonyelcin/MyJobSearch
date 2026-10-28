import { useEffect, useState } from 'react'
import { CheckCircle2, Download, ExternalLink, Lightbulb, Sparkles, X } from 'lucide-react'
import { apiClient } from '../api/client'
import { CopyButton, Spinner } from './ui'
import type { ApplicationKit, Job, Profile } from '../types'

interface ApplyDrawerProps {
  job: Job
  profile: Profile
  applied: boolean
  onMarkApplied: (job: Job) => void
  onClose: () => void
}

export default function ApplyDrawer({ job, profile, applied, onMarkApplied, onClose }: ApplyDrawerProps) {
  const [kit, setKit] = useState<ApplicationKit | null>(null)
  const [error, setError] = useState('')
  const [letter, setLetter] = useState('')

  useEffect(() => {
    let cancelled = false
    setKit(null)
    setError('')
    apiClient
      .applyKit(profile, job)
      .then(k => {
        if (cancelled) return
        setKit(k)
        setLetter(k.coverLetter)
      })
      .catch(err => !cancelled && setError(err instanceof Error ? err.message : 'Could not prepare the application'))
    return () => { cancelled = true }
  }, [job, profile])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const download = () => {
    const blob = new Blob([letter], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cover-letter-${job.company.replace(/\W+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const allFields = kit ? kit.fields.map(f => `${f.label}: ${f.value}`).join('\n') : ''

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Apply to ${job.title}`}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-sheet sm:max-w-3xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-600"><Sparkles size={13} /> AI application kit</p>
            <h3 className="truncate text-lg">{job.title}</h3>
            <p className="truncate text-sm text-slate-500">{job.company}{job.location ? ` · ${job.location}` : ''}</p>
          </div>
          <button onClick={onClose} className="btn-ghost !p-2" aria-label="Close"><X size={20} /></button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6">
          {!kit && !error && (
            <div className="space-y-3" aria-busy="true">
              <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Tailoring your application to this job…</p>
              {[80, 100, 60, 90].map((w, i) => <div key={i} className="skeleton h-4" style={{ width: `${w}%` }} />)}
              <div className="skeleton h-40 w-full" />
            </div>
          )}
          {error && <div role="alert" className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div>}

          {kit && (
            <>
              {kit.generatedBy === 'template' && (
                <div className="rounded-xl border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700">
                  Basic template used. Connect an Anthropic API key on the server to get AI-written, job-specific content.
                </div>
              )}

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="font-semibold">Autofill details</h4>
                  <CopyButton text={allFields} label="Copy all" />
                </div>
                <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {kit.fields.map(f => (
                    <div key={f.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{f.label}</dt>
                        <dd className="break-words text-sm">{f.value}</dd>
                      </div>
                      <CopyButton text={f.value} label="" className="!px-2" />
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="font-semibold">Cover letter</h4>
                  <div className="flex gap-2">
                    <CopyButton text={letter} />
                    <button className="btn-secondary btn-sm" onClick={download}><Download size={14} /> .txt</button>
                  </div>
                </div>
                <textarea value={letter} onChange={e => setLetter(e.target.value)} rows={11} className="input-base leading-relaxed" aria-label="Cover letter" />
                <p className="mt-1 text-xs text-slate-400">Edit freely. Review it before sending.</p>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="font-semibold">Tailored summary</h4>
                  <CopyButton text={kit.summary} />
                </div>
                <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed">{kit.summary}</p>
              </section>

              {kit.answers.length > 0 && (
                <section>
                  <h4 className="mb-2 font-semibold">Likely application questions</h4>
                  <div className="space-y-3">
                    {kit.answers.map((a, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{a.question}</p>
                          <CopyButton text={a.answer} label="" className="!px-2" />
                        </div>
                        <p className="text-sm leading-relaxed text-slate-600">{a.answer}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {kit.resumeBullets.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="font-semibold">Resume bullets to emphasise</h4>
                    <CopyButton text={kit.resumeBullets.map(b => `• ${b}`).join('\n')} />
                  </div>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{kit.resumeBullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                </section>
              )}

              {kit.tips.length > 0 && (
                <section className="rounded-xl bg-primary-50 p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold text-primary-800"><Lightbulb size={16} /> Tips</h4>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-primary-900">{kit.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </section>
              )}
            </>
          )}
        </div>

        <footer className="border-t border-slate-100 bg-white px-4 py-3 pb-safe sm:px-6">
          <p className="mb-2 text-xs text-slate-400">Employer sites require you to submit the form yourself. Open it, paste these in, and send.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1">
              <ExternalLink size={16} /> Open application page
            </a>
            <button className={applied ? 'btn-secondary flex-1 !text-success-700' : 'btn-secondary flex-1'} onClick={() => onMarkApplied(job)} disabled={applied}>
              <CheckCircle2 size={16} /> {applied ? 'Marked as applied' : 'Mark as applied'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
