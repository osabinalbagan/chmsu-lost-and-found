# Quick Start Guide - CHMSU Lost and Found + Supabase

## Step-by-Step Setup

### 1. Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click **New Repository**
3. Name it `chmsu-lost-and-found`
4. Make it **Public** (for GitHub Pages)
5. Click **Create Repository**

### 2. Upload Files

Upload all these files to your repository:
- `index.html`
- `style.css`
- `app.js`
- `logo.png`
- `supabase_schema.sql`
- `.github/workflows/deploy.yml`
- `.gitignore`
- `README.md`
- `config.js.template`
- `setup.sh`

### 3. Set Up Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) → Sign Up (Free)
2. Click **New Project**
3. Enter:
   - Organization: `CHMSU`
   - Project name: `chmsu-lost-and-found`
   - Database Password: (create a secure one)
   - Region: `Southeast Asia (Singapore)`
4. Click **Create New Project**
5. Wait for project to be ready (~2 minutes)

### 4. Create Database Tables

1. In Supabase, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open `supabase_schema.sql` from your files
4. Copy ALL the SQL code
5. Paste into the SQL Editor
6. Click **Run**
7. You should see "Success. No rows returned"

### 5. Get Your Supabase Credentials

1. In Supabase, click **Project Settings** (gear icon)
2. Click **API**
3. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon/public** key (starts with `eyJ...`)

### 6. Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** tab
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add these two secrets:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | Your Project URL |
| `SUPABASE_ANON_KEY` | Your anon key |

### 7. Enable GitHub Pages

1. In your GitHub repo, click **Settings**
2. In left sidebar, click **Pages**
3. Under **Source**, select **GitHub Actions**
4. That's it! The workflow will deploy automatically.

### 8. Access Your App

After deployment (takes ~2 minutes), your app will be at:
```
https://YOUR_USERNAME.github.io/chmsu-lost-and-found
```

**Login:**
- Username: `osasbinalbagan`
- Password: `osas.123`

---

## Troubleshooting

### "Supabase not configured" message?
- Check GitHub Secrets are set correctly
- Re-run the workflow: Actions → deploy.yml → Re-run jobs

### Database errors?
- Go to Supabase → SQL Editor
- Re-run the `supabase_schema.sql`

### Can't login?
- Check browser console for errors (F12 → Console)
- Verify Supabase credentials are correct

---

## Need Help?

Contact: osas.binalbagan@chmsu.edu.ph
