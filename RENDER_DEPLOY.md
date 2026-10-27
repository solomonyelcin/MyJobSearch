# Job Search Intelligence - Render Deployment Setup

This file helps automate and verify your Render deployment.

## Step 1: Create Render Account (If needed)

Go to https://render.com and sign up with GitHub (recommended)

## Step 2: Create Web Service on Render

**Follow these steps exactly:**

1. **Log in to Render Dashboard**: https://dashboard.render.com
2. **Click "+ New" button** (top right)
3. **Select "Web Service"**
4. **In "Connect a repository" section:**
   - Search for: `MyJobSearch`
   - Click "Connect" next to `solomonyelcin/MyJobSearch`

## Step 3: Configure the Service

Fill in the form with these values:

### Name & Environment
- **Name**: `job-search-intelligence`
- **Runtime**: Select **Docker**
- **Region**: Select your closest region (e.g., Oregon)
- **Branch**: `main`

### Build Command
```
npm run install-all && npm run build
```

### Start Command
```
npm start
```

### Environment Variables
Click "Add Environment Variable" for each:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `CORS_ORIGIN` | `*` |
| `MAX_RESUME_SIZE` | `5242880` |
| `SCRAPER_DELAY_MS` | `2000` |
| `UPLOAD_DIR` | `./uploads` |
| `LOG_LEVEL` | `info` |

### Plan Selection
- Select **"Free"** to test
- Or **"Starter"** ($7/month) for better performance

## Step 4: Deploy

Click the **"Create Web Service"** button

Watch the build logs - it will take 3-5 minutes

## Step 5: Verify Deployment

Once you see a green checkmark and a live URL:

1. **Note your URL** (e.g., `https://job-search-intelligence.onrender.com`)
2. **Visit the URL** in your browser
3. **Test the app** - upload a resume, search for jobs

## Expected Build Output

You should see:
```
Building from Dockerfile...
Installing dependencies...
Building client...
Building server...
Creating Docker image...
Deploying...
```

Then a success message with your live URL.

## Troubleshooting

### If build fails:
1. Check the build logs for specific errors
2. Verify all environment variables are set
3. Ensure Node.js 18+ requirement is met

### If deployment times out:
- Render free tier builds can be slow
- Try upgrading to Starter tier
- Or wait 10 minutes and try again

### If app crashes after deploy:
1. Check the "Logs" tab in Render dashboard
2. Look for error messages
3. Common issues:
   - Missing environment variables
   - Port binding issues
   - Package installation failure

## After Successful Deployment

✅ Your app is live!

Test all features:
- [ ] Upload resume
- [ ] View extracted skills
- [ ] Search for jobs
- [ ] See match scores
- [ ] Bookmark jobs
- [ ] View analytics

## Auto-Deploy on Future Pushes

Every time you push to GitHub main branch:
1. Render automatically redeploys
2. Watch the "Deploy" tab for status
3. Live site updates within 3-5 minutes

## Get Your Live URL

Once deployed, your app URL will be something like:
```
https://job-search-intelligence.onrender.com
```

You can change this subdomain in Render settings if needed.

---

**Ready? Let's deploy!** 🚀
