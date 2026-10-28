/**
 * Rebuilds readable lines from the positioned text fragments of a PDF page.
 * pdf-parse's default renderer glues fragments together in content-stream order, which scrambles
 * multi-column resumes and splits lines unpredictably. Here we group fragments by position instead.
 */
export interface PdfTextItem {
  str: string
  transform: number[]
  width?: number
  height?: number
}

interface Frag {
  x: number
  y: number
  w: number
  h: number
  str: string
}

interface Cell {
  x: number
  endX: number
  text: string
}

function toFrags(items: PdfTextItem[]): Frag[] {
  const frags: Frag[] = []
  for (const it of items) {
    if (!it || typeof it.str !== 'string' || it.str.trim() === '') continue
    const t = it.transform || []
    const h = Math.abs(it.height || t[3] || 10) || 10
    const w = it.width && it.width > 0 ? it.width : it.str.length * h * 0.5
    frags.push({ x: t[4] || 0, y: t[5] || 0, w, h, str: it.str })
  }
  return frags
}

function groupLines(frags: Frag[]): Frag[][] {
  const sorted = [...frags].sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: Frag[][] = []
  let lineY = Number.POSITIVE_INFINITY
  let lineH = 10
  for (const f of sorted) {
    const tol = Math.max(2, Math.min(lineH, f.h) * 0.45)
    if (lines.length === 0 || Math.abs(f.y - lineY) > tol) {
      lines.push([f])
      lineY = f.y
      lineH = f.h
    } else {
      lines[lines.length - 1].push(f)
    }
  }
  return lines.map(l => l.sort((a, b) => a.x - b.x))
}

/** Join fragments on one visual line into cells separated by large horizontal gaps. */
function lineToCells(line: Frag[]): Cell[] {
  const cells: Cell[] = []
  let cur: Cell | null = null
  let prev: Frag | null = null
  for (const f of line) {
    if (!cur || !prev) {
      cur = { x: f.x, endX: f.x + f.w, text: f.str }
    } else {
      const gap = f.x - (prev.x + prev.w)
      const charW = prev.w / Math.max(1, prev.str.length)
      if (gap > Math.max(14, charW * 3.5)) {
        cells.push(cur)
        cur = { x: f.x, endX: f.x + f.w, text: f.str }
      } else {
        const needsSpace = gap > charW * 0.22 && !/\s$/.test(cur.text) && !/^\s/.test(f.str)
        cur.text += (needsSpace ? ' ' : '') + f.str
        cur.endX = f.x + f.w
      }
    }
    prev = f
  }
  if (cur) cells.push(cur)
  return cells
}

function renderLines(lines: Frag[][]): string[] {
  return lines.map(l => lineToCells(l).map(c => c.text.replace(/\s+/g, ' ').trim()).join('   ')).filter(t => t.length > 0)
}

/** Detect a two-column layout (sidebar resumes) and return the x position where the right column starts. */
function detectColumnSplit(lines: Frag[][], pageWidth: number): number | null {
  const starts: number[] = []
  let multi = 0
  for (const l of lines) {
    const cells = lineToCells(l)
    if (cells.length >= 2) {
      multi++
      starts.push(cells[1].x)
    }
  }
  if (multi < 6 || lines.length < 10) return null

  const bucket = 12
  const counts = new Map<number, number>()
  for (const x of starts) {
    const key = Math.round(x / bucket)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  let bestKey = 0
  let best = 0
  for (const [k, c] of counts) {
    if (c > best) {
      best = c
      bestKey = k
    }
  }
  const splitX = bestKey * bucket
  const rel = splitX / pageWidth
  if (best < 6 || best / lines.length < 0.2 || rel < 0.22 || rel > 0.7) return null
  return splitX - bucket / 2
}

export function layoutPageText(items: PdfTextItem[], pageWidth?: number): string {
  const frags = toFrags(items)
  if (frags.length === 0) return ''

  const width = pageWidth && pageWidth > 0 ? pageWidth : Math.max(...frags.map(f => f.x + f.w)) + 20
  const lines = groupLines(frags)
  const split = detectColumnSplit(lines, width)

  if (split === null) return renderLines(lines).join('\n')

  const left = frags.filter(f => f.x < split)
  const right = frags.filter(f => f.x >= split)
  const biggest = (fs: Frag[]) => fs.reduce((m, f) => Math.max(m, f.h), 0)
  // The main column carries the candidate's name (largest type), so it is read first.
  const [first, second] = biggest(right) > biggest(left) * 1.15 ? [right, left] : [left, right]
  const out: string[] = []
  out.push(...renderLines(groupLines(first)))
  out.push('')
  out.push(...renderLines(groupLines(second)))
  return out.join('\n')
}
