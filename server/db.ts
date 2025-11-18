import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let clientInstance: ReturnType<typeof postgres> | null = null;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  return url;
}

// Lazy initialization of database connection
export function getDb() {
  if (!dbInstance) {
    try {
      const databaseUrl = getDatabaseUrl();
      console.log("Creating database connection...");
      clientInstance = postgres(databaseUrl, {
        max: 1, // Important for serverless - limit connections
        idle_timeout: 20,
        connect_timeout: 10,
      });
      dbInstance = drizzle(clientInstance, { schema });
      console.log("Database connection created");
    } catch (error: any) {
      console.error("Failed to create database connection:", error);
      throw error;
    }
  }
  return dbInstance;
}

// Export db for backward compatibility
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  }
});
