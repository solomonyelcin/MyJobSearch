# Job Search Intelligence Platform

An AI-powered web application that helps job seekers find matching opportunities by:
- Automatically parsing and extracting skills from resumes (PDF, DOCX, TXT)
- Scraping job listings from Indeed and LinkedIn
- Calculating intelligent match scores (0-100) based on skills, experience, and education
- Providing direct application links with pre-filled information when available

## Features

### 📄 Resume Management
- Upload resume in PDF, DOCX, or TXT format
- Automatic skill extraction and profile parsing
- Edit extracted profile (skills, experience, education, certifications)
- Local storage for persistence

### 🔍 Job Search
- Search across multiple job portals (Indeed, LinkedIn)
- Filter by job title, location, salary range, and experience level
- Real-time scraping with intelligent caching

### 📊 Job Matching
- AI-powered match scoring (0-100 based on skills, experience)
- Detailed match breakdown showing matched skills
- Weighted algorithm: Skills (40%), Experience (30%), Education (20%), Keywords (10%)
- Sort results by match score

### 💾 Saved Jobs
- Bookmark jobs for later review
- Local storage for saved jobs
- Quick access to bookmarked opportunities

### 📈 Analytics Dashboard
- Match score distribution charts
- Top matched skills analysis
- Recent search history
- Application statistics

## Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Lucide React** for icons

### Backend
- **Node.js** with Express.js
- **PDF parsing**: pdfparse
- **DOCX parsing**: mammoth
- **Web scraping**: Cheerio, Puppeteer
- **Job matching**: TF-IDF algorithm
- **Natural Language**: natural (NLP library)

### Deployment
- **Render** for hosting
- **Docker** for containerization
- **GitHub** for version control and CI/CD

## Project Structure

```
MyJobSearch/
├── client/                 # React frontend app
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── api/            # API client
│   │   ├── pages/          # Page components
│   │   ├── types/          # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/                 # Express backend
│   ├── src/
│   │   ├── parsers/        # Resume parsing
│   │   ├── skills/         # Skill extraction
│   │   ├── scrapers/       # Job scraping
│   │   ├── matching/       # Match algorithm
│   │   ├── jobs/           # Job storage
│   │   ├── api/            # API routes
│   │   └── index.ts        # Express app
│   ├── package.json
│   └── .env.example
│
├── Dockerfile             # Docker configuration
├── render.yaml            # Render deployment config
├── package.json           # Root workspace config
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/solomonyelcin/MyJobSearch.git
   cd MyJobSearch
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cp server/.env.example server/.env
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

5. **Build for production**
   ```bash
   npm run build
   ```

### Deployment to Render

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy will automatically run on push to main

## Usage

### Upload Resume
1. Go to the Resume section
2. Drag and drop your resume or click to upload
3. Supported formats: PDF, DOCX, TXT
4. System automatically extracts skills, experience, education

### Search Jobs
1. Navigate to Job Search
2. Enter job title and location (required)
3. Optionally set salary range and experience level
4. Click "Search Jobs"
5. Results sorted by match score (highest first)

### Apply to Jobs
1. Click on a job card to view details
2. Review the match breakdown to see aligned skills
3. Click "Apply Now" to open job listing
4. Pre-filled information when available

### Bookmark Jobs
1. Click the bookmark icon on any job card
2. View all bookmarked jobs in "Saved Jobs" section
3. Bookmarks stored locally in browser

### View Analytics
1. Check Dashboard for match insights
2. See top matching skills across all jobs
3. View score distribution and trends

## API Endpoints

### Resume Management
- `POST /api/resume/upload` - Upload and parse resume
- `POST /api/resume/extract` - Extract structured data
- `PUT /api/profile` - Update extracted profile
- `GET /api/profile` - Get current profile

### Job Search
- `GET /api/jobs/search?q=&location=&salary=&exp=` - Search jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/bookmark` - Save job
- `GET /api/bookmarks` - Get saved jobs

### Job Matching
- `POST /api/match` - Calculate match scores
- `GET /api/analytics/scores` - Get score distribution
- `GET /api/analytics/skills` - Get top matched skills

## Features Pipeline

### Phase 1: MVP (Current)
- ✅ Resume upload and parsing
- ✅ Skill extraction
- ✅ Basic job scraping
- ✅ Match scoring algorithm
- ✅ Job search interface

### Phase 2: Enhanced (Upcoming)
- LinkedIn job scraping improvements
- Advanced filtering (remote, startup, etc.)
- Job description NLP analysis
- Recommended jobs based on profile
- Skill gap analysis

### Phase 3: Advanced (Future)
- User accounts and cloud sync
- Salary prediction based on skills
- Industry trend analysis
- Interview preparation guides
- Direct company integration
- AI cover letter generator

## Troubleshooting

### Resume Not Parsing Correctly
- Ensure resume is in supported format (PDF, DOCX, TXT)
- File size should be under 5MB
- Try uploading a simplified version

### No Jobs Found
- Check internet connection
- Try different job title/location
- Job scraping may be rate-limited (wait a few minutes)

### Match Score Seems Inaccurate
- Ensure all skills are properly extracted
- Check that job description loaded correctly
- Match algorithm weights: Skills (40%), Experience (30%), Education (20%), Keywords (10%)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues, suggestions, or feedback, please [open an issue](https://github.com/solomonyelcin/MyJobSearch/issues) on GitHub.

---

**Built with ❤️ for job seekers everywhere**
