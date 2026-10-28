import { useState } from 'react'
import { AlertTriangle, Briefcase, GraduationCap, Plus, Search, Trash2, X } from 'lucide-react'
import { apiClient } from '../api/client'
import { Spinner } from './ui'
import type { Education, Experience, Profile } from '../types'

interface ProfileDisplayProps {
  profile: Profile
  onProfileUpdated: (profile: Profile) => void
  onFindJobs: () => void
}

const field = (label: string, value: string, onChange: (v: string) => void, opts: { type?: string; placeholder?: string; wide?: boolean } = {}) => (
  <div className={opts.wide ? 'sm:col-span-2' : ''}>
    <label className="label">{label}</label>
    <input
      type={opts.type || 'text'}
      value={value}
      placeholder={opts.placeholder}
      onChange={e => onChange(e.target.value)}
      className="input-base"
    />
  </div>
)

function recomputeYears(p: Profile): Profile {
  return { ...p, totalYears: p.experience.reduce((a, e) => a + (e.years || 0), 0) || p.totalYears }
}

export default function ProfileDisplay({ profile, onProfileUpdated, onFindJobs }: ProfileDisplayProps) {
  const [draft, setDraft] = useState<Profile>(profile)
  const [newSkill, setNewSkill] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (patch: Partial<Profile>) => {
    setDraft(d => ({ ...d, ...patch }))
    setSaved(false)
  }

  const updateExp = (i: number, patch: Partial<Experience>) => update({ experience: draft.experience.map((e, k) => (k === i ? { ...e, ...patch } : e)) })
  const updateEdu = (i: number, patch: Partial<Education>) => update({ education: draft.education.map((e, k) => (k === i ? { ...e, ...patch } : e)) })

  const addSkill = () => {
    const name = newSkill.trim()
    if (!name || draft.skills.some(s => s.name.toLowerCase() === name.toLowerCase())) return setNewSkill('')
    update({ skills: [{ name }, ...draft.skills] })
    setNewSkill('')
  }

  const persist = async (): Promise<Profile> => {
    const next = recomputeYears(draft)
    setSaving(true)
    try {
      const updated = await apiClient.updateProfile(next)
      const merged = { ...next, ...updated, rawText: next.rawText }
      onProfileUpdated(merged)
      setSaved(true)
      return merged
    } catch {
      // The server copy is only a convenience; the edited profile is kept locally either way.
      onProfileUpdated(next)
      setSaved(true)
      return next
    } finally {
      setSaving(false)
    }
  }

  const warnings = (profile.extractionWarnings || []).filter(w => !/phone/i.test(w) || !draft.phone)

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6 animate-fadeIn pb-24 sm:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2>Review your profile</h2>
          <p className="text-sm text-slate-500">
            {profile.extractionMethod === 'ai' ? 'Read with AI and verified against your resume text.' : 'Read from your resume.'} Fix anything that looks off. Better data means better matches.
          </p>
        </div>
        <button onClick={async () => { const p = await persist(); onProfileUpdated(p); onFindJobs() }} className="btn-primary hidden sm:inline-flex" disabled={saving}>
          {saving ? <Spinner /> : <Search size={16} />} Save &amp; find jobs
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-warning-100 bg-warning-50 p-4 text-sm text-warning-700" role="status">
          <p className="mb-1 flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> Please double-check</p>
          <ul className="list-disc pl-5 space-y-0.5">{warnings.map(w => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      <section className="card">
        <h3 className="mb-4">Basic information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('Full name', draft.name || '', v => update({ name: v }))}
          {field('Headline / current role', draft.headline || '', v => update({ headline: v }))}
          {field('Email', draft.email || '', v => update({ email: v }), { type: 'email' })}
          {field('Phone', draft.phone || '', v => update({ phone: v }), { type: 'tel' })}
          {field('Location', draft.location || '', v => update({ location: v }), { placeholder: 'City, Country' })}
          <div>
            <label className="label">Total experience (years)</label>
            <input
              type="number" min={0} step={0.5} inputMode="decimal"
              value={draft.totalYears ?? ''}
              onChange={e => update({ totalYears: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="input-base"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Summary</label>
            <textarea value={draft.summary || ''} onChange={e => update({ summary: e.target.value })} rows={3} className="input-base" />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3>Skills <span className="text-slate-400 font-normal">({draft.skills.length})</span></h3>
        </div>
        <form onSubmit={e => { e.preventDefault(); addSkill() }} className="mb-4 flex gap-2">
          <input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="Add a skill, e.g. Kubernetes" className="input-base" aria-label="Add a skill" />
          <button type="submit" className="btn-secondary shrink-0"><Plus size={16} /> Add</button>
        </form>
        {draft.skills.length === 0 && <p className="text-sm text-slate-500">No skills detected yet. Add the ones you use.</p>}
        <div className="flex flex-wrap gap-2">
          {draft.skills.map(s => (
            <span key={s.name} className="chip-primary pr-1">
              {s.name}{s.years ? <span className="text-primary-400">· {s.years}y</span> : null}
              <button
                onClick={() => update({ skills: draft.skills.filter(x => x.name !== s.name) })}
                className="ml-0.5 rounded-full p-0.5 hover:bg-primary-100" aria-label={`Remove ${s.name}`}
              ><X size={12} /></button>
            </span>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2"><Briefcase size={18} className="text-primary-600" /> Experience</h3>
          <button className="btn-secondary btn-sm" onClick={() => update({ experience: [...draft.experience, { title: '', company: '', years: 0 }] })}><Plus size={14} /> Add</button>
        </div>
        {draft.experience.length === 0 && <p className="text-sm text-slate-500">No work history detected. Add your roles so we can match seniority.</p>}
        <div className="space-y-4">
          {draft.experience.map((e, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Job title', e.title, v => updateExp(i, { title: v }))}
                {field('Company', e.company, v => updateExp(i, { company: v }))}
                {field('Start', e.startDate || '', v => updateExp(i, { startDate: v }), { placeholder: '2020-01' })}
                {field('End (blank = present)', e.endDate || '', v => updateExp(i, { endDate: v, current: v ? undefined : true }), { placeholder: '2023-06' })}
                <div className="sm:col-span-2">
                  <label className="label">Highlights</label>
                  <textarea value={e.description || ''} rows={3} onChange={ev => updateExp(i, { description: ev.target.value, bullets: ev.target.value.split('\n').filter(Boolean) })} className="input-base text-[13px]" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{e.years ? `${e.years} yrs` : ''}</span>
                <button className="inline-flex items-center gap-1 text-danger-600 hover:underline" onClick={() => update({ experience: draft.experience.filter((_, k) => k !== i) })}><Trash2 size={13} /> Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2"><GraduationCap size={18} className="text-primary-600" /> Education</h3>
          <button className="btn-secondary btn-sm" onClick={() => update({ education: [...draft.education, { degree: '', institution: '' }] })}><Plus size={14} /> Add</button>
        </div>
        {draft.education.length === 0 && <p className="text-sm text-slate-500">No education detected.</p>}
        <div className="space-y-4">
          {draft.education.map((e, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {field('Degree', e.degree, v => updateEdu(i, { degree: v }))}
                {field('Field of study', e.field || '', v => updateEdu(i, { field: v }))}
                {field('Institution', e.institution, v => updateEdu(i, { institution: v }))}
                {field('Graduation year', e.graduationYear ? String(e.graduationYear) : '', v => updateEdu(i, { graduationYear: v ? Number(v) || undefined : undefined }), { type: 'number' })}
              </div>
              <button className="mt-3 inline-flex items-center gap-1 text-xs text-danger-600 hover:underline" onClick={() => update({ education: draft.education.filter((_, k) => k !== i) })}><Trash2 size={13} /> Remove</button>
            </div>
          ))}
        </div>
      </section>

      {draft.certifications.length > 0 && (
        <section className="card">
          <h3 className="mb-3">Certifications</h3>
          <ul className="space-y-1.5 text-sm">
            {draft.certifications.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium">{c.name}</span>
                {c.issuer && <span className="text-slate-500">· {c.issuer}</span>}
                {c.date && <span className="text-slate-400">· {c.date}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-safe backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex max-w-4xl gap-2 sm:justify-end">
          <button className="btn-secondary flex-1 sm:flex-none" onClick={() => void persist()} disabled={saving}>
            {saving ? <Spinner /> : null}{saved ? 'Saved ✓' : 'Save changes'}
          </button>
          <button className="btn-primary flex-1 sm:hidden" disabled={saving} onClick={async () => { await persist(); onFindJobs() }}>
            <Search size={16} /> Find jobs
          </button>
        </div>
      </div>
    </div>
  )
}
