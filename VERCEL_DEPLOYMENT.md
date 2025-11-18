# Vercel Deployment Guide

This guide will help you deploy the TangoRegister application to Vercel and troubleshoot common issues, especially the "admin verification failed" error.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. A Supabase project with database and authentication configured
3. All environment variables ready (see below)

## Step 1: Prepare Your Repository

Ensure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket). Vercel will connect to this repository for deployments.

## Step 2: Set Up Environment Variables in Vercel

Go to your Vercel project dashboard → Settings → Environment Variables and add the following:

### Required Environment Variables

#### Supabase Configuration
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Database Connection
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.your-project.supabase.co:5432/postgres
```

#### Client-Side Supabase (Build-time variables)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important**: `VITE_*` variables are used during the build process. Vercel will automatically make them available if you set them as environment variables.

#### Stripe Configuration
```
STRIPE_SECRET_KEY=sk_live_... or sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_live_... or pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (if using webhooks)
```

#### SendGrid Configuration
```
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

#### Environment
```
NODE_ENV=production
```

### Where to Get These Values

1. **Supabase Variables**: 
   - Go to Supabase Dashboard → Settings → API
   - Copy Project URL, anon public key, and service_role key

2. **Database URL**:
   - Go to Supabase Dashboard → Settings → Database
   - Copy Connection string (URI format)
   - Replace `[YOUR-PASSWORD]` with your actual database password

3. **Stripe Keys**: 
   - From your Stripe Dashboard → Developers → API keys

4. **SendGrid**: 
   - From your SendGrid account → Settings → API Keys

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Vercel will auto-detect the configuration from `vercel.json`
4. Add all environment variables (see Step 2)
5. Click "Deploy"

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

## Step 4: Verify Deployment

After deployment, test the following:

1. **Frontend loads**: Visit your Vercel URL
2. **Public API works**: Try `/api/workshops` or `/api/events/current`
3. **Admin login**: Try logging in at `/admin-login`
4. **Admin verification**: After login, verify you can access admin routes

## Troubleshooting

### Issue: "Admin verification failed" Error

This is the most common issue. Here's how to fix it:

#### 1. Check Environment Variables

Verify these are set correctly in Vercel:
- `SUPABASE_SERVICE_ROLE_KEY` - Must be the service_role key, NOT the anon key
- `SUPABASE_URL` - Must match your Supabase project URL
- `DATABASE_URL` - Must be correct and accessible

#### 2. Verify Admin User Exists

1. Connect to your Supabase database
2. Check the `adminUsers` table:
   ```sql
   SELECT * FROM "adminUsers" WHERE "isActive" = true;
   ```
3. Ensure your login email matches exactly (case-sensitive in some cases)

#### 3. Check Supabase Auth User

1. Go to Supabase Dashboard → Authentication → Users
2. Verify the user exists and is confirmed
3. The email in Supabase Auth must match the email in `adminUsers` table

#### 4. Check Server Logs

1. Go to Vercel Dashboard → Your Project → Functions
2. Click on the function that failed
3. Check the logs for detailed error messages
4. Look for:
   - Database connection errors
   - Supabase authentication errors
   - Email mismatch errors

#### 5. Test Database Connection

The database connection might be failing. Check:
- `DATABASE_URL` format is correct
- Database password is correct
- Supabase allows connections from Vercel (should be enabled by default)

#### 6. Verify Token Flow

1. Check browser console for network errors
2. Verify the token is being sent in Authorization header
3. Check if token is valid (not expired)

### Issue: API Requests Return 404

1. Check `vercel.json` configuration
2. Verify the `api/index.ts` file exists
3. Check Vercel function logs for errors
4. Ensure routes are properly configured

### Issue: Database Connection Errors

1. Verify `DATABASE_URL` is correct
2. Check Supabase connection pooling settings
3. Ensure database is not paused (Supabase free tier pauses after inactivity)
4. Check connection limits (serverless functions use `max: 1` connection)

### Issue: Build Fails

1. Check build logs in Vercel dashboard
2. Verify all dependencies are in `package.json`
3. Check for TypeScript errors: `npm run check`
4. Ensure build script works locally: `npm run build`

### Issue: Frontend Assets Not Loading

1. Verify `dist/public` directory exists after build
2. Check `vercel.json` outputDirectory is correct
3. Ensure static files are being served correctly

## Environment Variable Checklist

Before deploying, verify you have set:

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`
- [ ] `VITE_SUPABASE_URL` (same as SUPABASE_URL)
- [ ] `VITE_SUPABASE_ANON_KEY` (same as SUPABASE_ANON_KEY)
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET` (if using webhooks)
- [ ] `SENDGRID_API_KEY`
- [ ] `SENDGRID_FROM_EMAIL`
- [ ] `NODE_ENV=production`

## Testing Admin Login After Deployment

1. Navigate to `https://your-app.vercel.app/admin-login`
2. Enter your admin email and password
3. Check browser console for errors
4. Check Vercel function logs if login fails
5. Verify the admin user exists in both:
   - Supabase Authentication (Auth → Users)
   - Database `adminUsers` table (with `isActive = true`)

## Additional Notes

- **Cold Starts**: First request after inactivity may be slower (serverless cold start)
- **Function Timeout**: Default is 10 seconds, can be increased in Vercel settings
- **Database Connections**: Serverless functions use connection pooling with `max: 1`
- **Environment Variables**: Changes require a new deployment to take effect

## Getting Help

If you continue to experience issues:

1. Check Vercel function logs for detailed error messages
2. Check browser console for client-side errors
3. Verify all environment variables are set correctly
4. Test database connection separately
5. Test Supabase authentication separately

## Local Testing

Before deploying, test locally with production-like environment:

```bash
# Set environment variables
export NODE_ENV=production
export SUPABASE_URL=...
# ... set all other variables

# Build
npm run build

# Test the build
npm start
```

Then test admin login locally to ensure it works before deploying.

