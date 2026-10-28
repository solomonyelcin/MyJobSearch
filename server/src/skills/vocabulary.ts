/**
 * Skill vocabulary used to recognise skills in resumes and job postings.
 *
 * Entry syntax:  "Canonical Name|alias|alias"
 *   !  prefix  -> ambiguous word (Go, R, React...): only matched with exact capitalisation
 *   ~  prefix  -> soft/generic skill: recognised in a skills list, but not scanned for in free text
 * Any name or alias of 3 characters or fewer is always matched case-sensitively (JS, AI, UX, CI...).
 */
const RAW: string[] = [
  // Languages
  'JavaScript|JS|ECMAScript|ES6', 'TypeScript|TS', 'Python|Python3', 'Java', '!C', 'C++|cpp', 'C#|csharp|c-sharp',
  '!Go|Golang', '!R', 'Rust', '!Swift', 'Kotlin', 'PHP', '!Ruby', 'Scala', '!Dart', 'Perl', 'Lua', 'Haskell',
  'Elixir', 'Erlang', 'Clojure', 'MATLAB', 'Objective-C', 'Bash|Shell Scripting|Shell Script', 'PowerShell',
  'SQL|T-SQL|PL/SQL|PLSQL', 'NoSQL', 'HTML|HTML5', 'CSS|CSS3', 'SASS|SCSS', 'Solidity', 'Groovy', 'F#', 'VBA',
  'COBOL', 'Julia', '.NET|dotnet|.NET Core', 'ASP.NET', 'ASP.NET Core', 'Visual Basic|VB.NET',
  // Front-end
  '!React|React.js|ReactJS|React JS', 'React Native', 'Redux', 'Next.js|NextJS|Next JS', 'Vue.js|Vue|VueJS', 'Nuxt.js|Nuxt',
  'Angular|AngularJS|Angular.js', 'Svelte|SvelteKit', 'jQuery', 'Tailwind CSS|TailwindCSS|Tailwind', 'Bootstrap',
  'Material UI|MUI', 'Chakra UI', 'Ant Design', 'Webpack', 'Vite', 'Babel', 'Storybook', 'Gatsby', 'Remix', 'Astro',
  'Three.js', 'D3.js|D3', 'WebSockets|WebSocket', 'WebAssembly|WASM', 'PWA|Progressive Web Apps', 'Responsive Design',
  'Figma', 'Adobe XD', 'Photoshop|Adobe Photoshop', 'Illustrator|Adobe Illustrator', 'Accessibility|WCAG',
  // Back-end
  'Node.js|NodeJS|Node', '!Express|Express.js|ExpressJS', 'NestJS|Nest.js', '!Spring|Spring Boot|Spring Framework',
  'Django', 'Flask', 'FastAPI', 'Laravel', 'Symfony', '!Rails|Ruby on Rails', 'Hibernate', 'Phoenix',
  'Entity Framework', 'GraphQL', 'REST|REST API|RESTful|RESTful APIs|REST APIs', 'gRPC', 'tRPC', 'OAuth|OAuth2',
  'JWT', 'OpenAPI|Swagger', 'Microservices|Microservice', 'Serverless', 'Kafka|Apache Kafka', 'RabbitMQ',
  'ActiveMQ', 'Celery', 'Socket.IO',
  // Mobile
  'Android', 'iOS', 'Flutter', 'SwiftUI', 'Jetpack Compose', 'Xamarin', 'Ionic',
  // Data & databases
  'PostgreSQL|Postgres', 'MySQL', 'MariaDB', 'SQLite', 'Oracle|Oracle DB', 'SQL Server|MSSQL|Microsoft SQL Server',
  'MongoDB|Mongo', 'Redis', 'Cassandra', 'DynamoDB', 'Elasticsearch|Elastic Search|OpenSearch', 'Firebase',
  'Firestore', 'Supabase', 'Neo4j', 'Snowflake', 'BigQuery', 'Redshift', 'Databricks', 'Apache Spark|Spark|PySpark',
  'Hadoop', 'Hive', 'Airflow|Apache Airflow', 'dbt', 'ETL', 'Data Warehousing|Data Warehouse', 'Data Modeling',
  'Pandas', 'NumPy', 'SciPy', 'Matplotlib', 'Seaborn', 'Plotly', 'Tableau', 'Power BI|PowerBI', 'Looker',
  '!Excel|Microsoft Excel|MS Excel', 'Google Sheets', 'Data Analysis|Data Analytics', 'Statistics|Statistical Analysis',
  'A/B Testing', 'Data Visualization', 'Data Engineering',
  // ML / AI
  'Machine Learning|ML', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn|sklearn|Scikit Learn',
  'XGBoost', 'LightGBM', 'NLP|Natural Language Processing', 'Computer Vision|OpenCV', 'LLM|LLMs|Large Language Models',
  'Generative AI|GenAI|Gen AI', 'LangChain', 'LlamaIndex', 'RAG|Retrieval-Augmented Generation',
  'Hugging Face|HuggingFace', 'OpenAI API|OpenAI', 'Prompt Engineering', 'MLOps', 'Reinforcement Learning',
  'Time Series', 'Recommender Systems|Recommendation Systems', 'Data Science', 'Artificial Intelligence|AI',
  // Cloud & DevOps
  'AWS|Amazon Web Services', 'Azure|Microsoft Azure', 'GCP|Google Cloud|Google Cloud Platform', 'Docker',
  'Kubernetes|K8s|k8s', 'Terraform', 'Ansible', 'Puppet', 'Jenkins', 'GitHub Actions', 'GitLab CI|GitLab CI/CD',
  'CircleCI', 'Travis CI', 'ArgoCD', 'Helm', 'CI/CD|CI CD|Continuous Integration|Continuous Delivery|Continuous Deployment',
  'DevOps', 'SRE|Site Reliability Engineering', 'Linux', 'Unix', 'Nginx', 'Apache HTTP Server', 'Prometheus',
  'Grafana', 'Datadog', 'New Relic', 'Splunk', 'ELK|ELK Stack', 'CloudFormation', 'AWS Lambda|Lambda', 'EC2', 'S3',
  'RDS', 'ECS', 'EKS', 'CloudWatch', 'Cloudflare', 'Heroku', 'Vercel', 'Netlify', 'DigitalOcean', 'OpenShift',
  'Istio', 'Networking|TCP/IP', 'Load Balancing',
  // Testing & QA
  'Jest', 'Mocha', 'Chai', 'Cypress', 'Playwright', 'Selenium', 'JUnit', 'TestNG', 'Pytest', 'Unit Testing',
  'Integration Testing', 'TDD|Test Driven Development|Test-Driven Development', 'BDD', 'Postman', 'JMeter',
  'QA|Quality Assurance', 'Test Automation|Automation Testing', 'Manual Testing', 'Appium', 'Cucumber',
  // Tools & process
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Jira', 'Confluence', 'Trello', 'Asana', 'Notion', 'Slack',
  'Agile', 'Scrum', 'Kanban', 'Waterfall', 'Six Sigma', 'SDLC', 'Code Review', 'System Design', 'Design Patterns',
  'OOP|Object-Oriented Programming|Object Oriented Programming', 'Data Structures', 'Algorithms',
  'Multithreading|Concurrency', 'Distributed Systems', 'Software Architecture', 'API Design',
  'Technical Writing',
  // Security
  'Cybersecurity|Cyber Security|Information Security', 'Penetration Testing|Pentesting', 'SIEM', 'OWASP',
  'Encryption', 'Vulnerability Assessment', 'Network Security', 'ISO 27001', 'SOC 2|SOC2', 'GDPR', 'HIPAA',
  // Product, design, business
  'Project Management', 'Product Management', 'Program Management', 'Stakeholder Management',
  'Product Roadmap|Roadmapping', 'User Research', 'UX Design|UX', 'UI Design|UI', 'Wireframing', 'Prototyping',
  'Market Research', 'Business Analysis', 'Requirements Gathering', 'Budgeting', 'Forecasting', 'Financial Modeling',
  'Financial Analysis', 'Accounting', 'Bookkeeping', 'Tally', 'QuickBooks', 'SAP', 'Salesforce', 'HubSpot', 'Zoho',
  'CRM', 'ERP', 'SEO', 'SEM', 'Google Analytics', 'Google Ads', 'Meta Ads|Facebook Ads', 'Content Marketing',
  'Email Marketing', 'Copywriting', 'Content Writing', 'Digital Marketing', 'Marketing Automation',
  'Brand Management', 'B2B Sales', 'Lead Generation', 'Account Management', 'Customer Success',
  'Recruiting|Talent Acquisition', 'Payroll', 'Supply Chain', 'Logistics', 'Operations Management',
  'Process Improvement',
  // Soft / generic (only picked up when listed in a skills section)
  '~Leadership', '~Communication|Communication Skills', '~Teamwork|Team Collaboration|Collaboration',
  '~Mentoring', '~Problem Solving|Problem-Solving', '~Critical Thinking', '~Time Management', '~Adaptability',
  '~Negotiation', '~Public Speaking', '~Presentation Skills', '~Sales', '~Social Media', '~Customer Service',
  '~Analytical Skills|Analytical Thinking', '~Cross-functional Collaboration', '~Attention to Detail',
  '~Decision Making', '~Strategic Planning', '~Team Management|People Management',
]

export interface SkillEntry {
  name: string
  soft: boolean
  ambiguous: boolean
}

export interface SkillHit {
  name: string
  count: number
  /** index of the first occurrence in the scanned text */
  firstIndex: number
}

interface Form {
  text: string
  caseSensitive: boolean
  entry: SkillEntry
}

const entries: SkillEntry[] = []
const insensitiveMap = new Map<string, SkillEntry>()
const sensitiveMap = new Map<string, SkillEntry>()
const insensitiveForms: string[] = []
const sensitiveForms: string[] = []

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

;(function build() {
  const forms: Form[] = []
  for (const raw of RAW) {
    let spec = raw
    let soft = false
    let ambiguous = false
    if (spec.startsWith('~')) {
      soft = true
      spec = spec.slice(1)
    }
    if (spec.startsWith('!')) {
      ambiguous = true
      spec = spec.slice(1)
    }
    const names = spec.split('|').map(s => s.trim()).filter(Boolean)
    const entry: SkillEntry = { name: names[0], soft, ambiguous }
    entries.push(entry)
    for (const n of names) {
      forms.push({ text: n, caseSensitive: ambiguous || n.length <= 3, entry })
    }
  }
  // longest first so "Spring Boot" wins over "Spring"
  forms.sort((a, b) => b.text.length - a.text.length)
  for (const f of forms) {
    if (f.caseSensitive) {
      if (!sensitiveMap.has(f.text)) {
        sensitiveMap.set(f.text, f.entry)
        sensitiveForms.push(f.text)
      }
    } else {
      const key = f.text.toLowerCase()
      if (!insensitiveMap.has(key)) {
        insensitiveMap.set(key, f.entry)
        insensitiveForms.push(f.text)
      }
    }
  }
})()

const BEFORE = '(?<![A-Za-z0-9+#&])'
const AFTER = '(?![A-Za-z0-9+#&])'

const insensitiveRegex = new RegExp(`${BEFORE}(?:${insensitiveForms.map(escapeRegex).join('|')})${AFTER}`, 'gi')
const sensitiveRegex = new RegExp(`${BEFORE}(?:${sensitiveForms.map(escapeRegex).join('|')})${AFTER}`, 'g')

/** Find every vocabulary skill mentioned in free text. Soft skills are excluded unless requested. */
export function findSkills(text: string, opts: { includeSoft?: boolean } = {}): SkillHit[] {
  const hits = new Map<string, SkillHit>()

  const record = (entry: SkillEntry | undefined, index: number) => {
    if (!entry) return
    if (entry.soft && !opts.includeSoft) return
    const existing = hits.get(entry.name)
    if (existing) existing.count += 1
    else hits.set(entry.name, { name: entry.name, count: 1, firstIndex: index })
  }

  insensitiveRegex.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = insensitiveRegex.exec(text)) !== null) {
    record(insensitiveMap.get(m[0].toLowerCase()), m.index)
  }

  sensitiveRegex.lastIndex = 0
  while ((m = sensitiveRegex.exec(text)) !== null) {
    record(sensitiveMap.get(m[0]), m.index)
  }

  return Array.from(hits.values()).sort((a, b) => a.firstIndex - b.firstIndex)
}

/** Map a token typed by the user ("nodejs", "K8s", "postgres") to its canonical skill name. */
export function canonicalSkill(token: string): string | null {
  const t = token.trim().replace(/[.,;:]+$/, '')
  if (!t) return null
  const exact = sensitiveMap.get(t)
  if (exact) return exact.name
  const loose = insensitiveMap.get(t.toLowerCase())
  if (loose) return loose.name
  // short alias typed in a different case, e.g. "ai", "ci/cd"
  const key = t.toLowerCase()
  for (const [form, entry] of sensitiveMap) {
    if (form.toLowerCase() === key && !entry.ambiguous) return entry.name
  }
  return null
}

export function isSoftSkill(name: string): boolean {
  return entries.some(e => e.name === name && e.soft)
}
