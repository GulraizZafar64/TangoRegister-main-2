# Supabase Setup Guide

## 1. Create Supabase Project
1. Go to https://supabase.com and create a new project
2. Wait for the project to be provisioned
3. Get your project credentials from Settings > API

## 2. Environment Variables
Add these to your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database Connection String (from Database Settings)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

For client-side (Vite), also add to `.env`:
```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Push Database Schema
Run the Drizzle migration to create tables:
```bash
npm run db:push
```

## 4. Set Up Row Level Security (RLS)
In the Supabase Dashboard, go to Authentication > Policies and add these policies:

### Registrations Table
Enable RLS on the `registrations` table, then add:
- **SELECT policy**: Allow users to read their own registrations
  ```sql
  CREATE POLICY "Users can view own registrations"
  ON registrations FOR SELECT
  USING (auth.uid() = id::uuid);
  ```
- **INSERT policy**: Allow public inserts (for registration form)
  ```sql
  CREATE POLICY "Anyone can create registrations"
  ON registrations FOR INSERT
  WITH CHECK (true);
  ```

### Admin Tables (admins)
Enable RLS, admin-only access:
```sql
CREATE POLICY "Admins only"
ON admins FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admins 
    WHERE id = auth.uid()::integer 
    AND is_active = true
  )
);
```

### Public Read Tables (workshops, milongas, addons, events, tables)
For each of these tables, enable RLS with:
```sql
-- Public read access
CREATE POLICY "Public read access"
ON [table_name] FOR SELECT
USING (true);

-- Admin write access (you'll need to implement admin role checking)
CREATE POLICY "Admin write access"
ON [table_name] FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM admins 
    WHERE username = current_user 
    AND is_active = true
  )
);
```

## 5. Set Up Storage Buckets

### Create Buckets
In Storage section, create two buckets:

1. **public-assets** (Public bucket)
   - For layout images, public files
   - Enable public access
   
2. **user-uploads** (Private bucket)
   - For user-uploaded files (t-shirt designs, etc.)
   - Private access with policies

### Storage Policies

For **user-uploads** bucket:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-uploads');

-- Allow admins to read all files
CREATE POLICY "Admins can read all"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-uploads' AND
  EXISTS (
    SELECT 1 FROM admins 
    WHERE id = auth.uid()::integer 
    AND is_active = true
  )
);
```

For **public-assets** bucket:
```sql
-- Public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-assets');

-- Admin write access
CREATE POLICY "Admin write access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-assets' AND
  EXISTS (
    SELECT 1 FROM admins 
    WHERE id = auth.uid()::integer 
    AND is_active = true
  )
);
```

## 6. Authentication Setup

### Create Admin Users
Since we're replacing the Passport auth system, you'll need to create admin users in Supabase Auth:

1. Go to Authentication > Users
2. Add a new user with admin email
3. Then link it to your admins table:
   ```sql
   INSERT INTO admins (username, email, password, role, is_active, permissions)
   VALUES (
     'admin',
     'admin@example.com',
     'hashed_password_not_used_with_supabase',
     'admin',
     true,
     '{"users": true, "workshops": true, "registrations": true}'::jsonb
   );
   ```

## 7. Test Connection
Once everything is set up:
1. Start your dev server: `npm run dev`
2. The app should connect to Supabase
3. Test admin login
4. Test file uploads
5. Test registration flow

