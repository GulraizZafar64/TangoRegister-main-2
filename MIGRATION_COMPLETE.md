# Supabase Migration Complete

## What Was Changed

### ✅ Completed Changes

1. **Dependencies**
   - ✅ Removed: `@neondatabase/serverless`, `@google-cloud/storage`, `passport`, `passport-local`, `express-session`, `google-auth-library`, `openid-client`, `connect-pg-simple`, `memorystore`
   - ✅ Added: `@supabase/supabase-js`, `@supabase/auth-helpers-react`, `postgres`

2. **Database Connection**
   - ✅ Updated `server/db.ts` to use `postgres-js` for Supabase connection
   - ✅ Created `server/supabaseStorageImpl.ts` - Drizzle-based storage implementation using Supabase database
   - ✅ Updated `server/storage.ts` to export new Supabase storage

3. **Authentication**
   - ✅ Created `server/auth.ts` with Supabase auth middleware (`requireAuth`, `requireAdmin`)
   - ✅ Created `server/supabase.ts` with Supabase admin client
   - ✅ Updated login endpoint to use Supabase Auth (email/password)
   - ✅ Replaced all token-based auth with Supabase JWT auth
   - ✅ Updated client login form to use email instead of username

4. **File Storage**
   - ✅ Created `server/supabaseStorage.ts` - Supabase Storage service
   - ✅ Updated all object storage endpoints to use Supabase Storage
   - ✅ Simplified file upload/download flows

5. **Cleanup**
   - ✅ Deleted `server/objectStorage.ts`
   - ✅ Deleted `server/objectAcl.ts`
   - ✅ Removed old token generation/verification functions

## What You Need to Do

### 1. Set Up Supabase Project

1. Create a Supabase project at https://supabase.com
2. Wait for provisioning to complete
3. Get your credentials from Project Settings > API

### 2. Update Environment Variables

Add to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database URL (from Supabase Database Settings > Connection String > URI)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

For Vite (client-side), also add:
```bash
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Push Database Schema

```bash
npm run db:push
```

This will create all tables in your Supabase database.

### 4. Create Storage Buckets

In Supabase Dashboard > Storage:

1. Create bucket: `public-assets` (Public)
2. Create bucket: `user-uploads` (Private)

### 5. Set Up Row Level Security (RLS)

See `SUPABASE_SETUP.md` for detailed RLS policies. Key tables that need RLS:
- `registrations`
- `admins`
- `workshops`, `milongas`, `addons`, `events`, `tables`

### 6. Create Admin User

In Supabase Dashboard > Authentication > Users:
1. Add new user with your admin email
2. Then link to admins table:

```sql
INSERT INTO admins (username, email, password, role, is_active, permissions)
VALUES (
  'admin',
  'your-admin@email.com',
  '', -- Not used with Supabase Auth
  'admin',
  true,
  '{"users": true, "workshops": true, "registrations": true, "seats": true, "milongas": true, "addons": true, "payments": true, "reports": true}'::jsonb
);
```

### 7. Test the Migration

1. Start dev server: `npm run dev`
2. Go to `/admin-login`
3. Login with your Supabase admin email/password
4. Test creating events, workshops, etc.
5. Test file uploads
6. Test registration flow

## Architecture Changes

### Before:
```
┌─────────────────┐
│ Neon Database   │
│   (Postgres)    │
└─────────────────┘
         │
         │
┌─────────────────┐     ┌──────────────────┐
│  Google Cloud   │     │   Passport.js    │
│     Storage     │     │  (Custom Auth)   │
└─────────────────┘     └──────────────────┘
```

### After:
```
┌────────────────────────────────┐
│         Supabase               │
│  ┌──────────────────────────┐  │
│  │  Postgres Database       │  │
│  ├──────────────────────────┤  │
│  │  Storage Buckets         │  │
│  ├──────────────────────────┤  │
│  │  Authentication (JWT)    │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

## Benefits Achieved

✅ **Single Platform**: Database + Storage + Auth all in one place
✅ **Portability**: No longer tied to Replit's infrastructure
✅ **Scalability**: Supabase provides better scaling options
✅ **Security**: Built-in RLS for database-level security
✅ **Developer Experience**: Better tools and documentation
✅ **Cost**: More predictable pricing and better free tier

## Troubleshooting

### "Missing SUPABASE_URL" Error
Make sure you've set all environment variables in `.env` file.

### "Admin privileges required" on Login
Check that your admin user exists in the `admins` table and `is_active = true`.

### File Upload Fails
1. Verify storage buckets exist in Supabase
2. Check storage policies are configured
3. Ensure token is being sent in Authorization header

### Database Connection Fails
1. Verify DATABASE_URL is correct
2. Check your Supabase project is active
3. Try running `npm run db:push` to sync schema

## Next Steps

After testing the migration:
1. Update any CI/CD pipelines with new environment variables
2. Consider setting up Supabase Edge Functions for advanced features
3. Enable Realtime subscriptions for live dashboard updates
4. Set up backups in Supabase dashboard

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Drizzle Docs: https://orm.drizzle.team/docs/overview
- Check `SUPABASE_SETUP.md` for detailed setup instructions

