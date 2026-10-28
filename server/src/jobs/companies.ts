/**
 * Company career portals that expose a public job feed through their applicant-tracking system.
 * Each company is isolated: if one slug is wrong or a feed is down, the rest still work.
 *
 * IMPORTANT: these entries are best-effort and NOT all verified. Open  /api/jobs/companies/health  on your
 * deployed server to see which ones respond, then remove or fix the failing ones. You can add more
 * without code changes through the COMPANIES_EXTRA environment variable (a JSON array of the same shape).
 */
export type AtsType = 'greenhouse' | 'lever' | 'smartrecruiters' | 'workday' | 'amazon'

export interface CompanyConfig {
  name: string
  ats: AtsType
  /** greenhouse board token / lever site / smartrecruiters company id / workday tenant */
  slug: string
  /** workday only: full host, e.g. walmart.wd5.myworkdayjobs.com */
  host?: string
  /** workday only: career site name in the URL */
  site?: string
}

export const COMPANIES: CompanyConfig[] = [
  // Amazon publishes a public search feed.
  { name: 'Amazon / AWS', ats: 'amazon', slug: 'amazon' },

  // Workday tenants (host and site names are from memory; verify with the health endpoint)
  { name: 'Walmart Global Tech', ats: 'workday', slug: 'walmart', host: 'walmart.wd5.myworkdayjobs.com', site: 'WalmartExternal' },
  { name: 'Mastercard', ats: 'workday', slug: 'mastercard', host: 'mastercard.wd1.myworkdayjobs.com', site: 'CorporateCareers' },
  { name: 'NVIDIA', ats: 'workday', slug: 'nvidia', host: 'nvidia.wd5.myworkdayjobs.com', site: 'NVIDIAExternalCareerSite' },
  { name: 'Salesforce', ats: 'workday', slug: 'salesforce', host: 'salesforce.wd12.myworkdayjobs.com', site: 'External_Career_Site' },
  { name: 'Dell Technologies', ats: 'workday', slug: 'dell', host: 'dell.wd1.myworkdayjobs.com', site: 'External' },
  { name: 'Wells Fargo', ats: 'workday', slug: 'wf', host: 'wf.wd1.myworkdayjobs.com', site: 'WellsFargoJobs' },
  { name: 'Adobe', ats: 'workday', slug: 'adobe', host: 'adobe.wd5.myworkdayjobs.com', site: 'external_experienced' },
  { name: 'Intel', ats: 'workday', slug: 'intel', host: 'intel.wd1.myworkdayjobs.com', site: 'External' },
  { name: 'Capital One', ats: 'workday', slug: 'capitalone', host: 'capitalone.wd12.myworkdayjobs.com', site: 'Capital_One' },
  { name: 'DXC Technology', ats: 'workday', slug: 'dxctechnology', host: 'dxctechnology.wd1.myworkdayjobs.com', site: 'DXCJobs' },

  // Greenhouse / Lever / SmartRecruiters boards (slugs are guesses)
  { name: 'Postman', ats: 'greenhouse', slug: 'postman' },
  { name: 'Chargebee', ats: 'greenhouse', slug: 'chargebee' },
  { name: 'Freshworks', ats: 'greenhouse', slug: 'freshworks' },
  { name: 'Thoughtworks', ats: 'greenhouse', slug: 'thoughtworks' },
  { name: 'Zuora', ats: 'greenhouse', slug: 'zuora' },
  { name: 'Kissflow', ats: 'lever', slug: 'kissflow' },
  { name: 'Zeta', ats: 'lever', slug: 'zeta' },
  { name: 'Visa', ats: 'smartrecruiters', slug: 'Visa' },
]

export function allCompanies(): CompanyConfig[] {
  const extra = process.env.COMPANIES_EXTRA
  if (!extra) return COMPANIES
  try {
    const parsed = JSON.parse(extra) as CompanyConfig[]
    const valid = parsed.filter(c => c && c.name && c.ats && c.slug)
    const names = new Set(valid.map(c => c.name.toLowerCase()))
    return [...COMPANIES.filter(c => !names.has(c.name.toLowerCase())), ...valid]
  } catch {
    console.warn('COMPANIES_EXTRA is not valid JSON; ignoring it')
    return COMPANIES
  }
}
