# Render Deployment Guide

This guide walks you through deploying the Job Search Intelligence Platform to Render.

## Prerequisites

- GitHub account with the repository pushed (✅ Already done)
- Render account (free tier available)
- GitHub token for API access (✅ Already set up)

## Step-by-Step Deployment

### 1. Create a Render Account

1. Go to [render.com](https://render.com)
2. Click "Get Started"
3. Sign up with GitHub (recommended for easier integration)
4. Authorize Render to access your GitHub account

### 2. Create a New Web Service

1. Click the **"New +"** button in the top-right
2. Select **"Web Service"**
3. In the "Connect a repository" section, search for **"MyJobSearch"**
4. Click **"Connect"** next to your MyJobSearch repository
5. You'll be redirected to the deployment configuration page

### 3. Configure Deployment Settings

On the deployment configuration page, fill in the following:

**Basic Settings:**
- **Name**: `job-search-intelligence` (or your preferred name)
- **Runtime**: Docker
- **Region**: Oregon (or your preferred region)
- **Branch**: main

**Build Settings:**
- **Build Command**: `npm run install-all && npm run build`
- **Start Command**: `npm start`

**Environment Variables:**
Click **"Add Environment Variable"** and add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `CORS_ORIGIN` | `https://job-search-intelligence.onrender.com` |
| `MAX_RESUME_SIZE` | `5242880` |
| `SCRAPER_DELAY_MS` | `2000` |

(Replace `job-search-intelligence` with your actual Render app name)

**Plan:**
- Select **"Free"** tier (for testing/development)
- Or **"Starter"** tier for production use

### 4. Deploy

1. Click the **"Create Web Service"** button
2. Render will start building your application
3. This typically takes 3-5 minutes
4. You'll see build logs in real-time
5. Once deployment is complete, you'll see a green checkmark and a live URL

### 5. Verify Deployment

Once the deployment is complete:

1. Click the URL provided (e.g., `https://job-search-intelligence.onrender.com`)
2. The Job Search Intelligence app should load
3. Test the functionality:
   - Upload a resume
   - Search for jobs
   - Verify match scores

### 6. Set Up Auto-Deployment (Optional)

Render automatically deploys on push to the connected branch. To verify this is enabled:

1. Go to your service settings
2. Under **"Deploy"**, ensure **"Auto-Deploy"** is enabled
3. Now every push to `main` will automatically redeploy

## Troubleshooting

### Build Fails with "Out of Memory"

The free tier has limited resources. If builds fail:
- Upgrade to a paid tier
- Or optimize dependencies (remove unused packages)

### Application crashes after deployment

Check the live logs:
1. In your Render dashboard, click on the service
2. Click **"Logs"** tab
3. Look for error messages
4. Common issues:
   - Missing environment variables
   - Port not bound correctly
   - File permissions

### Slow scraping/timeouts

Indeed and LinkedIn have rate limiting. If scraping times out:
- Increase `SCRAPER_DELAY_MS` in environment variables (set to 3000-5000)
- Or use fallback mock data (built-in)

### Cold starts

Free tier instances sleep after 15 minutes of inactivity. First request will take 30-60 seconds. Upgrade to paid tier to avoid cold starts.

## Production Considerations

For production deployment:

1. **Use a paid tier** - Better performance, no cold starts
2. **Add database** - Replace in-memory storage with PostgreSQL or MongoDB
3. **Add authentication** - Implement user accounts
4. **Enable HTTPS** - Render provides free SSL certificates
5. **Set up monitoring** - Use Render's built-in monitoring or integrate with services like Datadog
6. **Add backup strategy** - If using database
7. **Increase timeouts** - For job scraping operations

## Environment Variables Reference

```bash
# Server Configuration
PORT=3000                           # Server port
NODE_ENV=production                 # Environment (development/production)
CORS_ORIGIN=https://your-app.com   # CORS allowed origin

# Resume Upload
MAX_RESUME_SIZE=5242880            # Max file size in bytes (5MB)
UPLOAD_DIR=./uploads               # Upload directory

# Job Scraping
SCRAPER_TIMEOUT=30000              # Scraper timeout in ms
SCRAPER_DELAY_MS=2000              # Delay between requests in ms
INDEED_BASE_URL=https://www.indeed.com
LINKEDIN_BASE_URL=https://www.linkedin.com/jobs

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15000         # Rate limit window
RATE_LIMIT_MAX_REQUESTS=30         # Max requests per window

# Logging
LOG_LEVEL=info                      # Log level (debug/info/warn/error)
```

## Next Steps

After successful deployment:

1. **Share your app URL** with others
2. **Gather feedback** on the interface and functionality
3. **Add more features**:
   - User authentication
   - Database integration
   - Advanced job filtering
   - Email notifications for new job matches
   - Cover letter generation
4. **Optimize performance**:
   - Implement caching
   - Add job search API integration (alternative to scraping)
   - Improve matching algorithm with ML

## Support

If you encounter issues:

1. Check Render logs: Dashboard → Service → Logs
2. Check local development: Run `npm run dev` locally
3. Review environment variables are set correctly
4. Check GitHub actions if using CI/CD

## Deployment Architecture

```
GitHub Repository (MyJobSearch)
        ↓
   Render Platform
        ↓
   ┌────────────────┐
   │  Docker Build  │
   │  ├─ Frontend   │
   │  └─ Backend    │
   └────────────────┘
        ↓
   Deployed Service
   ├─ Frontend (React)
   ├─ Backend (Node.js/Express)
   └─ Static Files
```

---

**Deployment Status**: Ready to deploy! 🚀
