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
  type PackageConfiguration, type InsertPackageConfiguration
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Admin user methods
  getAdminUsers(): Promise<AdminUser[]>;
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, updates: Partial<InsertAdminUser>): Promise<AdminUser>;
  deactivateAdminUser(id: string): Promise<AdminUser>;
  updateAdminUserLastLogin(id: string): Promise<AdminUser>;
  
  // Registration methods
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  getRegistration(id: string): Promise<Registration | undefined>;
  getRegistrations(eventId?: string): Promise<Registration[]>;
  updateRegistration(id: string, updates: Partial<InsertRegistration>): Promise<Registration>;
  updateRegistrationPayment(id: string, paymentStatus: string, paymentIntentId?: string): Promise<Registration>;
  deleteRegistration(id: string): Promise<void>;
  
  // Workshop methods
  getWorkshops(eventId?: string): Promise<Workshop[]>;
  getWorkshop(id: string): Promise<Workshop | undefined>;
  createWorkshop(workshop: InsertWorkshop): Promise<Workshop>;
  updateWorkshop(id: string, workshop: InsertWorkshop): Promise<Workshop>;
  deleteWorkshop(id: string): Promise<void>;
  updateWorkshopEnrollment(id: string, enrolled: number): Promise<Workshop>;
  
  // Seat methods
  getSeats(): Promise<Seat[]>;
  getSeat(id: string): Promise<Seat | undefined>;
  createSeat(seat: InsertSeat): Promise<Seat>;
  updateSeatAvailability(id: string, isAvailable: boolean): Promise<Seat>;
  
  // Milonga methods
  getMilongas(eventId?: string): Promise<Milonga[]>;
  getMilonga(id: string): Promise<Milonga | undefined>;
  createMilonga(milonga: InsertMilonga): Promise<Milonga>;
  updateMilonga(id: string, milonga: InsertMilonga): Promise<Milonga>;
  deleteMilonga(id: string): Promise<void>;
  updateMilongaEnrollment(id: string, enrolled: number): Promise<Milonga>;
  
  // Addon methods
  getAddons(eventId?: string): Promise<Addon[]>;
  getAddon(id: string): Promise<Addon | undefined>;
  createAddon(addon: InsertAddon): Promise<Addon>;
  updateAddon(id: string, addon: InsertAddon): Promise<Addon>;
  deleteAddon(id: string): Promise<void>;

  // Table management methods
  getTables(eventId?: string): Promise<Table[]>;
  getTable(id: string): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(id: string, updates: Partial<InsertTable>): Promise<Table>;
  deleteTable(id: string): Promise<void>;
  updateTableOccupancy(tableNumber: number, seatsToAdd: number, eventId?: string): Promise<Table>;
  
  // Layout settings methods
  getLayoutSettings(): Promise<LayoutSettings | undefined>;
  updateLayoutSettings(settings: InsertLayoutSettings): Promise<LayoutSettings>;
  
  // Legacy seating layout methods (for compatibility)
  saveSeatingLayout(layout: any): Promise<any>;
  getSeatingLayout(): Promise<any>;
  
  // Event management methods
  getAllEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  clearCurrentEvent(): Promise<void>;
  setCurrentEvent(id: string): Promise<Event>;
  getCurrentEvent(): Promise<Event | undefined>;
  
  // Pricing Tiers methods
  getPricingTiersByEvent(eventId: string): Promise<PricingTier[]>;
  getActivePricingTier(eventId: string): Promise<PricingTier | undefined>;
  createPricingTier(tier: InsertPricingTier): Promise<PricingTier>;
  updatePricingTier(id: string, updates: Partial<InsertPricingTier>): Promise<PricingTier>;
  deletePricingTier(id: string): Promise<void>;
  
  // Package Configuration methods
  getPackageConfigurationsByEvent(eventId: string): Promise<PackageConfiguration[]>;
  getPackageConfiguration(eventId: string, packageType: string): Promise<PackageConfiguration | undefined>;
  createPackageConfiguration(packageConfig: InsertPackageConfiguration): Promise<PackageConfiguration>;
  updatePackageConfiguration(id: string, updates: Partial<InsertPackageConfiguration>): Promise<PackageConfiguration>;
  deletePackageConfiguration(id: string): Promise<void>;
}

// MemStorage is now replaced by SupabaseStorage
// Keeping the class definition here for reference, but it's no longer used
class MemStorage_DEPRECATED implements IStorage {
  private users: Map<string, User>;
  private adminUsers: Map<string, AdminUser>;
  private registrations: Map<string, Registration>;
  private workshops: Map<string, Workshop>;
  private seats: Map<string, Seat>;
  private tables: Map<string, Table>;
  private layoutSettings: LayoutSettings | undefined;
  private milongas: Map<string, Milonga>;
  private addons: Map<string, Addon>;
  private events: Map<string, Event>;
  private pricingTiers: Map<string, PricingTier>;
  private packageConfigurations: Map<string, PackageConfiguration>;
  private seatingLayout: any;

  constructor() {
    this.users = new Map();
    this.adminUsers = new Map();
    this.registrations = new Map();
    this.workshops = new Map();
    this.seats = new Map();
    this.tables = new Map();
    this.layoutSettings = undefined;
    this.milongas = new Map();
    this.addons = new Map();
    this.events = new Map();
    this.pricingTiers = new Map();
    this.packageConfigurations = new Map();
    this.seatingLayout = null;
    
    this.initializeData();
  }

  private async hashPassword(password: string): Promise<string> {
    // Simple hash for demonstration - in production use bcrypt
    return Buffer.from(password).toString('base64');
  }

  private initializeData() {
    // Initialize workshops
    const workshopData = [
      {
        id: "workshop-1",
        title: "Fundamentals of Argentine Tango",
        instructor: "Carlos Gutierrez",
        level: "beginner",
        description: "Learn the basic steps, posture, and connection in Argentine Tango. Perfect for those new to the dance.",
        date: "March 15, 2024",
        time: "10:00 - 11:30 AM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 30,
        enrolled: 0,
        leaderCapacity: 15,
        followerCapacity: 15,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-2",
        title: "Advanced Musicality & Expression",
        instructor: "Sofia Delgado",
        level: "advanced",
        description: "Explore complex musical interpretations and emotional expression through advanced tango techniques.",
        date: "March 15, 2024",
        time: "2:00 - 3:30 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 20,
        enrolled: 0,
        leaderCapacity: 10,
        followerCapacity: 10,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-3",
        title: "Intermediate Figures & Sequences",
        instructor: "Miguel Santos",
        level: "intermediate",
        description: "Build upon basic skills with more complex figures and flowing sequences.",
        date: "March 16, 2024",
        time: "11:00 - 12:30 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 25,
        enrolled: 0,
        leaderCapacity: 13,
        followerCapacity: 12,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-4",
        title: "Professional Performance Techniques",
        instructor: "Elena Rossi & Pablo Martinez",
        level: "professional",
        description: "Master-level workshop focusing on stage presence and performance quality.",
        date: "March 17, 2024",
        time: "4:00 - 6:00 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 15,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-5",
        title: "Embrace & Connection Mastery",
        instructor: "Isabella Torres",
        level: "intermediate",
        description: "Deep dive into the intimate connection that makes tango unique.",
        date: "March 15, 2024",
        time: "12:00 - 1:30 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 24,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-6",
        title: "Tango Vals Elegance",
        instructor: "Roberto Silva",
        level: "intermediate",
        description: "Master the flowing movements and circular patterns of tango vals.",
        date: "March 16, 2024",
        time: "9:00 - 10:30 AM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 28,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-7",
        title: "Milonga Rhythm & Joy",
        instructor: "Carmen Lopez",
        level: "beginner",
        description: "Learn the playful and energetic style of milonga dancing.",
        date: "March 16, 2024",
        time: "2:00 - 3:30 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 32,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-8",
        title: "Advanced Sacadas & Boleos",
        instructor: "Diego Morales",
        level: "advanced",
        description: "Perfect your technique in sacadas and boleos with dynamic movements.",
        date: "March 17, 2024",
        time: "10:00 - 11:30 AM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 18,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-9",
        title: "Leading with Intention",
        instructor: "Fernando Castro",
        level: "intermediate",
        description: "For leaders: develop clear, confident leading techniques.",
        date: "March 17, 2024",
        time: "12:00 - 1:30 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 16,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-10",
        title: "Following with Grace",
        instructor: "Valentina Reyes",
        level: "intermediate",
        description: "For followers: enhance your sensitivity and response to leading.",
        date: "March 17, 2024",
        time: "2:00 - 3:30 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 16,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-11",
        title: "Stage Tango Choreography",
        instructor: "Antonio & Lucia",
        level: "professional",
        description: "Create stunning choreographic pieces for stage performance.",
        date: "March 18, 2024",
        time: "10:00 - 12:00 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 12,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-12",
        title: "Tango Nuevo Innovation",
        instructor: "Gabriel Mendez",
        level: "advanced",
        description: "Explore modern tango movements and innovative techniques.",
        date: "March 18, 2024",
        time: "2:00 - 3:30 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 20,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-13",
        title: "Beginner's First Steps",
        instructor: "Maria Santos",
        level: "beginner",
        description: "Absolute beginner workshop covering the very basics of tango.",
        date: "March 18, 2024",
        time: "4:00 - 5:30 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 35,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-14",
        title: "Improvisational Tango",
        instructor: "Ricardo Vega",
        level: "advanced",
        description: "Learn to improvise and create spontaneous moments in your dance.",
        date: "March 19, 2024",
        time: "11:00 - 12:30 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 22,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "workshop-15",
        title: "Golden Age Masters",
        instructor: "Carlos & Sofia",
        level: "professional",
        description: "Study the techniques of the great masters from tango's golden age.",
        date: "March 19, 2024",
        time: "3:00 - 5:00 PM",
        price: "180.00",
        earlyBirdPrice: "0",
        earlyBirdEndDate: null,
        capacity: 14,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
    ];

    workshopData.forEach(workshop => {
      this.workshops.set(workshop.id, workshop as Workshop);
    });

    // Initialize seats
    const seatData = [
      // Regular tables
      { id: "seat-1-1", tableName: "Table 1", seatNumber: 1, isVip: false, price: "150.00", isAvailable: true },
      { id: "seat-1-2", tableName: "Table 1", seatNumber: 2, isVip: false, price: "150.00", isAvailable: true },
      { id: "seat-1-3", tableName: "Table 1", seatNumber: 3, isVip: false, price: "150.00", isAvailable: true },
      { id: "seat-1-4", tableName: "Table 1", seatNumber: 4, isVip: false, price: "150.00", isAvailable: true },
      
      { id: "seat-2-1", tableName: "Table 2", seatNumber: 1, isVip: false, price: "150.00", isAvailable: true },
      { id: "seat-2-2", tableName: "Table 2", seatNumber: 2, isVip: false, price: "150.00", isAvailable: true },
      { id: "seat-2-3", tableName: "Table 2", seatNumber: 3, isVip: false, price: "150.00", isAvailable: true },
      { id: "seat-2-4", tableName: "Table 2", seatNumber: 4, isVip: false, price: "150.00", isAvailable: true },

      { id: "seat-3-1", tableName: "Table 3", seatNumber: 1, isVip: false, price: "150.00", isAvailable: true },
      { id: "seat-3-2", tableName: "Table 3", seatNumber: 2, isVip: false, price: "150.00", isAvailable: true },
      { id: "seat-3-3", tableName: "Table 3", seatNumber: 3, isVip: false, price: "150.00", isAvailable: true },
      { id: "seat-3-4", tableName: "Table 3", seatNumber: 4, isVip: false, price: "150.00", isAvailable: true },
    ];

    seatData.forEach(seat => {
      this.seats.set(seat.id, seat as Seat);
    });

    // Initialize milongas
    const milongaData = [
      {
        id: "milonga-regular-1",
        name: "Opening Night Milonga",
        description: "Traditional milonga to kick off the festival with classic tango music",
        date: "March 14, 2024",
        time: "8:00 PM - 12:00 AM",
        venue: "Grand Ballroom",
        price: "180.00",
        type: "regular",
        capacity: 200,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "milonga-regular-2",
        name: "Midnight Milonga",
        description: "Late night dancing with contemporary tango orchestras",
        date: "March 15, 2024", 
        time: "11:00 PM - 3:00 AM",
        venue: "Terrace Lounge",
        price: "180.00",
        type: "regular",
        capacity: 150,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "milonga-regular-3",
        name: "Afternoon Social",
        description: "Relaxed afternoon milonga with tea and pastries",
        date: "March 16, 2024",
        time: "3:00 PM - 6:00 PM", 
        venue: "Garden Pavilion",
        price: "180.00",
        type: "regular",
        capacity: 120,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "milonga-gala",
        name: "Gala Milonga & Dinner",
        description: "Elegant evening featuring world-class performances and gourmet dining",
        date: "March 17, 2024",
        time: "7:00 PM - 1:00 AM",
        venue: "Crystal Ballroom",
        price: "480.00",
        type: "gala",
        capacity: 180,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
      {
        id: "milonga-desert",
        name: "Survivor Desert Milonga",
        description: "Unique outdoor milonga experience under the desert stars with traditional Bedouin hospitality",
        date: "March 18, 2024",
        time: "6:00 PM - 11:00 PM",
        venue: "Desert Camp Al Maha",
        price: "280.00",
        type: "desert",
        capacity: 80,
        enrolled: 0,
        leaderCapacity: 8,
        followerCapacity: 8,
        leadersEnrolled: 0,
        followersEnrolled: 0,
      },
    ];

    milongaData.forEach(milonga => {
      this.milongas.set(milonga.id, milonga as Milonga);
    });

    // Initialize add-ons
    const addonData = [
      {
        id: "addon-tshirt",
        name: "Festival T-Shirt",
        description: "Premium cotton t-shirt with exclusive Dubai Tango Festival 2024 design",
        price: "35.00",
        category: "clothing",
        options: { 
          sizes: ["XS", "S", "M", "L", "XL", "XXL"],
          allowImageUpload: true
        },
      },
      {
        id: "addon-desert-transport",
        name: "Desert Safari Transportation",
        description: "Round-trip luxury transportation to the Survivor Desert Milonga event",
        price: "75.00",
        category: "transportation",
        options: {},
      },
    ];

    addonData.forEach(addon => {
      this.addons.set(addon.id, addon as Addon);
    });

    // Initialize admin users
    const adminUsersData = [
      {
        id: "admin-1",
        username: "admin",
        password: "dGFuZ29BZG1pbjIwMjQ=", // base64 encoded "tangoAdmin2024"
        firstName: "System",
        lastName: "Administrator",
        email: "admin@dubaitangofestival.com",
        role: "admin",
        permissions: {
          users: true,
          workshops: true,
          registrations: true,
          seats: true,
          milongas: true,
          addons: true,
          payments: true,
          reports: true
        },
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    adminUsersData.forEach(user => {
      this.adminUsers.set(user.id, user as AdminUser);
    });

    // Initialize default 10 tables with 6 seats each
    const tableData = Array.from({ length: 10 }, (_, index) => ({
      id: `table-${index + 1}`,
      tableNumber: index + 1,
      totalSeats: 6,
      occupiedSeats: 0,
      isVip: index + 1 <= 3, // Tables 1, 2, 3 are VIP
      price: index + 1 <= 3 ? "150.00" : "100.00", // VIP tables cost more
      earlyBirdPrice: index + 1 <= 3 ? "120.00" : "80.00",
      earlyBirdEndDate: null,
      eventId: "default-event",
      isActive: true,
    }));

    tableData.forEach(table => {
      this.tables.set(table.id, table as Table);
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Admin User methods
  async getAdminUsers(): Promise<AdminUser[]> {
    return Array.from(this.adminUsers.values()).filter(user => user.isActive);
  }

  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    return this.adminUsers.get(id);
  }

  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    return Array.from(this.adminUsers.values()).find(
      (user) => user.username === username && user.isActive,
    );
  }

  async createAdminUser(insertUser: InsertAdminUser): Promise<AdminUser> {
    const id = randomUUID();
    const hashedPassword = await this.hashPassword(insertUser.password);
    const adminUser: AdminUser = {
      ...insertUser,
      id,
      password: hashedPassword,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.adminUsers.set(id, adminUser);
    return adminUser;
  }

  async updateAdminUser(id: string, updates: Partial<InsertAdminUser>): Promise<AdminUser> {
    const adminUser = this.adminUsers.get(id);
    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    const updateData = { ...updates };
    if (updates.password) {
      updateData.password = await this.hashPassword(updates.password);
    }

    const updated = {
      ...adminUser,
      ...updateData,
      updatedAt: new Date(),
    };
    
    this.adminUsers.set(id, updated);
    return updated;
  }

  async deactivateAdminUser(id: string): Promise<AdminUser> {
    const adminUser = this.adminUsers.get(id);
    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    const updated = {
      ...adminUser,
      isActive: false,
      updatedAt: new Date(),
    };
    
    this.adminUsers.set(id, updated);
    return updated;
  }

  async updateAdminUserLastLogin(id: string): Promise<AdminUser> {
    const adminUser = this.adminUsers.get(id);
    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    const updated = {
      ...adminUser,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.adminUsers.set(id, updated);
    return updated;
  }

  // Registration methods
  async createRegistration(insertRegistration: InsertRegistration): Promise<Registration> {
    const id = randomUUID();
    const registration: Registration = {
      ...insertRegistration,
      id,
      paymentStatus: 'pending',
      paymentMethod: insertRegistration.paymentMethod || null,
      stripePaymentIntentId: null,
      createdAt: new Date(),
    };
    this.registrations.set(id, registration);
    return registration;
  }

  async getRegistration(id: string): Promise<Registration | undefined> {
    return this.registrations.get(id);
  }

  async getRegistrations(eventId?: string): Promise<Registration[]> {
    const registrations = Array.from(this.registrations.values());
    if (eventId) {
      return registrations.filter(reg => reg.eventId === eventId);
    }
    return registrations;
  }

  async updateRegistration(id: string, updates: Partial<InsertRegistration>): Promise<Registration> {
    const registration = this.registrations.get(id);
    if (!registration) {
      throw new Error('Registration not found');
    }
    
    const updated = { ...registration, ...updates };
    this.registrations.set(id, updated);
    return updated;
  }

  async updateWorkshopEnrollment(id: string, enrolled: number): Promise<Workshop> {
    const workshop = this.workshops.get(id);
    if (!workshop) {
      throw new Error('Workshop not found');
    }
    
    const updated = { ...workshop, enrolled };
    this.workshops.set(id, updated);
    return updated;
  }

  async updateSeatAvailability(id: string, isAvailable: boolean): Promise<Seat> {
    const seat = this.seats.get(id);
    if (!seat) {
      throw new Error('Seat not found');
    }
    
    const updated = { ...seat, isAvailable };
    this.seats.set(id, updated);
    return updated;
  }

  async updateRegistrationPayment(id: string, paymentStatus: string, paymentIntentId?: string): Promise<Registration> {
    const registration = this.registrations.get(id);
    if (!registration) {
      throw new Error('Registration not found');
    }
    
    const updated = {
      ...registration,
      paymentStatus,
      stripePaymentIntentId: paymentIntentId || null,
    };
    
    this.registrations.set(id, updated);
    return updated;
  }

  // Workshop methods
  async getWorkshops(): Promise<Workshop[]> {
    const workshops = Array.from(this.workshops.values());
    
    // Calculate dynamic enrollment based on registrations
    for (const workshop of workshops) {
      let enrollment = 0;
      let leadersEnrolled = 0;
      let followersEnrolled = 0;
      
      // Count enrollments from all registrations
      for (const registration of Array.from(this.registrations.values())) {
        if (Array.isArray(registration.workshopIds) && registration.workshopIds.includes(workshop.id)) {
          if (registration.role === 'couple') {
            // Couple counts as 1 leader + 1 follower
            leadersEnrolled += 1;
            followersEnrolled += 1;
            enrollment += 2;
          } else if (registration.role === 'leader') {
            leadersEnrolled += 1;
            enrollment += 1;
          } else if (registration.role === 'follower') {
            followersEnrolled += 1;
            enrollment += 1;
          }
        }
      }
      
      workshop.enrolled = enrollment;
      workshop.leadersEnrolled = leadersEnrolled;
      workshop.followersEnrolled = followersEnrolled;
    }
    
    return workshops;
  }

  async getWorkshop(id: string): Promise<Workshop | undefined> {
    return this.workshops.get(id);
  }

  async createWorkshop(insertWorkshop: InsertWorkshop): Promise<Workshop> {
    const id = randomUUID();
    const workshop: Workshop = { 
      ...insertWorkshop, 
      id, 
      enrolled: 0,
      leadersEnrolled: 0,
      followersEnrolled: 0
    };
    this.workshops.set(id, workshop);
    return workshop;
  }

  async updateWorkshop(id: string, insertWorkshop: InsertWorkshop): Promise<Workshop> {
    const workshop = this.workshops.get(id);
    if (!workshop) {
      throw new Error('Workshop not found');
    }
    
    const updated = { ...workshop, ...insertWorkshop };
    this.workshops.set(id, updated);
    return updated;
  }

  async deleteWorkshop(id: string): Promise<void> {
    if (!this.workshops.has(id)) {
      throw new Error('Workshop not found');
    }
    this.workshops.delete(id);
  }

  // Seat methods
  async getSeats(): Promise<Seat[]> {
    return Array.from(this.seats.values());
  }

  async getSeat(id: string): Promise<Seat | undefined> {
    return this.seats.get(id);
  }

  async createSeat(insertSeat: InsertSeat): Promise<Seat> {
    const id = randomUUID();
    const seat: Seat = { 
      ...insertSeat, 
      id,
      isVip: insertSeat.isVip || false,
      isAvailable: insertSeat.isAvailable !== undefined ? insertSeat.isAvailable : true
    };
    this.seats.set(id, seat);
    return seat;
  }

  // Milonga methods
  async getMilongas(): Promise<Milonga[]> {
    const milongas = Array.from(this.milongas.values());
    
    // Calculate dynamic enrollment based on registrations
    for (const milonga of milongas) {
      let enrollment = 0;
      
      // Count enrollments from all registrations
      for (const registration of Array.from(this.registrations.values())) {
        if (Array.isArray(registration.milongaIds) && registration.milongaIds.includes(milonga.id)) {
          // Add 1 for individuals (leader/follower), 2 for couples
          enrollment += registration.role === 'couple' ? 2 : 1;
        }
      }
      
      milonga.enrolled = enrollment;
    }
    
    return milongas;
  }

  async getMilonga(id: string): Promise<Milonga | undefined> {
    return this.milongas.get(id);
  }

  async createMilonga(insertMilonga: InsertMilonga): Promise<Milonga> {
    const id = randomUUID();
    const milonga: Milonga = { ...insertMilonga, id, enrolled: 0 };
    this.milongas.set(id, milonga);
    return milonga;
  }

  async updateMilonga(id: string, insertMilonga: InsertMilonga): Promise<Milonga> {
    const milonga = this.milongas.get(id);
    if (!milonga) {
      throw new Error('Milonga not found');
    }
    
    const updated = { ...milonga, ...insertMilonga };
    this.milongas.set(id, updated);
    return updated;
  }

  async deleteMilonga(id: string): Promise<void> {
    if (!this.milongas.has(id)) {
      throw new Error('Milonga not found');
    }
    this.milongas.delete(id);
  }

  async updateMilongaEnrollment(id: string, enrolled: number): Promise<Milonga> {
    const milonga = this.milongas.get(id);
    if (!milonga) {
      throw new Error('Milonga not found');
    }
    
    const updated = { ...milonga, enrolled };
    this.milongas.set(id, updated);
    return updated;
  }

  // Addon methods
  async getAddons(): Promise<Addon[]> {
    return Array.from(this.addons.values());
  }

  async getAddon(id: string): Promise<Addon | undefined> {
    return this.addons.get(id);
  }

  async createAddon(insertAddon: InsertAddon): Promise<Addon> {
    const id = randomUUID();
    const addon: Addon = { 
      ...insertAddon, 
      id,
      options: insertAddon.options || {}
    };
    this.addons.set(id, addon);
    return addon;
  }

  async updateAddon(id: string, insertAddon: InsertAddon): Promise<Addon> {
    const addon = this.addons.get(id);
    if (!addon) {
      throw new Error('Addon not found');
    }
    
    const updated = { ...addon, ...insertAddon };
    this.addons.set(id, updated);
    return updated;
  }

  async deleteAddon(id: string): Promise<void> {
    if (!this.addons.has(id)) {
      throw new Error('Addon not found');
    }
    this.addons.delete(id);
  }

  async saveSeatingLayout(layout: any): Promise<any> {
    console.log('Saving seating layout:', layout);
    this.seatingLayout = layout;
    return layout;
  }

  async getSeatingLayout(): Promise<any> {
    console.log('Getting seating layout:', this.seatingLayout);
    return this.seatingLayout || { tables: [], stage: { x: 400, y: 50, width: 200, height: 80, rotation: 0 } };
  }



  // New Table management methods
  async getTables(): Promise<Table[]> {
    return Array.from(this.tables.values()).filter(table => table.isActive);
  }

  async getTable(id: string): Promise<Table | undefined> {
    return this.tables.get(id);
  }

  async createTable(table: InsertTable): Promise<Table> {
    const id = randomUUID();
    const newTable: Table = { 
      id,
      ...table,
      eventId: (table as any).eventId || "default-event",
      price: table.price || "0",
      earlyBirdPrice: (table as any).earlyBirdPrice || "0",
      earlyBirdEndDate: (table as any).earlyBirdEndDate || null,
      occupiedSeats: table.occupiedSeats || 0,
      isActive: (table as any).isActive ?? true,
    };
    this.tables.set(id, newTable);
    return newTable;
  }

  async updateTable(id: string, updates: Partial<InsertTable>): Promise<Table> {
    const existingTable = this.tables.get(id);
    if (!existingTable) {
      throw new Error(`Table with id ${id} not found`);
    }

    const updatedTable: Table = { ...existingTable, ...updates };
    this.tables.set(id, updatedTable);
    return updatedTable;
  }

  async deleteTable(id: string): Promise<void> {
    const table = this.tables.get(id);
    if (table) {
      // Soft delete by marking as inactive
      const updatedTable: Table = { ...table, isActive: false };
      this.tables.set(id, updatedTable);
    }
  }

  async updateTableOccupancy(tableNumber: number, seatsToAdd: number): Promise<Table> {
    const table = Array.from(this.tables.values()).find(t => t.tableNumber === tableNumber && t.isActive);
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

    const updatedTable: Table = {
      ...table,
      occupiedSeats: desiredSeats
    };
    this.tables.set(table.id, updatedTable);
    return updatedTable;
  }

  // Layout settings methods
  async getLayoutSettings(): Promise<LayoutSettings | undefined> {
    return this.layoutSettings;
  }

  async updateLayoutSettings(settings: InsertLayoutSettings): Promise<LayoutSettings> {
    const id = randomUUID();
    const newSettings: LayoutSettings = {
      id,
      layoutImageUrl: settings.layoutImageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.layoutSettings = newSettings;
    return newSettings;
  }

  // Event management methods
  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values()).sort((a, b) => b.year - a.year);
  }

  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const newEvent: Event = {
      id,
      ...event,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<Event> {
    const existingEvent = this.events.get(id);
    if (!existingEvent) {
      throw new Error(`Event with id ${id} not found`);
    }

    const updatedEvent: Event = {
      ...existingEvent,
      ...updates,
      updatedAt: new Date()
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    this.events.delete(id);
  }

  async clearCurrentEvent(): Promise<void> {
    for (const [id, event] of this.events.entries()) {
      if (event.isCurrent) {
        const updatedEvent: Event = { ...event, isCurrent: false, updatedAt: new Date() };
        this.events.set(id, updatedEvent);
      }
    }
  }

  async setCurrentEvent(id: string): Promise<Event> {
    const event = this.events.get(id);
    if (!event) {
      throw new Error(`Event with id ${id} not found`);
    }

    const updatedEvent: Event = { ...event, isCurrent: true, updatedAt: new Date() };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async getCurrentEvent(): Promise<Event | undefined> {
    return Array.from(this.events.values()).find(event => event.isCurrent);
  }

  // PRICING TIERS METHODS
  
  async getPricingTiersByEvent(eventId: string): Promise<PricingTier[]> {
    return Array.from(this.pricingTiers.values()).filter(tier => tier.eventId === eventId);
  }

  async getActivePricingTier(eventId: string): Promise<PricingTier | undefined> {
    const now = new Date();
    const eventTiers = Array.from(this.pricingTiers.values())
      .filter(tier => 
        tier.eventId === eventId && 
        tier.isActive && 
        new Date(tier.startDate) <= now && 
        new Date(tier.endDate) >= now
      )
      .sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Sort by priority descending
    
    return eventTiers[0]; // Return highest priority active tier
  }

  async createPricingTier(tier: InsertPricingTier): Promise<PricingTier> {
    const id = randomUUID();
    const newTier: PricingTier = {
      ...tier,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.pricingTiers.set(id, newTier);
    return newTier;
  }

  async updatePricingTier(id: string, updates: Partial<InsertPricingTier>): Promise<PricingTier> {
    const existingTier = this.pricingTiers.get(id);
    if (!existingTier) {
      throw new Error(`Pricing tier with id ${id} not found`);
    }

    const updatedTier: PricingTier = {
      ...existingTier,
      ...updates,
      updatedAt: new Date()
    };
    this.pricingTiers.set(id, updatedTier);
    return updatedTier;
  }

  async deletePricingTier(id: string): Promise<void> {
    this.pricingTiers.delete(id);
  }

  // PACKAGE CONFIGURATION METHODS
  
  async getPackageConfigurationsByEvent(eventId: string): Promise<PackageConfiguration[]> {
    return Array.from(this.packageConfigurations.values())
      .filter(config => config.eventId === eventId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async getPackageConfiguration(eventId: string, packageType: string): Promise<PackageConfiguration | undefined> {
    return Array.from(this.packageConfigurations.values())
      .find(config => config.eventId === eventId && config.packageType === packageType && config.isActive);
  }

  async createPackageConfiguration(packageConfig: InsertPackageConfiguration): Promise<PackageConfiguration> {
    const id = randomUUID();
    const newConfig: PackageConfiguration = {
      ...packageConfig,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.packageConfigurations.set(id, newConfig);
    return newConfig;
  }

  async updatePackageConfiguration(id: string, updates: Partial<InsertPackageConfiguration>): Promise<PackageConfiguration> {
    const existingConfig = this.packageConfigurations.get(id);
    if (!existingConfig) {
      throw new Error(`Package configuration with id ${id} not found`);
    }

    const updatedConfig: PackageConfiguration = {
      ...existingConfig,
      ...updates,
      updatedAt: new Date()
    };
    this.packageConfigurations.set(id, updatedConfig);
    return updatedConfig;
  }

  async deletePackageConfiguration(id: string): Promise<void> {
    this.packageConfigurations.delete(id);
  }
}

// Export Supabase storage implementation
export { storage } from './supabaseStorageImpl';
