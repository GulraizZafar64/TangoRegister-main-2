import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(), // Links to specific event year
  packageType: text("package_type").notNull(), // 'full', 'evening', 'custom', 'premium-accommodation-4nights', 'premium-accommodation-3nights'
  role: text("role").notNull(), // 'leader', 'follower', 'couple'
  leaderInfo: jsonb("leader_info"),
  followerInfo: jsonb("follower_info"),
  workshopIds: jsonb("workshop_ids").default([]),
  seatIds: jsonb("seat_ids").default([]),
  milongaIds: jsonb("milonga_ids").default([]),
  selectedTableNumber: integer("selected_table_number"),
  addons: jsonb("addons").default([]),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"), // 'stripe', 'offline'
  paymentStatus: text("payment_status").default('pending'), // 'pending', 'completed', 'failed'
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workshops = pgTable("workshops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(), // Links to specific event year
  title: text("title").notNull(),
  instructor: text("instructor").notNull(),
  level: text("level").notNull(), // 'beginner', 'intermediate', 'advanced', 'professional'
  description: text("description").notNull(),
  date: timestamp("date").notNull(), // Changed from text to timestamp
  time: text("time").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  earlyBirdPrice: decimal("early_bird_price", { precision: 10, scale: 2 }).default('0'),
  earlyBirdEndDate: timestamp("early_bird_end_date"), // Changed from text to timestamp
  capacity: integer("capacity").notNull(), // Total capacity
  enrolled: integer("enrolled").default(0), // Total enrolled
  leaderCapacity: integer("leader_capacity").notNull(), // Maximum leaders
  followerCapacity: integer("follower_capacity").notNull(), // Maximum followers
  leadersEnrolled: integer("leaders_enrolled").default(0), // Current leaders enrolled
  followersEnrolled: integer("followers_enrolled").default(0), // Current followers enrolled
});

// New simplified table system
export const tables = pgTable("tables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(), // Links to specific event year
  tableNumber: integer("table_number").notNull(),
  totalSeats: integer("total_seats").notNull().default(6), // Each table has 6 seats
  occupiedSeats: integer("occupied_seats").notNull().default(0),
  isVip: boolean("is_vip").default(false),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  earlyBirdPrice: decimal("early_bird_price", { precision: 10, scale: 2 }).default('0'),
  earlyBirdEndDate: text("early_bird_end_date"),
  isActive: boolean("is_active").default(true),
});

// Layout settings for admin
export const layoutSettings = pgTable("layout_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layoutImageUrl: text("layout_image_url"), // URL to uploaded layout image
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Keep seats table for backward compatibility but simplify it
export const seats = pgTable("seats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tableName: text("table_name").notNull(),
  seatNumber: integer("seat_number").notNull(),
  isVip: boolean("is_vip").default(false),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isAvailable: boolean("is_available").default(true),
});

export const milongas = pgTable("milongas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(), // Links to specific event year
  name: text("name").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  venue: text("venue").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  earlyBirdPrice: decimal("early_bird_price", { precision: 10, scale: 2 }).default('0'),
  earlyBirdEndDate: text("early_bird_end_date"),
  type: text("type").notNull(), // 'regular', 'gala', 'desert'
  capacity: integer("capacity").notNull(),
  enrolled: integer("enrolled").default(0),
});

export const addons = pgTable("addons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(), // Links to specific event year
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(), // 'clothing', 'merchandise', 'accessories', 'transportation'
  options: jsonb("options").default({}), // size, color, etc.
});

// Use existing admins table structure from database
export const adminUsers = pgTable("admins", {
  id: integer("id").primaryKey(),
  username: varchar("username").notNull().unique(),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  role: varchar("role").notNull(),
  isActive: boolean("is_active").notNull(),
  permissions: jsonb("permissions"),
  lastLoginAt: timestamp("last_login"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at")
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  year: integer("year").notNull().unique(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  registrationOpenDate: timestamp("registration_open_date").notNull(),
  registrationCloseDate: timestamp("registration_close_date").notNull(),
  description: text("description"),
  venue: varchar("venue", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true),
  isCurrent: boolean("is_current").default(false), // Only one event should be current at a time
  workshopStandardPrice: decimal("workshop_standard_price", { precision: 10, scale: 2 }).default('0'),
  workshopEarlyBirdPrice: decimal("workshop_early_bird_price", { precision: 10, scale: 2 }).default('0'),
  workshopEarlyBirdEndDate: text("workshop_early_bird_end_date"),
  
  // Full Package Pricing
  fullPackageStandardPrice: decimal("full_package_standard_price", { precision: 10, scale: 2 }).default('0'),
  fullPackageEarlyBirdPrice: decimal("full_package_early_bird_price", { precision: 10, scale: 2 }).default('0'),
  fullPackageEarlyBirdEndDate: text("full_package_early_bird_end_date"),
  fullPackage24HourPrice: decimal("full_package_24_hour_price", { precision: 10, scale: 2 }).default('0'),
  fullPackage24HourStartDate: text("full_package_24_hour_start_date"),
  fullPackage24HourEndDate: text("full_package_24_hour_end_date"),

  // Evening Package Pricing
  eveningPackageStandardPrice: decimal("evening_package_standard_price", { precision: 10, scale: 2 }).default('0'),
  eveningPackageEarlyBirdPrice: decimal("evening_package_early_bird_price", { precision: 10, scale: 2 }).default('0'),
  eveningPackageEarlyBirdEndDate: text("evening_package_early_bird_end_date"),
  eveningPackage24HourPrice: decimal("evening_package_24_hour_price", { precision: 10, scale: 2 }).default('0'),
  eveningPackage24HourStartDate: text("evening_package_24_hour_start_date"),
  eveningPackage24HourEndDate: text("evening_package_24_hour_end_date"),

  // Premium + 4 Nights Accommodation Pricing
  premiumAccommodation4NightsSinglePrice: decimal("premium_accommodation_4nights_single_price", { precision: 10, scale: 2 }).default('0'),
  premiumAccommodation4NightsDoublePrice: decimal("premium_accommodation_4nights_double_price", { precision: 10, scale: 2 }).default('0'),
  premiumAccommodation4NightsEarlyBirdSinglePrice: decimal("premium_accommodation_4nights_early_bird_single_price", { precision: 10, scale: 2 }).default('0'),
  premiumAccommodation4NightsEarlyBirdDoublePrice: decimal("premium_accommodation_4nights_early_bird_double_price", { precision: 10, scale: 2 }).default('0'),
  premiumAccommodation4NightsEarlyBirdEndDate: text("premium_accommodation_4nights_early_bird_end_date"),

  // Premium + 3 Nights Accommodation Pricing
  premiumAccommodation3NightsSinglePrice: decimal("premium_accommodation_3nights_single_price", { precision: 10, scale: 2 }).default('0'),
  premiumAccommodation3NightsDoublePrice: decimal("premium_accommodation_3nights_double_price", { precision: 10, scale: 2 }).default('0'),
  premiumAccommodation3NightsEarlyBirdSinglePrice: decimal("premium_accommodation_3nights_early_bird_single_price", { precision: 10, scale: 2 }).default('0'),
  premiumAccommodation3NightsEarlyBirdDoublePrice: decimal("premium_accommodation_3nights_early_bird_double_price", { precision: 10, scale: 2 }).default('0'),
  premiumAccommodation3NightsEarlyBirdEndDate: text("premium_accommodation_3nights_early_bird_end_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Pricing Tiers for time-based offers (Early Bird, 24-hour deals, etc.)
export const pricingTiers = pgTable("pricing_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(), // "Early Bird", "Regular", "24-Hour Flash Sale"
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default('0'), // 0-100%
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0'), // Fixed amount discount
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0), // Higher priority = applied first
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Package configurations per event year with pricing
export const packageConfigurations = pgTable("package_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  packageType: varchar("package_type", { length: 50 }).notNull(), // "full", "evening", "custom", "premium-accommodation-4nights", "premium-accommodation-3nights"
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  coupleMultiplier: decimal("couple_multiplier", { precision: 3, scale: 2 }).default('2.00'),
  includedWorkshops: integer("included_workshops").default(0),
  includedMilongas: boolean("included_milongas").default(false),
  includedGalaDinner: boolean("included_gala_dinner").default(false),
  workshopOveragePrice: decimal("workshop_overage_price", { precision: 10, scale: 2 }).default('0'),
  customWorkshopPricing: jsonb("custom_workshop_pricing").default({}), // { "4": 580, "6": 820 }
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Personal info schemas
const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
  level: z.string().min(1, "Experience level is required"),
});

export const insertRegistrationSchema = createInsertSchema(registrations, {
  eventId: z.string().min(1, "Event ID is required"),
  packageType: z.enum(["full", "evening", "custom", "premium-accommodation-4nights", "premium-accommodation-3nights"]),
  role: z.enum(["leader", "follower", "couple"]),
  leaderInfo: personalInfoSchema.optional(),
  followerInfo: personalInfoSchema.optional(),
  workshopIds: z.array(z.string()).default([]),
  seatIds: z.array(z.string()).default([]), // Keep for backward compatibility
  milongaIds: z.array(z.string()).default([]),
  selectedTableNumber: z.number().optional(),
  addons: z.array(z.object({
    id: z.string(),
    quantity: z.number().min(1),
    options: z.record(z.string()).optional(),
  })).default([]),
  totalAmount: z.number().min(0),
  paymentMethod: z.enum(["stripe", "offline"]).optional(),
}).omit({ id: true, createdAt: true });

// New schema for tables
export const insertTableSchema = createInsertSchema(tables, {
  eventId: z.string().min(1, "Event ID is required"),
}).omit({ 
  id: true, 
  occupiedSeats: true 
});

export const insertLayoutSettingsSchema = createInsertSchema(layoutSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertEventSchema = createInsertSchema(events, {
  year: z.number().min(2020).max(2100),
  name: z.string().min(1, "Event name is required"),
  venue: z.string().min(1, "Venue is required"),
  startDate: z.date(),
  endDate: z.date(),
  registrationOpenDate: z.date(),
  registrationCloseDate: z.date(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Export types
export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Workshop = typeof workshops.$inferSelect;
export type InsertWorkshop = z.infer<typeof insertWorkshopSchema>;
export type Seat = typeof seats.$inferSelect;
export type InsertSeat = z.infer<typeof insertSeatSchema>;
export type Table = typeof tables.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type LayoutSettings = typeof layoutSettings.$inferSelect;
export type InsertLayoutSettings = z.infer<typeof insertLayoutSettingsSchema>;
export type Milonga = typeof milongas.$inferSelect;
export type InsertMilonga = z.infer<typeof insertMilongaSchema>;
export type Addon = typeof addons.$inferSelect;
export type InsertAddon = z.infer<typeof insertAddonSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

// Phase 5: Verify insertWorkshopSchema includes eventId and doesn't remove it
export const insertWorkshopSchema = createInsertSchema(workshops, {
  eventId: z.string().min(1, "Event ID is required"),
  date: z.coerce.date().or(z.date()), // Handle both Date objects and date strings
  earlyBirdEndDate: z.coerce.date().or(z.date()).nullable().optional(), // Optional date field
}).omit({ 
  id: true, 
  enrolled: true,
  leadersEnrolled: true,
  followersEnrolled: true
}).refine((data) => {
  // Phase 5: Explicit validation that eventId exists
  return data.eventId && typeof data.eventId === 'string' && data.eventId.length > 0;
}, {
  message: "Event ID is required and must be a non-empty string",
  path: ["eventId"]
});

export const insertSeatSchema = createInsertSchema(seats).omit({ 
  id: true 
});

export const insertMilongaSchema = createInsertSchema(milongas, {
  eventId: z.string().min(1, "Event ID is required"),
}).omit({ 
  id: true, 
  enrolled: true 
});

export const insertAddonSchema = createInsertSchema(addons, {
  eventId: z.string().min(1, "Event ID is required"),
}).omit({ 
  id: true 
});

export const insertAdminUserSchema = createInsertSchema(adminUsers, {
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "manager", "staff"]),
  permissions: z.record(z.boolean()).default({}),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  lastLoginAt: true 
});

// Pricing Tiers schemas
export const insertPricingTierSchema = createInsertSchema(pricingTiers, {
  eventId: z.string().min(1, "Event ID is required"),
  name: z.string().min(1, "Tier name is required"),
  startDate: z.date(),
  endDate: z.date(),
  discountPercentage: z.number().min(0).max(100),
  discountAmount: z.number().min(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Package Configuration schemas
export const insertPackageConfigurationSchema = createInsertSchema(packageConfigurations, {
  eventId: z.string().min(1, "Event ID is required"),
  packageType: z.enum(["full", "evening", "custom", "premium-accommodation-4nights", "premium-accommodation-3nights"]),
  name: z.string().min(1, "Package name is required"),
  basePrice: z.number().min(0),
  coupleMultiplier: z.number().min(1),
  includedWorkshops: z.number().min(0),
  workshopOveragePrice: z.number().min(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertPricingTier = z.infer<typeof insertPricingTierSchema>;
export type PackageConfiguration = typeof packageConfigurations.$inferSelect;
export type InsertPackageConfiguration = z.infer<typeof insertPackageConfigurationSchema>;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
