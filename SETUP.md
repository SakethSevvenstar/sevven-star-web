# Sevven Star Floor Management — Setup Guide

## Step 1: Get Your Supabase Credentials

1. Log in to your Supabase dashboard (https://supabase.com)
2. Click on **SakethSevvenstar's Project**
3. Go to **Settings → API** (left sidebar)
4. Copy:
   - **Project URL** (looks like: `https://bjoimlgqnconxnkuskyg.supabase.co`)
   - **anon public** key (long string starting with `eyJhbG...`)

## Step 2: Create the Database Tables

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. **Paste the entire contents** of `SQL_SCHEMA.sql` (in this folder)
4. Click **Run** (green button)
5. Wait for it to finish (should say "success")

## Step 3: Set Up Environment Variables

1. In this folder, **rename** `.env.example` to `.env.local`
2. Edit `.env.local` and fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://bjoimlgqnconxnkuskyg.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## Step 4: Push to GitHub

1. Install Git (https://git-scm.com) if you don't have it
2. Open Terminal (Mac/Linux) or Command Prompt (Windows)
3. Navigate to this folder:
   ```
   cd sevven-star-web
   ```
4. Run these commands:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   ```
5. Go to https://github.com/new
6. Create a new repository called `sevven-star-web`
7. **Copy the commands** it gives you and run them in Terminal:
   ```
   git remote add origin https://github.com/YourUsername/sevven-star-web.git
   git branch -M main
   git push -u origin main
   ```

## Step 5: Deploy to Vercel

1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Select **Import Git Repository**
4. Find and click `sevven-star-web`
5. **It will auto-detect** the environment variables you need
6. Paste your Supabase credentials when asked
7. Click **Deploy**
8. Wait ~3 minutes. You'll get a live URL like:
   ```
   https://sevven-star-web.vercel.app
   ```

## Step 6: Test It

1. Open your live URL
2. Click **Head office** tab
3. Enter password: `12345678`
4. You should see "✓ Unlocked"

## You're Done!

Give operators the live URL. They can start logging machines and stock.

---

## Support

- **Supabase issues?** Check https://supabase.com/docs
- **Vercel not deploying?** Check the Deployment logs in your Vercel dashboard
- **Questions about the code?** The app is in `components/FloorApp.jsx`

## Future: Add the Full UI

The dashboard, charts, and operator flows are ready in `FloorApp.jsx` but hidden for now. Once you confirm everything is working with Supabase, I can un-hide them and you'll have the full analytics dashboard live.
