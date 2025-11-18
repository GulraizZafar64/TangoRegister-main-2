import { 
  type User, type InsertUser, 
  type AdminUser, type InsertAdminUser, 
  type Registration, type InsertRegistration, 
  type Workshop, type InsertWorkshop, 
  type Seat, type InsertSeat, 
  type Table, type InsertTable, 
  type LayoutSettings, type InsertLayoutSettings, 
  type Milonga, type InsertMilonga, 
  type Addon, type InsertAddon, 
  type Event, type InsertEvent,
  type PricingTier, type InsertPricingTier,
  type PackageConfiguration, type InsertPackageConfiguration,
  users as usersTable,
  adminUsers as adminUsersTable,
  registrations as registrationsTable,
  workshops as workshopsTable,
  seats as seatsTable,
  tables as tablesTable,
  layoutSettings as layoutSettingsTable,
  milongas as milongasTable,
  addons as addonsTable,
  events as eventsTable,
  pricingTiers as pricingTiersTable,
  packageConfigurations as packageConfigurationsTable
} from '../shared/schema';
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import type { IStorage } from "./storage";
import { sanitizeEventData } from "./eventTypeValidator";
import { logError, logObject, logDebug } from "./logger";

export class SupabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(usersTable).values(insertUser).returning();
    return user;
  }

  // Admin user methods
  async getAdminUsers(): Promise<AdminUser[]> {
    return db.select().from(adminUsersTable).where(eq(adminUsersTable.isActive, true));
  }

  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, parseInt(id))).limit(1);
    return admin;
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsersTable)
      .where(and(
        eq(adminUsersTable.username, username),
        eq(adminUsersTable.isActive, true)
      ))
      .limit(1);
    return admin;
  }

  async createAdminUser(insertUser: InsertAdminUser): Promise<AdminUser> {
    const [admin] = await db.insert(adminUsersTable).values({
      ...insertUser,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return admin;
  }

  async updateAdminUser(id: string, updates: Partial<InsertAdminUser>): Promise<AdminUser> {
    const [admin] = await db.update(adminUsersTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(adminUsersTable.id, parseInt(id)))
      .returning();
    
    if (!admin) {
      throw new Error('Admin user not found');
    }
    return admin;
  }

  async deactivateAdminUser(id: string): Promise<AdminUser> {
    const [admin] = await db.update(adminUsersTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(adminUsersTable.id, parseInt(id)))
      .returning();
    
    if (!admin) {
      throw new Error('Admin user not found');
    }
    return admin;
  }

  async updateAdminUserLastLogin(id: string): Promise<AdminUser> {
    const [admin] = await db.update(adminUsersTable)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(adminUsersTable.id, parseInt(id)))
      .returning();
    
    if (!admin) {
      throw new Error('Admin user not found');
    }
    return admin;
  }

  // Registration methods
  async createRegistration(registration: InsertRegistration): Promise<Registration> {
    const [created] = await db.insert(registrationsTable).values({
      ...registration,
      paymentStatus: 'pending',
      createdAt: new Date(),
    }).returning();
    return created;
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    const [registration] = await db.select().from(registrationsTable)
      .where(eq(registrationsTable.id, id))
      .limit(1);
    return registration;
  }

  async getRegistrations(eventId?: string): Promise<Registration[]> {
    if (eventId) {
      return db.select().from(registrationsTable)
        .where(eq(registrationsTable.eventId, eventId));
    }
    return db.select().from(registrationsTable);
  }

  async updateRegistration(id: string, updates: Partial<InsertRegistration>): Promise<Registration> {
    const [registration] = await db.update(registrationsTable)
      .set(updates)
      .where(eq(registrationsTable.id, id))
      .returning();
    
    if (!registration) {
      throw new Error('Registration not found');
    }
    return registration;
  }

  async updateRegistrationPayment(id: string, paymentStatus: string, paymentIntentId?: string): Promise<Registration> {
    const [registration] = await db.update(registrationsTable)
      .set({
        paymentStatus,
        stripePaymentIntentId: paymentIntentId || null,
      })
      .where(eq(registrationsTable.id, id))
      .returning();
    
    if (!registration) {
      throw new Error('Registration not found');
    }
    return registration;
  }

  async deleteRegistration(id: string): Promise<void> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Invalid registration ID');
    }
    
    const trimmedId = id.trim();
    
    try {
      await db.delete(registrationsTable)
        .where(eq(registrationsTable.id, trimmedId));
    } catch (error: any) {
      logError(`Error deleting registration with ID: ${trimmedId}`);
      logObject("ERROR", "Delete error", error);
      throw new Error(`Failed to delete registration: ${error.message || 'Unknown error'}`);
    }
  }

  // Workshop methods
  async getWorkshops(eventId?: string): Promise<Workshop[]> {
    let workshops: Workshop[];
    
    if (eventId) {
      workshops = await db.select().from(workshopsTable)
        .where(eq(workshopsTable.eventId, eventId));
    } else {
      workshops = await db.select().from(workshopsTable);
    }
    
    // Calculate dynamic enrollment based on registrations
    const registrations = await db.select().from(registrationsTable);
    
    for (const workshop of workshops) {
      let enrolled = 0;
      let leadersEnrolled = 0;
      let followersEnrolled = 0;
      
      for (const registration of registrations) {
        if (Array.isArray(registration.workshopIds) && (registration.workshopIds as any).includes(workshop.id)) {
          if (registration.role === 'couple') {
            leadersEnrolled += 1;
            followersEnrolled += 1;
            enrolled += 2;
          } else if (registration.role === 'leader') {
            leadersEnrolled += 1;
            enrolled += 1;
          } else if (registration.role === 'follower') {
            followersEnrolled += 1;
            enrolled += 1;
          }
        }
      }
      
      workshop.enrolled = enrolled;
      workshop.leadersEnrolled = leadersEnrolled;
      workshop.followersEnrolled = followersEnrolled;
    }
    
    return workshops;
  }

  async getWorkshop(id: string): Promise<Workshop | undefined> {
    const [workshop] = await db.select().from(workshopsTable)
      .where(eq(workshopsTable.id, id))
      .limit(1);
    return workshop;
  }

  async createWorkshop(workshop: InsertWorkshop): Promise<Workshop> {
    // Verify eventId exists and is valid
    if (!workshop.eventId || workshop.eventId === 'undefined' || workshop.eventId === 'null' || String(workshop.eventId).trim() === '') {
      logError("ERROR: eventId is missing or invalid in createWorkshop!");
      logObject("ERROR", "Workshop object", workshop);
      throw new Error("eventId is required but was not provided or is invalid");
    }
    
    // Use same pattern as createMilonga/createAddon - spread operator with explicit eventId
    const eventIdValue = String(workshop.eventId).trim();
    
    // Build insert data using spread like other create methods, but ensure eventId is explicitly set
    const insertData = {
      ...workshop,
      eventId: eventIdValue, // Explicitly override to ensure it's set
      enrolled: 0,
      leadersEnrolled: 0,
      followersEnrolled: 0,
    };
    
    // Final verification before database insert
    if (!insertData.eventId || insertData.eventId === 'undefined' || insertData.eventId === 'null') {
      logError("CRITICAL: eventId is still missing after building insertData!");
      throw new Error("eventId is missing in insertData");
    }
    
    try {
      logDebug(`Inserting workshop with eventId: ${insertData.eventId}`);
      const [created] = await db.insert(workshopsTable).values(insertData).returning();
      logDebug(`Workshop created successfully: ${created.id} (eventId: ${created.eventId})`);
      return created;
    } catch (error: any) {
      logError("=== DATABASE INSERT ERROR ===");
      logError(`Error message: ${error.message}`);
      logError(`Error code: ${error.code}`);
      logError(`Error detail: ${error.detail}`);
      logObject("ERROR", "Insert data that failed", insertData);
      throw error;
    }
  }

  async updateWorkshop(id: string, workshop: InsertWorkshop): Promise<Workshop> {
    const [updated] = await db.update(workshopsTable)
      .set(workshop)
      .where(eq(workshopsTable.id, id))
      .returning();
    
    if (!updated) {
      throw new Error('Workshop not found');
    }
    return updated;
  }

  async deleteWorkshop(id: string): Promise<void> {
    await db.delete(workshopsTable).where(eq(workshopsTable.id, id));
  }

  async updateWorkshopEnrollment(id: string, enrolled: number): Promise<Workshop> {
    const [workshop] = await db.update(workshopsTable)
      .set({ enrolled })
      .where(eq(workshopsTable.id, id))
      .returning();
    
    if (!workshop) {
      throw new Error('Workshop not found');
    }
    return workshop;
  }

  // Seat methods
  async getSeats(): Promise<Seat[]> {
    return db.select().from(seatsTable);
  }

  async getSeat(id: string): Promise<Seat | undefined> {
    const [seat] = await db.select().from(seatsTable)
      .where(eq(seatsTable.id, id))
      .limit(1);
    return seat;
  }

  async createSeat(seat: InsertSeat): Promise<Seat> {
    const [created] = await db.insert(seatsTable).values({
      ...seat,
      isVip: seat.isVip || false,
      isAvailable: seat.isAvailable !== undefined ? seat.isAvailable : true,
    }).returning();
    return created;
  }

  async updateSeatAvailability(id: string, isAvailable: boolean): Promise<Seat> {
    const [seat] = await db.update(seatsTable)
      .set({ isAvailable })
      .where(eq(seatsTable.id, id))
      .returning();
    
    if (!seat) {
      throw new Error('Seat not found');
    }
    return seat;
  }

  // Milonga methods
  async getMilongas(eventId?: string): Promise<Milonga[]> {
    let milongas: Milonga[];
    
    if (eventId) {
      milongas = await db.select().from(milongasTable)
        .where(eq(milongasTable.eventId, eventId));
    } else {
      milongas = await db.select().from(milongasTable);
    }
    
    // Calculate dynamic enrollment
    const registrations = await db.select().from(registrationsTable);
    
    for (const milonga of milongas) {
      let enrolled = 0;
      for (const registration of registrations) {
        if (Array.isArray(registration.milongaIds) && (registration.milongaIds as any).includes(milonga.id)) {
          enrolled += registration.role === 'couple' ? 2 : 1;
        }
      }
      milonga.enrolled = enrolled;
    }
    
    return milongas;
  }

  async getMilonga(id: string): Promise<Milonga | undefined> {
    const [milonga] = await db.select().from(milongasTable)
      .where(eq(milongasTable.id, id))
      .limit(1);
    return milonga;
  }

  async createMilonga(milonga: InsertMilonga): Promise<Milonga> {
    const [created] = await db.insert(milongasTable).values({
      ...milonga,
      enrolled: 0,
    }).returning();
    return created;
  }

  async updateMilonga(id: string, milonga: InsertMilonga): Promise<Milonga> {
    const [updated] = await db.update(milongasTable)
      .set(milonga)
      .where(eq(milongasTable.id, id))
      .returning();
    
    if (!updated) {
      throw new Error('Milonga not found');
    }
    return updated;
  }

  async deleteMilonga(id: string): Promise<void> {
    await db.delete(milongasTable).where(eq(milongasTable.id, id));
  }

  async updateMilongaEnrollment(id: string, enrolled: number): Promise<Milonga> {
    const [milonga] = await db.update(milongasTable)
      .set({ enrolled })
      .where(eq(milongasTable.id, id))
      .returning();
    
    if (!milonga) {
      throw new Error('Milonga not found');
    }
    return milonga;
  }

  // Addon methods
  async getAddons(eventId?: string): Promise<Addon[]> {
    if (eventId) {
      return db.select().from(addonsTable)
        .where(eq(addonsTable.eventId, eventId));
    }
    return db.select().from(addonsTable);
  }

  async getAddon(id: string): Promise<Addon | undefined> {
    const [addon] = await db.select().from(addonsTable)
      .where(eq(addonsTable.id, id))
      .limit(1);
    return addon;
  }

  async createAddon(addon: InsertAddon): Promise<Addon> {
    const insertData: any = {
      ...addon,
      options: addon.options || {},
    };
    
    // If ID is provided (for special addons like t-shirt), include it
    if ((addon as any).id) {
      insertData.id = (addon as any).id;
    }
    
    const [created] = await db.insert(addonsTable).values(insertData).returning();
    return created;
  }

  async updateAddon(id: string, addon: InsertAddon): Promise<Addon> {
    const [updated] = await db.update(addonsTable)
      .set(addon)
      .where(eq(addonsTable.id, id))
      .returning();
    
    if (!updated) {
      throw new Error('Addon not found');
    }
    return updated;
  }

  async deleteAddon(id: string): Promise<void> {
    await db.delete(addonsTable).where(eq(addonsTable.id, id));
  }

  // Table management methods
  async getTables(eventId?: string): Promise<Table[]> {
    const query = db.select().from(tablesTable)
      .where(eq(tablesTable.isActive, true));
    
    if (eventId) {
      return query.where(eq(tablesTable.eventId, eventId));
    }
    return query;
  }

  async getTable(id: string): Promise<Table | undefined> {
    const [table] = await db.select().from(tablesTable)
      .where(eq(tablesTable.id, id))
      .limit(1);
    return table;
  }

  async createTable(table: InsertTable): Promise<Table> {
    const [created] = await db.insert(tablesTable).values({
      ...table,
      eventId: (table as any).eventId || "default-event",
      price: table.price || "0",
      earlyBirdPrice: (table as any).earlyBirdPrice || "0",
      earlyBirdEndDate: (table as any).earlyBirdEndDate || null,
      occupiedSeats: table.occupiedSeats || 0,
      isActive: (table as any).isActive ?? true,
    }).returning();
    return created;
  }

  async updateTable(id: string, updates: Partial<InsertTable>): Promise<Table> {
    const [updated] = await db.update(tablesTable)
      .set(updates)
      .where(eq(tablesTable.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Table with id ${id} not found`);
    }
    return updated;
  }

  async deleteTable(id: string): Promise<void> {
    await db.update(tablesTable)
      .set({ isActive: false })
      .where(eq(tablesTable.id, id));
  }

  async updateTableOccupancy(tableNumber: number, seatsToAdd: number, eventId?: string): Promise<Table> {
    const conditions = [
      eq(tablesTable.tableNumber, tableNumber),
      eq(tablesTable.isActive, true)
    ];
    
    if (eventId) {
      conditions.push(eq(tablesTable.eventId, eventId));
    }
    
    const [table] = await db.select().from(tablesTable)
      .where(and(...conditions))
      .limit(1);
    
    if (!table) {
      throw new Error(`Table ${tableNumber} not found`);
    }

    const desiredSeats = table.occupiedSeats + seatsToAdd;
    if (seatsToAdd > 0 && desiredSeats > table.totalSeats) {
      throw new Error(`Table ${tableNumber} does not have enough available seats.`);
    }
    if (desiredSeats < 0) {
      throw new Error(`Cannot remove more seats than currently booked for table ${tableNumber}.`);
    }

    const [updated] = await db.update(tablesTable)
      .set({ occupiedSeats: desiredSeats })
      .where(eq(tablesTable.id, table.id))
      .returning();
    
    return updated;
  }

  // Layout settings methods
  async getLayoutSettings(): Promise<LayoutSettings | undefined> {
    const [settings] = await db.select().from(layoutSettingsTable)
      .orderBy(desc(layoutSettingsTable.createdAt))
      .limit(1);
    return settings;
  }

  async updateLayoutSettings(settings: InsertLayoutSettings): Promise<LayoutSettings> {
    const [updated] = await db.insert(layoutSettingsTable).values({
      layoutImageUrl: settings.layoutImageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return updated;
  }

  // Legacy seating layout methods (for compatibility)
  private seatingLayoutCache: any = null;
  
  async saveSeatingLayout(layout: any): Promise<any> {
    console.log('Saving seating layout:', layout);
    this.seatingLayoutCache = layout;
    // Could persist to a settings table if needed
    return layout;
  }

  async getSeatingLayout(): Promise<any> {
    console.log('Getting seating layout:', this.seatingLayoutCache);
    return this.seatingLayoutCache || { 
      tables: [], 
      stage: { x: 400, y: 50, width: 200, height: 80, rotation: 0 } 
    };
  }

  // Event management methods
  async getAllEvents(): Promise<Event[]> {
    return db.select().from(eventsTable).orderBy(desc(eventsTable.year));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(eventsTable)
      .where(eq(eventsTable.id, id))
      .limit(1);
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const sanitized = sanitizeEventData(event);
    sanitized.createdAt = new Date();
    sanitized.updatedAt = new Date();
    
    const [created] = await db.insert(eventsTable).values(sanitized).returning();
    return created;
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event> {
    try {
      const sanitized = sanitizeEventData(updates);
      sanitized.updatedAt = new Date();
      
      // Final safety check: Ensure ALL text date fields are strings or null
      const textDateFields = [
        'workshopEarlyBirdEndDate',
        'fullPackageEarlyBirdEndDate', 'fullPackage24HourStartDate', 'fullPackage24HourEndDate',
        'eveningPackageEarlyBirdEndDate', 'eveningPackage24HourStartDate', 'eveningPackage24HourEndDate',
        'premiumAccommodation4NightsEarlyBirdEndDate',
        'premiumAccommodation3NightsEarlyBirdEndDate'
      ];
      
      textDateFields.forEach(field => {
        if (sanitized[field] !== undefined) {
          if (sanitized[field] instanceof Date) {
            console.error(`ERROR: ${field} is still a Date object! Converting...`);
            sanitized[field] = sanitized[field].toISOString();
          } else if (sanitized[field] !== null && typeof sanitized[field] !== 'string') {
            console.error(`ERROR: ${field} is not a string! Type: ${typeof sanitized[field]}, Value:`, sanitized[field]);
            sanitized[field] = sanitized[field] === null ? null : String(sanitized[field]);
          }
        }
      });
      
      // Remove undefined values
      Object.keys(sanitized).forEach(key => {
        if (sanitized[key] === undefined) {
          delete sanitized[key];
        }
      });
      
      console.log('Final sanitized data for database:', JSON.stringify(sanitized, (key, value) => {
        if (value instanceof Date) {
          return `[Date: ${value.toISOString()}]`;
        }
        return value;
      }, 2));
      
      const [updated] = await db.update(eventsTable)
        .set(sanitized)
        .where(eq(eventsTable.id, id))
        .returning();
      
      if (!updated) {
        throw new Error(`Event with id ${id} not found`);
      }
      return updated;
    } catch (error: any) {
      console.error('updateEvent error:', error);
      console.error('Error stack:', error.stack);
      console.error('Updates received:', JSON.stringify(updates, null, 2));
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(eventsTable).where(eq(eventsTable.id, id));
  }

  async clearCurrentEvent(): Promise<void> {
    await db.update(eventsTable)
      .set({ isCurrent: false, updatedAt: new Date() })
      .where(eq(eventsTable.isCurrent, true));
  }

  async setCurrentEvent(id: string): Promise<Event> {
    // First clear all current events
    await this.clearCurrentEvent();
    
    // Then set the new current event
    const [event] = await db.update(eventsTable)
      .set({ isCurrent: true, updatedAt: new Date() })
      .where(eq(eventsTable.id, id))
      .returning();
    
    if (!event) {
      throw new Error(`Event with id ${id} not found`);
    }
    return event;
  }

  async getCurrentEvent(): Promise<Event | undefined> {
    try {
      const [event] = await db.select().from(eventsTable)
        .where(eq(eventsTable.isCurrent, true))
        .limit(1);
      
      if (event) {
        logDebug(`Current event found: ${event.name} (${event.id})`);
      } else {
        logError("No current event found");
      }
      
      return event;
    } catch (error: any) {
      logError(`Error in getCurrentEvent(): ${error.message}`);
      throw error;
    }
  }

  // Pricing Tiers methods
  async getPricingTiersByEvent(eventId: string): Promise<PricingTier[]> {
    return db.select().from(pricingTiersTable)
      .where(eq(pricingTiersTable.eventId, eventId));
  }

  async getActivePricingTier(eventId: string): Promise<PricingTier | undefined> {
    const now = new Date();
    const [tier] = await db.select().from(pricingTiersTable)
      .where(and(
        eq(pricingTiersTable.eventId, eventId),
        eq(pricingTiersTable.isActive, true),
        lte(pricingTiersTable.startDate, now),
        gte(pricingTiersTable.endDate, now)
      ))
      .orderBy(desc(pricingTiersTable.priority))
      .limit(1);
    return tier;
  }

  async createPricingTier(tier: InsertPricingTier): Promise<PricingTier> {
    const [created] = await db.insert(pricingTiersTable).values({
      ...tier,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updatePricingTier(id: string, updates: Partial<InsertPricingTier>): Promise<PricingTier> {
    const [updated] = await db.update(pricingTiersTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pricingTiersTable.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Pricing tier with id ${id} not found`);
    }
    return updated;
  }

  async deletePricingTier(id: string): Promise<void> {
    await db.delete(pricingTiersTable).where(eq(pricingTiersTable.id, id));
  }

  // Package Configuration methods
  async getPackageConfigurationsByEvent(eventId: string): Promise<PackageConfiguration[]> {
    return db.select().from(packageConfigurationsTable)
      .where(eq(packageConfigurationsTable.eventId, eventId))
      .orderBy(packageConfigurationsTable.sortOrder);
  }

  async getPackageConfiguration(eventId: string, packageType: string): Promise<PackageConfiguration | undefined> {
    const [config] = await db.select().from(packageConfigurationsTable)
      .where(and(
        eq(packageConfigurationsTable.eventId, eventId),
        eq(packageConfigurationsTable.packageType, packageType),
        eq(packageConfigurationsTable.isActive, true)
      ))
      .limit(1);
    return config;
  }

  async createPackageConfiguration(packageConfig: InsertPackageConfiguration): Promise<PackageConfiguration> {
    const [created] = await db.insert(packageConfigurationsTable).values({
      ...packageConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return created;
  }

  async updatePackageConfiguration(id: string, updates: Partial<InsertPackageConfiguration>): Promise<PackageConfiguration> {
    const [updated] = await db.update(packageConfigurationsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(packageConfigurationsTable.id, id))
      .returning();
    
    if (!updated) {
      throw new Error(`Package configuration with id ${id} not found`);
    }
    return updated;
  }

  async deletePackageConfiguration(id: string): Promise<void> {
    await db.delete(packageConfigurationsTable).where(eq(packageConfigurationsTable.id, id));
  }
}

export const storage = new SupabaseStorage();

