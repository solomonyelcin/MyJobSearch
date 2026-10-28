const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

export const MONTH_RE = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const DATE_RE = `(?:${MONTH_RE}\\.?,?\\s*(?:19|20)\\d{2}|\\d{1,2}\\s*[\\/.]\\s*(?:19|20)\\d{2}|(?:19|20)\\d{2}\\s*[\\/\\-]\\s*\\d{1,2}(?!\\d)|(?:19|20)\\d{2})`
const END_WORDS = 'present|current|currently|now|ongoing|today|till date|till now|to date|date'

/** Matches "Jan 2020 - Present", "2019 – 2021", "03/2018 to 05/2020" ... */
export const RANGE_SOURCE = `(${DATE_RE})\\s*(?:-|–|—|‒|to|until|through|till)\\s*(${DATE_RE}|${END_WORDS})`

export interface YearMonth {
  y: number
  m: number
  /** true when only a year was given */
  approx: boolean
}

export interface ParsedRange {
  start: YearMonth
  end: YearMonth
  current: boolean
  startText: string
  endText: string
  matched: string
}

export function nowYM(): YearMonth {
  const d = new Date()
  return { y: d.getFullYear(), m: d.getMonth() + 1, approx: false }
}

export function parseDateToken(token: string): YearMonth | null {
  const t = token.trim().toLowerCase()
  if (!t) return null
  if (new RegExp(`^(${END_WORDS})$`).test(t)) return nowYM()

  let m = t.match(new RegExp(`^(${MONTH_RE})\\.?,?\\s*((?:19|20)\\d{2})$`, 'i'))
  if (m) return { y: parseInt(m[2], 10), m: MONTHS[m[1].slice(0, 3)] || 1, approx: false }

  m = t.match(/^(\d{1,2})\s*[\/.]\s*((?:19|20)\d{2})$/)
  if (m) {
    const month = parseInt(m[1], 10)
    if (month >= 1 && month <= 12) return { y: parseInt(m[2], 10), m: month, approx: false }
    return null
  }

  m = t.match(/^((?:19|20)\d{2})\s*[\/\-]\s*(\d{1,2})$/)
  if (m) {
    const month = parseInt(m[2], 10)
    if (month >= 1 && month <= 12) return { y: parseInt(m[1], 10), m: month, approx: false }
    return null
  }

  m = t.match(/^((?:19|20)\d{2})$/)
  if (m) return { y: parseInt(m[1], 10), m: 6, approx: true }

  return null
}

export function findRange(line: string): ParsedRange | null {
  const match = new RegExp(RANGE_SOURCE, 'i').exec(line)
  if (!match) return null
  const start = parseDateToken(match[1])
  const end = parseDateToken(match[2])
  if (!start || !end) return null
  const current = new RegExp(`^(${END_WORDS})$`, 'i').test(match[2].trim())
  if (index(end) < index(start)) return null
  return { start, end, current, startText: match[1].trim(), endText: match[2].trim(), matched: match[0] }
}

function index(d: YearMonth): number {
  return d.y * 12 + d.m
}

export function monthsBetween(start: YearMonth, end: YearMonth): number {
  return Math.max(0, index(end) - index(start))
}

export function toIso(d: YearMonth): string {
  return d.approx ? String(d.y) : `${d.y}-${String(d.m).padStart(2, '0')}`
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Total years across ranges, counting overlapping periods only once. */
export function mergedYears(ranges: Array<{ start: YearMonth; end: YearMonth }>): number {
  const spans = ranges
    .map(r => [index(r.start), index(r.end)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0])

  let total = 0
  let curStart = -1
  let curEnd = -1
  for (const [a, b] of spans) {
    if (curEnd < 0 || a > curEnd) {
      if (curEnd >= 0) total += curEnd - curStart
      curStart = a
      curEnd = b
    } else if (b > curEnd) {
      curEnd = b
    }
  }
  if (curEnd >= 0) total += curEnd - curStart
  return round1(total / 12)
}
