import type { ApplicationKit, Job, Profile } from '../types'
import { callClaude, parseJsonLoose } from './anthropic'
import { truncate } from '../util/html'

const SYSTEM = `You help a candidate apply to ONE job. Write in first person as the candidate, plain and specific, no clichés.
Hard rules: use ONLY facts present in the candidate profile. Never invent employers, numbers, degrees, certifications or skills. If the job needs something the candidate lacks, do not claim it.
Return ONLY JSON:
{"summary":string (2-3 sentence tailored professional summary),
"coverLetter":string (150-230 words, 3 short paragraphs, ends with the candidate's name),
"answers":[{"question":string,"answer":string}] (exactly these: "Why do you want this role?", "Why are you a good fit?", "What is your notice period / availability?" -> say it should be confirmed by the candidate, "Describe a relevant achievement"),
"resumeBullets":[string] (4 bullets rewritten from the candidate's real experience to emphasise what this job asks for),
"tips":[string] (3 short, honest tips, including any skill gap to address)}`

export function profileFields(p: Profile): Array<{ label: string; value: string }> {
  const latest = p.experience[0]
  const edu = p.education[0]
  const rows: Array<[string, string | undefined]> = [
    ['Full name', p.name],
    ['Email', p.email],
    ['Phone', p.phone],
    ['Location', p.location],
    ['Current / latest title', latest?.title],
    ['Current / latest company', latest?.company],
    ['Total experience', p.totalYears ? `${p.totalYears} years` : undefined],
    ['Highest education', edu ? [edu.degree, edu.field, edu.institution].filter(Boolean).join(', ') : undefined],
    ['LinkedIn', p.links?.find(l => l.label === 'LinkedIn')?.url],
    ['GitHub', p.links?.find(l => l.label === 'GitHub')?.url],
    ['Portfolio / website', p.links?.find(l => l.label === 'Website')?.url],
    ['Key skills', p.skills.slice(0, 12).map(s => s.name).join(', ')],
  ]
  return rows.filter((r): r is [string, string] => Boolean(r[1])).map(([label, value]) => ({ label, value }))
}

function templateKit(p: Profile, job: Job): ApplicationKit {
  const matched = (job.matchedSkills || []).slice(0, 5)
  const skillLine = matched.length ? matched.join(', ') : p.skills.slice(0, 4).map(s => s.name).join(', ')
  const latest = p.experience[0]
  const role = latest?.title || p.headline || 'professional'
  const years = p.totalYears && p.totalYears >= 1 ? `${Math.floor(p.totalYears)}+ years of` : ''
  const name = p.name || ''
  const summary = `${role} with ${years} experience${skillLine ? ` working with ${skillLine}` : ''}. Interested in the ${job.title} role at ${job.company}.`
  const coverLetter = [
    `Dear ${job.company} hiring team,`,
    `I'm applying for the ${job.title} position. I'm a ${role}${years ? ` with ${years} experience` : ''}${latest?.company ? `, most recently at ${latest.company}` : ''}${skillLine ? `, and I work regularly with ${skillLine}` : ''}, which lines up with what you're looking for.`,
    `I would welcome the chance to discuss how my background can help your team.`,
    `Kind regards,\n${name}`,
  ].join('\n\n')
  return {
    fields: profileFields(p),
    summary,
    coverLetter,
    answers: [
      { question: 'Why are you a good fit?', answer: `My experience${skillLine ? ` with ${skillLine}` : ''} matches the core requirements of the ${job.title} role.` },
    ],
    resumeBullets: (latest?.bullets || []).slice(0, 4),
    tips: [
      ...(job.missingSkills?.length ? [`The posting mentions ${job.missingSkills.slice(0, 3).join(', ')}, which isn't on your resume. Address it if you have the experience.`] : []),
      'Add ANTHROPIC_API_KEY on the server to get a cover letter and answers written specifically for this job.',
    ],
    generatedBy: 'template',
  }
}

export async function buildApplicationKit(p: Profile, job: Job, useAI: boolean): Promise<ApplicationKit> {
  const fallback = templateKit(p, job)
  if (!useAI) return fallback
  try {
    const profileJson = JSON.stringify({
      name: p.name, headline: p.headline, years: p.totalYears, summary: p.summary,
      skills: p.skills.slice(0, 40).map(s => s.name),
      experience: p.experience.slice(0, 4).map(e => ({ title: e.title, company: e.company, years: e.years, bullets: (e.bullets || []).slice(0, 5) })),
      education: p.education.slice(0, 2),
      certifications: p.certifications.slice(0, 5).map(c => c.name),
    })
    const reply = await callClaude({
      system: SYSTEM,
      user: `Candidate profile:\n${profileJson}\n\nJob:\n${JSON.stringify({ title: job.title, company: job.company, location: job.location, requirements: job.requirements.slice(0, 8), description: truncate(job.description, 3500) })}`,
      maxTokens: 3000,
      temperature: 0.4,
    })
    const d = parseJsonLoose<Partial<ApplicationKit>>(reply)
    return {
      fields: fallback.fields,
      summary: d.summary || fallback.summary,
      coverLetter: d.coverLetter || fallback.coverLetter,
      answers: Array.isArray(d.answers) && d.answers.length ? d.answers : fallback.answers,
      resumeBullets: Array.isArray(d.resumeBullets) ? d.resumeBullets : fallback.resumeBullets,
      tips: Array.isArray(d.tips) ? d.tips : fallback.tips,
      generatedBy: 'ai',
    }
  } catch (err) {
    console.warn('Application kit AI failed, using template:', err instanceof Error ? err.message : err)
    return fallback
  }
}
