import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score))
  const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#94a3b8'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${pct} percent match`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-base font-bold text-slate-900">{pct}</span>
        <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">match</span>
      </div>
    </div>
  )
}

export function CopyButton({ text, label = 'Copy', className = '' }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      document.body.removeChild(ta)
    }
    setDone(true)
    window.setTimeout(() => setDone(false), 1600)
  }
  return (
    <button type="button" onClick={copy} className={`btn-secondary btn-sm ${className}`} aria-live="polite">
      {done ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
      {done ? 'Copied' : label}
    </button>
  )
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}

export function timeAgo(iso?: string): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  const days = Math.floor((Date.now() - t) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return ''
}

export function formatSalary(job: { salary?: { min?: number; max?: number; currency?: string; text?: string } }): string {
  const s = job.salary
  if (!s) return ''
  if (s.text) return s.text
  const cur = s.currency === 'USD' || !s.currency ? '$' : `${s.currency} `
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))
  if (s.min && s.max) return `${cur}${k(s.min)}–${k(s.max)}`
  if (s.min) return `${cur}${k(s.min)}+`
  if (s.max) return `Up to ${cur}${k(s.max)}`
  return ''
}
