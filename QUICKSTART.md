# Quick Start Checklist

## Before You Start
- [ ] You have Supabase account (created ✓)
- [ ] You have GitHub account (created ✓)
- [ ] You have Vercel account (created ✓)

## Setup (5-10 minutes)

1. [ ] Open Supabase → Your project → Settings → API
   - [ ] Copy Project URL
   - [ ] Copy anon key

2. [ ] Open Supabase → SQL Editor
   - [ ] Create new query
   - [ ] Paste contents of `SQL_SCHEMA.sql`
   - [ ] Click Run
   - [ ] Confirm "success"

3. [ ] In this folder:
   - [ ] Rename `.env.example` to `.env.local`
   - [ ] Paste your Supabase URL and key into `.env.local`

4. [ ] Push to GitHub:
   - [ ] `git init`
   - [ ] `git add .`
   - [ ] `git commit -m "Initial commit"`
   - [ ] Create repo on GitHub (https://github.com/new)
   - [ ] Copy the git push commands and run them

5. [ ] Deploy on Vercel:
   - [ ] Go to https://vercel.com/dashboard
   - [ ] Click "Add New" → "Project"
   - [ ] Import your GitHub repo
   - [ ] Paste Supabase credentials when asked
   - [ ] Click "Deploy"
   - [ ] Wait ~3 minutes

6. [ ] Test:
   - [ ] Open your Vercel URL
   - [ ] Click "Head office"
   - [ ] Enter: `12345678`
   - [ ] Should say "✓ Unlocked"

## Done!

Your live app is at your Vercel URL. Share it with operators.

For full analytics, ask to un-hide the dashboard in the code.
