import type { InterviewPrep, Job, PrepQA, Profile } from '../types'
import { callClaude, parseJsonLoose } from './anthropic'
import { findSkills } from '../skills/vocabulary'
import { truncate } from '../util/html'

const SYSTEM = `You are a senior interviewer and career coach preparing ONE candidate for ONE specific job interview.
Base everything on the job description and the candidate's real profile. Never invent facts about the company, its products, interview rounds or the candidate. If you do not know something, give general guidance instead.
For model answers: be concrete and correct, 3-6 sentences, written so the candidate can adapt them in their own words. When an answer should use the candidate's own experience, build it from their real roles/projects in the profile; if none fits, write "[use your own example: ...]" with a hint.
Do not include URLs. For resources, name well-known official docs or topics only.
Return ONLY JSON in exactly this shape:
{"overview":string (what this role really needs, 2-3 sentences),
"strengths":[string] (max 5, from the profile vs the JD),
"gaps":[string] (max 5, honest, with how to handle them in the interview),
"technical":[{"question":string,"answer":string,"skill":string,"level":"basic"|"intermediate"|"advanced"}] (exactly 12, ordered by how likely they are to be asked, covering the JD's main skills),
"scenario":[{"question":string,"answer":string}] (exactly 4 practical problem-solving / design / debugging questions for this role),
"behavioral":[{"question":string,"answer":string}] (exactly 4, answered in STAR form using the candidate's real experience),
"topics":[{"topic":string,"why":string,"priority":"high"|"medium"|"low","howToPrepare":string}] (8-10 things to revise, gaps first),
"plan":[{"day":string,"focus":string,"tasks":[string]}] (exactly 7 days, 2-4 tasks each, realistic),
"questionsToAsk":[string] (6 smart questions for the interviewer about this role/team),
"tips":[string] (6 specific tips, including salary/notice-period/HR-round advice for an Indian IT interview)}`

function bank(skill: string): PrepQA {
  return {
    question: `Explain ${skill} and describe a place where you used it in a project.`,
    answer: `[Use your own example] Start with what ${skill} is for, then one concrete project: the problem, what you built with ${skill}, one challenge you hit, and the result. Keep it to about two minutes.`,
    skill,
    level: 'basic',
  }
}

function templatePrep(profile: Profile, job: Job): InterviewPrep {
  const jobSkills = findSkills(`${job.title}\n${job.requirements.join('\n')}\n${job.description}`).map(h => h.name)
  const mine = new Set(profile.skills.map(s => s.name.toLowerCase()))
  const have = jobSkills.filter(s => mine.has(s.toLowerCase()))
  const missing = jobSkills.filter(s => !mine.has(s.toLowerCase()))
  const focus = [...have, ...missing].slice(0, 10)

  return {
    overview: `${job.company} is hiring a ${job.title}. The posting points to: ${jobSkills.slice(0, 8).join(', ') || 'the skills in the description'}. Prepare to show hands-on use of these.`,
    strengths: have.slice(0, 5).map(s => `You list ${s}, which the job asks for.`),
    gaps: missing.slice(0, 5).map(s => `${s} is in the job but not on your resume. Be honest, and show how quickly you pick things up.`),
    technical: focus.map(bank),
    scenario: [
      { question: 'Walk me through how you would debug a production issue in a system you own.', answer: '[Use your own example] Reproduce, check logs and metrics, narrow the cause, fix, add a test, and write down what you learned.' },
    ],
    behavioral: [
      { question: 'Tell me about a challenging project and what you did.', answer: 'Use STAR: Situation, Task, Action, Result. Pick a real project from your resume and quantify the result.' },
      { question: 'Tell me about a disagreement with a teammate.', answer: 'Show that you listened, used data, and reached a decision the team could support.' },
    ],
    topics: focus.map((t, i) => ({ topic: t, why: missing.includes(t) ? 'Required by the job, missing on your resume' : 'Required by the job and on your resume', priority: i < 4 ? 'high' as const : 'medium' as const, howToPrepare: `Revise the fundamentals of ${t} and build or review one small example.` })),
    plan: [
      { day: 'Day 1', focus: 'Understand the role', tasks: ['Read the job description twice and list every skill', 'Match each skill to a project from your resume'] },
      { day: 'Days 2-4', focus: 'Technical revision', tasks: focus.slice(0, 6).map(t => `Revise ${t}`) },
      { day: 'Day 5', focus: 'Practice answers', tasks: ['Answer questions aloud, 2 minutes each', 'Prepare 2 STAR stories'] },
      { day: 'Day 6', focus: 'Mock interview', tasks: ['Do a timed mock with a friend', 'Fix weak answers'] },
      { day: 'Day 7', focus: 'Final prep', tasks: ['Research the company', 'Prepare your questions and documents'] },
    ],
    questionsToAsk: ['What does success look like in the first 3 months?', 'What does the team work on day to day?', 'How is performance reviewed here?'],
    tips: ['Add ANTHROPIC_API_KEY on the server for questions and model answers written for this exact job.', 'Know your notice period and expected salary range before the HR round.'],
    generatedBy: 'template',
  }
}

export async function buildInterviewPrep(profile: Profile, job: Job, useAI: boolean): Promise<InterviewPrep> {
  const fallback = templatePrep(profile, job)
  if (!useAI) return fallback
  try {
    const profileJson = JSON.stringify({
      headline: profile.headline,
      years: profile.totalYears,
      skills: profile.skills.slice(0, 40).map(s => s.name),
      experience: profile.experience.slice(0, 4).map(e => ({ title: e.title, company: e.company, years: e.years, bullets: (e.bullets || []).slice(0, 5) })),
      projects: (profile.projects || []).slice(0, 4).map(p => ({ name: p.name, description: p.description })),
      education: profile.education.slice(0, 2).map(e => `${e.degree} ${e.field || ''}`.trim()),
    })
    const jobJson = JSON.stringify({
      title: job.title, company: job.company, location: job.location, experience: job.experienceText,
      requirements: job.requirements.slice(0, 12), description: truncate(job.description, 5000),
    })
    const reply = await callClaude({
      system: SYSTEM,
      user: `Candidate profile:\n${profileJson}\n\nJob:\n${jobJson}`,
      maxTokens: 9000,
      temperature: 0.3,
      timeoutMs: 110000,
    })
    const d = parseJsonLoose<Partial<InterviewPrep>>(reply)
    const arr = <T,>(v: T[] | undefined, fb: T[]): T[] => (Array.isArray(v) && v.length ? v : fb)
    return {
      overview: d.overview || fallback.overview,
      strengths: arr(d.strengths, fallback.strengths),
      gaps: arr(d.gaps, fallback.gaps),
      technical: arr(d.technical, fallback.technical),
      scenario: arr(d.scenario, fallback.scenario),
      behavioral: arr(d.behavioral, fallback.behavioral),
      topics: arr(d.topics, fallback.topics),
      plan: arr(d.plan, fallback.plan),
      questionsToAsk: arr(d.questionsToAsk, fallback.questionsToAsk),
      tips: arr(d.tips, fallback.tips),
      generatedBy: 'ai',
    }
  } catch (err) {
    console.warn('Interview prep AI failed, using template:', err instanceof Error ? err.message : err)
    return fallback
  }
}
