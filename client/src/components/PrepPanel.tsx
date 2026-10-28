import { useEffect, useState } from 'react'
import { Download, Lightbulb, Target } from 'lucide-react'
import { apiClient } from '../api/client'
import { CopyButton, Spinner } from './ui'
import type { InterviewPrep, Job, PrepQA, Profile } from '../types'

const LEVEL_STYLE: Record<string, string> = {
  basic: 'chip-success', intermediate: 'chip-warning', advanced: 'chip-primary',
}
const PRIORITY_STYLE: Record<string, string> = {
  high: 'chip-warning', medium: 'chip-primary', low: 'chip',
}

function toMarkdown(job: Job, p: InterviewPrep): string {
  const qa = (title: string, items: PrepQA[]) =>
    items.length ? `\n## ${title}\n` + items.map((x, i) => `\n**${i + 1}. ${x.question}**\n\n${x.answer}\n`).join('') : ''
  return [
    `# Interview prep: ${job.title} at ${job.company}`,
    `\n${p.overview}`,
    p.strengths.length ? `\n## Your strengths\n${p.strengths.map(x => `- ${x}`).join('\n')}` : '',
    p.gaps.length ? `\n## Gaps to handle\n${p.gaps.map(x => `- ${x}`).join('\n')}` : '',
    qa('Technical questions', p.technical),
    qa('Scenario questions', p.scenario),
    qa('Behavioural questions', p.behavioral),
    p.topics.length ? `\n## Topics to revise\n${p.topics.map(t => `- **${t.topic}** (${t.priority}): ${t.why}${t.howToPrepare ? ` ${t.howToPrepare}` : ''}`).join('\n')}` : '',
    p.plan.length ? `\n## 7-day plan\n${p.plan.map(d => `- **${d.day}: ${d.focus}**\n${d.tasks.map(t => `  - ${t}`).join('\n')}`).join('\n')}` : '',
    p.questionsToAsk.length ? `\n## Questions to ask them\n${p.questionsToAsk.map(x => `- ${x}`).join('\n')}` : '',
    p.tips.length ? `\n## Tips\n${p.tips.map(x => `- ${x}`).join('\n')}` : '',
  ].join('\n')
}

function QAList({ items }: { items: PrepQA[] }) {
  return (
    <div className="space-y-2">
      {items.map((q, i) => (
        <details key={i} className="group rounded-xl border border-slate-200 bg-white open:shadow-sm">
          <summary className="flex cursor-pointer list-none items-start gap-3 p-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">{i + 1}</span>
            <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{q.question}</span>
            {q.level && <span className={`${LEVEL_STYLE[q.level] || 'chip'} shrink-0 capitalize`}>{q.level}</span>}
          </summary>
          <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2 text-sm leading-relaxed text-slate-600">
            {q.skill && <span className="chip">{q.skill}</span>}
            <p className="whitespace-pre-line">{q.answer}</p>
            <CopyButton text={`${q.question}\n\n${q.answer}`} />
          </div>
        </details>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <section>
      <h4 className="mb-2 font-semibold">{title}</h4>
      {children}
    </section>
  )
}

export default function PrepPanel({ job, profile }: { job: Job; profile: Profile }) {
  const [prep, setPrep] = useState<InterviewPrep | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setPrep(null)
    setError('')
    apiClient
      .interviewPrep(profile, job)
      .then(p => !cancelled && setPrep(p))
      .catch(err => !cancelled && setError(err instanceof Error ? err.message : 'Could not prepare the interview guide'))
    return () => { cancelled = true }
  }, [job, profile])

  if (error) return <div role="alert" className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">{error}</div>

  if (!prep) {
    return (
      <div className="space-y-3" aria-busy="true">
        <p className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Writing your interview guide from the job description. This takes up to a minute…</p>
        {[90, 100, 70, 85, 60].map((w, i) => <div key={i} className="skeleton h-4" style={{ width: `${w}%` }} />)}
        <div className="skeleton h-32 w-full" />
      </div>
    )
  }

  const md = toMarkdown(job, prep)
  const download = () => {
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `interview-prep-${job.company.replace(/\W+/g, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {prep.generatedBy === 'template' && (
        <div className="rounded-xl border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700">
          Basic guide only. The AI version, with model answers written for this job, needs a working ANTHROPIC_API_KEY on the server.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm leading-relaxed text-slate-600">{prep.overview}</p>
        <div className="flex gap-2">
          <CopyButton text={md} label="Copy all" />
          <button className="btn-secondary btn-sm" onClick={download}><Download size={14} /> .md</button>
        </div>
      </div>

      {(prep.strengths.length > 0 || prep.gaps.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {prep.strengths.length > 0 && (
            <div className="rounded-xl bg-success-50 p-4">
              <p className="mb-1 text-sm font-semibold text-success-700">Your strengths for this role</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{prep.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {prep.gaps.length > 0 && (
            <div className="rounded-xl bg-warning-50 p-4">
              <p className="mb-1 text-sm font-semibold text-warning-700">Gaps to prepare for</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{prep.gaps.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {prep.technical.length > 0 && <Section title={`Technical questions (${prep.technical.length})`}><QAList items={prep.technical} /></Section>}
      {prep.scenario.length > 0 && <Section title="Scenario & problem-solving"><QAList items={prep.scenario} /></Section>}
      {prep.behavioral.length > 0 && <Section title="Behavioural (HR) questions"><QAList items={prep.behavioral} /></Section>}

      {prep.topics.length > 0 && (
        <Section title="Topics to revise">
          <ul className="space-y-2">
            {prep.topics.map((t, i) => (
              <li key={i} className="rounded-xl border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Target size={14} className="text-primary-600" />
                  <span className="font-medium">{t.topic}</span>
                  <span className={`${PRIORITY_STYLE[t.priority] || 'chip'} capitalize`}>{t.priority}</span>
                </div>
                <p className="mt-1 text-slate-600">{t.why}</p>
                {t.howToPrepare && <p className="mt-1 text-slate-500">{t.howToPrepare}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {prep.plan.length > 0 && (
        <Section title="Your 7-day plan">
          <ol className="space-y-2">
            {prep.plan.map((d, i) => (
              <li key={i} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-medium">{d.day} · <span className="text-primary-700">{d.focus}</span></p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">{d.tasks.map((t, k) => <li key={k}>{t}</li>)}</ul>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {prep.questionsToAsk.length > 0 && (
        <Section title="Smart questions to ask them">
          <ul className="list-disc space-y-1.5 pl-5 text-sm">{prep.questionsToAsk.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </Section>
      )}

      {prep.tips.length > 0 && (
        <section className="rounded-xl bg-primary-50 p-4">
          <h4 className="mb-2 flex items-center gap-2 font-semibold text-primary-800"><Lightbulb size={16} /> Interview tips</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-primary-900">{prep.tips.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      )}
    </div>
  )
}
