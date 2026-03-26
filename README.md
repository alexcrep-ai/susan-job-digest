# Susan's Daily Job Digest

A Next.js app that searches for senior advertising sales and partnership roles in NYC, validates them with Claude AI, and sends a curated digest to your inbox every morning at 9 AM EST.

---

## What it does

1. Runs 8 targeted job searches across LinkedIn, Indeed, Glassdoor, and Google Jobs via JSearch API
2. Filters by: NYC location, posted within 72 hours, salary $150K+
3. Sends each listing to Claude to validate it's genuinely advertising/partnership focused
4. Emails a clean digest to a.crepault@gmail.com with only verified matches
5. Runs automatically every day at 9 AM EST via Vercel Cron

---

## Deploy to Vercel (takes ~5 minutes)

### Step 1: Push to GitHub
Create a new repo on github.com and push this folder:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/susan-job-digest.git
git push -u origin main
```

### Step 2: Connect to Vercel
1. Go to vercel.com and sign in (free account)
2. Click "Add New Project"
3. Import your GitHub repo
4. Click Deploy (defaults are fine)

### Step 3: Add Environment Variables
In your Vercel project dashboard, go to Settings > Environment Variables and add:

| Key | Value |
|-----|-------|
| `JSEARCH_API_KEY` | your_jsearch_key_here |
| `ANTHROPIC_API_KEY` | your_anthropic_key_here |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | your_emailjs_service_id |
| `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID` | your_emailjs_template_id |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | your_emailjs_public_key |
| `DIGEST_EMAIL` | a.crepault@gmail.com |

### Step 4: Set up EmailJS Template
In your EmailJS dashboard, edit the template (template_tjrfk6p) to use these variables:
- Subject: `{{subject}}`
- Body: `{{email_body}}`
- To email: `{{to_email}}`

### Step 5: Redeploy
After adding env vars, go to Deployments and click "Redeploy" on the latest deploy.

---

## Test it manually
Visit your Vercel URL and click "Run Digest Now" to trigger a search immediately. You'll see results on screen and receive an email.

---

## Customize search criteria
Edit `lib/config.js` to change:
- Target job titles
- Target industries and companies
- Minimum salary
- Max job age (hours)
- Email recipient

No other files need to change.

---

## Cost estimate
- Vercel: Free tier (hobby plan covers cron jobs)
- JSearch: Free tier (500 req/month, daily digest uses ~8/day = ~240/month, just within limit)
- Anthropic API: ~$0.01-0.05/day depending on jobs validated
- EmailJS: Free tier (200 emails/month)

**Total monthly cost: ~$1-2 in Claude API usage only.**
