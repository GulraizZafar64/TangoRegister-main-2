import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from './supabase';
import { db } from './db';
import { adminUsers } from '@shared/schema';
import { eq, ilike } from 'drizzle-orm';

/**
 * Middleware to check if user is authenticated via Supabase
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase using the service role
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      console.error('Auth verification error:', error);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    if (!data.user) {
      return res.status(401).json({ error: 'Unauthorized - No user found' });
    }

    // Attach user to request
    (req as any).user = data.user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Middleware to check if user is an admin
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No auth header provided');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.substring(7);

    // Verify the JWT token
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    if (!data.user) {
      console.log('No user found in token');
      return res.status(401).json({ error: 'Unauthorized - No user found' });
    }

    const user = data.user;
    const userEmail = user.email || '';

    console.log('=== ADMIN VERIFICATION START ===');
    console.log('Checking admin access for user:', userEmail);
    console.log('User ID:', user.id);
    console.log('Email (normalized):', userEmail.toLowerCase().trim());

    // Check if user is an admin in our admins table
    try {
      // Try exact match first
      console.log('Querying adminUsers table for email (exact):', userEmail);
      let adminResults = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, userEmail))
        .limit(1);
      
      console.log('Exact match query results:', JSON.stringify(adminResults, null, 2));
      console.log('Number of results (exact):', adminResults.length);

      // If no exact match, try case-insensitive search using ILIKE (PostgreSQL)
      if (adminResults.length === 0) {
        console.log('No exact match found, trying case-insensitive search...');
        adminResults = await db
          .select()
          .from(adminUsers)
          .where(ilike(adminUsers.email, userEmail))
          .limit(1);
        console.log('Case-insensitive query results:', JSON.stringify(adminResults, null, 2));
        console.log('Number of results (case-insensitive):', adminResults.length);
      }
      
      // If still no match, list all admin emails for debugging
      if (adminResults.length === 0) {
        const allAdmins = await db.select().from(adminUsers).limit(10);
        console.log('No admin found. All admin emails in database:', allAdmins.map(a => `"${a.email}"`));
        console.log('Looking for:', `"${userEmail}"`);
        console.log('Case-sensitive comparison:', allAdmins.map(a => a.email === userEmail));
        console.log('Case-insensitive comparison:', allAdmins.map(a => a.email.toLowerCase() === userEmail.toLowerCase()));
      }

      const [admin] = adminResults;

      if (!admin) {
        console.log('User not found in admins table:', userEmail);
        // Also try case-insensitive search to help debug
        const allAdmins = await db.select().from(adminUsers).limit(10);
        console.log('Sample admin emails in database (first 10):', allAdmins.map(a => a.email));
        return res.status(403).json({ error: 'Forbidden - Admin access required' });
      }

      console.log('Admin found:', {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        isActive: admin.isActive,
        role: admin.role
      });

      if (!admin.isActive) {
        console.log('Admin account is not active:', userEmail);
        return res.status(403).json({ error: 'Forbidden - Admin account inactive' });
      }

      // Attach user and admin info to request
      (req as any).user = user;
      (req as any).admin = admin;
      next();
    } catch (dbError: any) {
      console.error('Database error in requireAdmin:', dbError);
      console.error('Database error details:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
      });
      return res.status(500).json({ 
        error: 'Database error during admin verification',
        message: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
  } catch (error: any) {
    console.error('Admin auth error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Authentication failed'
    });
  }
}

/**
 * Helper to get current user from request (if authenticated)
 */
export async function getCurrentUser(req: Request) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Get admin info from email
 */
export async function getAdminByEmail(email: string) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  return admin;
}

