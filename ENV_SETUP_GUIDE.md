# Environment Variables Setup Guide

## Step 1: Get Your Supabase Credentials

### A. Create Supabase Project (if you haven't)
1. Go to https://supabase.com
2. Sign in or create account
3. Click **"New Project"**
4. Fill in:
   - **Name**: TangoRegister (or any name you prefer)
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"**
6. Wait 2-3 minutes for provisioning

### B. Get API Keys
1. In your Supabase project dashboard, go to **Settings** (gear icon) → **API**
2. You'll see three important values:

**Copy these:**
- **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
- **anon public key**: Long JWT token starting with `eyJhbGci...`
- **service_role key**: Another long JWT token (keep this SECRET!)

### C. Get Database Connection String
1. Still in Settings, go to **Database** (in left sidebar)
2. Scroll to **Connection string** section
3. Select **URI** tab (not "Connection pooling")
4. Copy the connection string
5. **IMPORTANT**: Replace `[YOUR-PASSWORD]` with the database password you created in Step 1A

## Step 2: Update Your .env File

Open your `.env` file and add/update these variables:

```bash
# =================================
# SUPABASE CONFIGURATION
# =================================
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# =================================
# DATABASE CONNECTION
# =================================
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# =================================
# CLIENT-SIDE (Vite uses VITE_ prefix)
# =================================
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# =================================
# KEEP YOUR EXISTING VARIABLES BELOW
# =================================
# Stripe
STRIPE_SECRET_KEY=your_existing_stripe_key
STRIPE_PUBLISHABLE_KEY=your_existing_stripe_pub_key
STRIPE_WEBHOOK_SECRET=your_existing_stripe_webhook

# SendGrid
SENDGRID_API_KEY=your_existing_sendgrid_key
SENDGRID_FROM_EMAIL=your_existing_from_email

# Server
PORT=8080
NODE_ENV=development
```

## Step 3: Variables Explained

| Variable | Where It's Used | Keep Secret? | Where to Get |
|----------|----------------|--------------|--------------|
| `SUPABASE_URL` | Server & Client | No | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Server & Client | No (safe for browser) | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only | **YES!** Never expose! | Supabase Dashboard → Settings → API |
| `DATABASE_URL` | Server (Drizzle) | **YES!** Contains password | Supabase Dashboard → Settings → Database |
| `VITE_SUPABASE_URL` | Client (Vite) | No (same as SUPABASE_URL) | Same as SUPABASE_URL |
| `VITE_SUPABASE_ANON_KEY` | Client (Vite) | No (same as SUPABASE_ANON_KEY) | Same as SUPABASE_ANON_KEY |

## Step 4: What to Remove

You can **DELETE** these old variables (no longer needed):
```bash
# Remove these if they exist:
PRIVATE_OBJECT_DIR
PUBLIC_OBJECT_SEARCH_PATHS
ADMIN_TOKEN_SECRET
SESSION_SECRET
```

## Step 5: Verify Your Setup

After updating your `.env` file:

1. **Check the file exists**: `.env` should be in your project root
2. **Restart your dev server** if it's running
3. **Test database connection**:
   ```bash
   npm run db:push
   ```
   If this succeeds, your database connection is working!

4. **Test the app**:
   ```bash
   npm run dev
   ```

## Example .env File (with fake values)

```bash
# Supabase
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTExMjEyMCwiZXhwIjoxOTYwNjg4MTIwfQ.fake_signature_here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQ1MTEyMTIwLCJleHAiOjE5NjA2ODgxMjB9.fake_signature_here

# Database
DATABASE_URL=postgresql://postgres:MyStr0ngP@ssw0rd@db.abcdefghijklmnop.supabase.co:5432/postgres

# Client (Vite)
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTExMjEyMCwiZXhwIjoxOTYwNjg4MTIwfQ.fake_signature_here

# Stripe (keep your existing values)
STRIPE_SECRET_KEY=sk_test_51abc123...
STRIPE_PUBLISHABLE_KEY=pk_test_51xyz789...
STRIPE_WEBHOOK_SECRET=whsec_abc123...

# SendGrid (keep your existing values)
SENDGRID_API_KEY=SG.abc123...
SENDGRID_FROM_EMAIL=noreply@tangofestival.com

# Server
PORT=8080
NODE_ENV=development
```

## Troubleshooting

### "Missing SUPABASE_URL" error
- Make sure you've added all variables to `.env`
- Restart your terminal/dev server
- Check for typos in variable names

### "Invalid database connection" error
- Verify your DATABASE_URL has the correct password
- Make sure there are no extra spaces
- Check the URL format matches exactly

### Client can't connect to Supabase
- Make sure you've added the `VITE_` prefixed variables
- Vite requires a restart to pick up new env vars
- Check browser console for specific errors

## Security Reminder

⚠️ **NEVER commit `.env` to git!**

Your `.gitignore` should already have:
```
.env
.env.local
.env.*.local
```

The `.env` file contains secrets and should NEVER be pushed to GitHub or any repository!

## Next Steps

After updating your `.env`:
1. ✅ Run `npm run db:push` to create tables
2. ✅ Set up storage buckets (see SUPABASE_SETUP.md)
3. ✅ Configure RLS policies (see SUPABASE_SETUP.md)
4. ✅ Create admin user (see MIGRATION_COMPLETE.md)
5. ✅ Test your application

