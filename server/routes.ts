import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import QRCode from "qrcode";
import { storage } from "./storage";
import { 
  insertRegistrationSchema, 
  insertAdminUserSchema,
  insertPricingTierSchema,
  insertPackageConfigurationSchema,
  insertEventSchema,
  insertWorkshopSchema,
  insertMilongaSchema,
  insertAddonSchema
} from "@shared/schema";
import type { InsertRegistration, Event, Table, Workshop } from "@shared/schema";
import { supabaseStorage } from "./supabaseStorage";
import { requireAdmin, getAdminByEmail } from "./auth";
import { supabaseAdmin } from "./supabase";
import { randomUUID } from "crypto";
import { sanitizeEventData } from "./eventTypeValidator";
import { logError, logObject, logDebug } from "./logger";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
});

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];

// Removed old token-based auth - now using Supabase Auth

const WORKSHOP_INCLUDED_PACKAGES = new Set<InsertRegistration["packageType"]>([
  "full",
  "premium-accommodation-4nights",
  "premium-accommodation-3nights",
]);

const GALA_INCLUDED_PACKAGES = new Set<InsertRegistration["packageType"]>([
  "full",
  "premium-accommodation-4nights",
  "premium-accommodation-3nights",
  "evening",
]);

const INCLUDED_WORKSHOP_LIMIT = 6;

const toDate = (value?: string | Date | null) => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

const toNumber = (value: any) => {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isWithinRange = (start?: string | Date | null, end?: string | Date | null, now: Date = new Date()) => {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return false;
  return now >= startDate && now <= endDate;
};

const isFutureDate = (dateValue?: string | Date | null, now: Date = new Date()) => {
  const parsed = toDate(dateValue);
  if (!parsed) return false;
  return parsed.getTime() >= now.getTime();
};

const getFullPackagePrice = (event: Event | undefined, now: Date) => {
  if (!event) return 0;
  if (
    toNumber(event.fullPackage24HourPrice) > 0 &&
    isWithinRange(event.fullPackage24HourStartDate as any, event.fullPackage24HourEndDate as any, now)
  ) {
    return toNumber(event.fullPackage24HourPrice);
  }

  if (
    toNumber(event.fullPackageEarlyBirdPrice) > 0 &&
    isFutureDate(event.fullPackageEarlyBirdEndDate as any, now)
  ) {
    return toNumber(event.fullPackageEarlyBirdPrice);
  }

  return toNumber(event.fullPackageStandardPrice);
};

const getEveningPackagePrice = (event: Event | undefined, now: Date) => {
  if (!event) return 0;
  if (
    toNumber(event.eveningPackage24HourPrice) > 0 &&
    isWithinRange(event.eveningPackage24HourStartDate as any, event.eveningPackage24HourEndDate as any, now)
  ) {
    return toNumber(event.eveningPackage24HourPrice);
  }

  if (
    toNumber(event.eveningPackageEarlyBirdPrice) > 0 &&
    isFutureDate(event.eveningPackageEarlyBirdEndDate as any, now)
  ) {
    return toNumber(event.eveningPackageEarlyBirdPrice);
  }

  return toNumber(event.eveningPackageStandardPrice);
};

const getAccommodationPrice = (
  event: Event | undefined,
  nights: 3 | 4,
  isSingleOccupancy: boolean,
  now: Date
) => {
  if (!event) return 0;
  const earlyBirdEnd = nights === 4
    ? event.premiumAccommodation4NightsEarlyBirdEndDate
    : event.premiumAccommodation3NightsEarlyBirdEndDate;

  const isEarlyBirdActive = isFutureDate(earlyBirdEnd as any, now);

  if (nights === 4) {
    if (isEarlyBirdActive) {
      return isSingleOccupancy
        ? toNumber(event.premiumAccommodation4NightsEarlyBirdSinglePrice)
        : toNumber(event.premiumAccommodation4NightsEarlyBirdDoublePrice);
    }
    return isSingleOccupancy
      ? toNumber(event.premiumAccommodation4NightsSinglePrice)
      : toNumber(event.premiumAccommodation4NightsDoublePrice);
  }

  if (isEarlyBirdActive) {
    return isSingleOccupancy
      ? toNumber(event.premiumAccommodation3NightsEarlyBirdSinglePrice)
      : toNumber(event.premiumAccommodation3NightsEarlyBirdDoublePrice);
  }

  return isSingleOccupancy
    ? toNumber(event.premiumAccommodation3NightsSinglePrice)
    : toNumber(event.premiumAccommodation3NightsDoublePrice);
};

const computePackagePrice = (event: Event | undefined, data: InsertRegistration, now: Date) => {
  const multiplier = data.role === "couple" ? 2 : 1;
  const isSingleOccupancy = data.role !== "couple";

  switch (data.packageType) {
    case "full":
      return getFullPackagePrice(event, now) * multiplier;
    case "evening":
      return getEveningPackagePrice(event, now) * multiplier;
    case "premium-accommodation-4nights":
      return getAccommodationPrice(event, 4, isSingleOccupancy, now);
    case "premium-accommodation-3nights":
      return getAccommodationPrice(event, 3, isSingleOccupancy, now);
    case "custom":
    default:
      return 0;
  }
};

const getWorkshopUnitPrice = (workshop: Workshop, event: Event | undefined, now: Date) => {
  const workshopPrice = toNumber(workshop.price);
  if (!event) {
    return workshopPrice;
  }

  const earlyBirdPrice = toNumber((event as any).workshopEarlyBirdPrice);
  const earlyBirdEndDate = (event as any).workshopEarlyBirdEndDate;
  if (earlyBirdPrice > 0 && isFutureDate(earlyBirdEndDate, now)) {
    return earlyBirdPrice;
  }

  const standardPrice = toNumber((event as any).workshopStandardPrice);
  if (standardPrice > 0) {
    return standardPrice;
  }

  return workshopPrice;
};

const getTablePrice = (table: Table, now: Date) => {
  const earlyBirdPrice = toNumber((table as any).earlyBirdPrice);
  if (earlyBirdPrice > 0 && isFutureDate((table as any).earlyBirdEndDate, now)) {
    return earlyBirdPrice;
  }
  return toNumber(table.price);
};

const getMilongaPrice = (milonga: any, now: Date) => {
  const earlyBirdPrice = toNumber(milonga.earlyBirdPrice);
  if (earlyBirdPrice > 0 && isFutureDate(milonga.earlyBirdEndDate, now)) {
    return earlyBirdPrice;
  }
  return toNumber(milonga.price);
};

// Image validation is now handled at upload time in Supabase Storage
// This function is kept for backwards compatibility but simplified
const ensureValidImageUpload = async (imagePath: string) => {
  // Basic validation - file should exist and be accessible
  if (!imagePath) {
    throw new Error("Image path is required");
  }
  // Additional validation can be added here if needed
};

// Old token functions removed - now using Supabase Auth

async function calculateRegistrationTotal(data: InsertRegistration) {
  const now = new Date();
  const event = data.eventId ? await storage.getEvent(data.eventId) : undefined;
  const multiplier = data.role === "couple" ? 2 : 1;
  const workshopIds = data.workshopIds || [];

  const workshopDetails = await Promise.all(
    workshopIds.map(async (id) => {
      const workshop = await storage.getWorkshop(id);
      return workshop ? { id, workshop } : null;
    })
  );

  let workshopTotal = 0;
  const hasIncludedWorkshops = WORKSHOP_INCLUDED_PACKAGES.has(data.packageType);

  workshopDetails.forEach((entry, index) => {
    if (!entry) return;
    if (hasIncludedWorkshops && index < INCLUDED_WORKSHOP_LIMIT) {
      return;
    }
    const pricePerSeat = getWorkshopUnitPrice(entry.workshop, event, now);
    workshopTotal += pricePerSeat * multiplier;
  });

  let milongaTotal = 0;
  if (data.packageType === "custom") {
    const milongaIds = data.milongaIds || [];
    const milongaDetails = await Promise.all(
      milongaIds.map(async (id) => {
        const milonga = await storage.getMilonga(id);
        return milonga ? { id, milonga } : null;
      })
    );

    milongaDetails.forEach((entry) => {
      if (!entry) return;
      milongaTotal += getMilongaPrice(entry.milonga, now) * multiplier;
    });
  }

  let galaTotal = 0;
  if (data.selectedTableNumber && !GALA_INCLUDED_PACKAGES.has(data.packageType)) {
    const tables = await storage.getTables();
    const table = tables.find((t) => t.tableNumber === data.selectedTableNumber);
    if (table) {
      const seatsNeeded = data.role === "couple" ? 2 : 1;
      galaTotal = getTablePrice(table, now) * seatsNeeded;
    }
  }

  let addonTotal = 0;
  for (const addonSelection of data.addons || []) {
    const addon = await storage.getAddon(addonSelection.id);
    if (!addon) continue;
    addonTotal += toNumber(addon.price) * addonSelection.quantity;
  }

  const packageTotal = computePackagePrice(event, data, now);

  const calculatedTotal = packageTotal + workshopTotal + milongaTotal + galaTotal + addonTotal;
  return Math.round(calculatedTotal * 100) / 100;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin authentication endpoint - now using Supabase Auth
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Email and password are required" 
        });
      }
      
      // Sign in with Supabase
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error || !data.user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password" 
        });
      }
      
      // Check if user is an admin
      const admin = await getAdminByEmail(data.user.email!);
      if (!admin || !admin.isActive) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied - Admin privileges required" 
        });
      }
      
      res.json({ 
        success: true, 
        token: data.session?.access_token,
        user: {
          email: data.user.email,
          id: data.user.id,
        },
        message: "Login successful" 
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error during login" 
      });
    }
  });

  // Verify admin endpoint - checks if current user is an admin
  app.get("/api/admin/verify", requireAdmin, async (req, res) => {
    res.json({ 
      success: true, 
      admin: (req as any).admin 
    });
  });

  // Use Supabase auth middleware for admin routes
  const requireAdminAuth = requireAdmin;

  // Admin User Management Routes
  
  // Get all admin users
  app.get("/api/admin/users", requireAdminAuth, async (req, res) => {
    try {
      const adminUsers = await storage.getAdminUsers();
      // Remove password field from response
      const safeUsers = adminUsers.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching admin users: " + error.message });
    }
  });

  // Create admin user
  app.post("/api/admin/users", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertAdminUserSchema.parse(req.body);
      const adminUser = await storage.createAdminUser(validatedData);
      
      // Remove password field from response
      const { password, ...safeUser } = adminUser;
      res.json(safeUser);
    } catch (error: any) {
      res.status(400).json({ message: "Error creating admin user: " + error.message });
    }
  });

  // Update admin user
  app.put("/api/admin/users/:id", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertAdminUserSchema.partial().parse(req.body);
      const adminUser = await storage.updateAdminUser(req.params.id, validatedData);
      
      // Remove password field from response
      const { password, ...safeUser } = adminUser;
      res.json(safeUser);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating admin user: " + error.message });
    }
  });

  // Deactivate admin user (soft delete)
  app.delete("/api/admin/users/:id", requireAdminAuth, async (req, res) => {
    try {
      const adminUser = await storage.deactivateAdminUser(req.params.id);
      
      // Remove password field from response
      const { password, ...safeUser } = adminUser;
      res.json({ message: "Admin user deactivated successfully", user: safeUser });
    } catch (error: any) {
      res.status(400).json({ message: "Error deactivating admin user: " + error.message });
    }
  });

  // Get workshops
  app.get("/api/workshops", async (req, res) => {
    try {
      const workshops = await storage.getWorkshops();
      res.json(workshops);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching workshops: " + error.message });
    }
  });

  // Get seats
  app.get("/api/seats", async (req, res) => {
    try {
      const seats = await storage.getSeats();
      res.json(seats);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching seats: " + error.message });
    }
  });

  // Get milongas
  app.get("/api/milongas", async (req, res) => {
    try {
      const milongas = await storage.getMilongas();
      res.json(milongas);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching milongas: " + error.message });
    }
  });

  // Get add-ons
  app.get("/api/addons", async (req, res) => {
    try {
      let addons = await storage.getAddons();
      
      // Ensure t-shirt addon exists for current event
      const currentEvent = await storage.getCurrentEvent();
      if (currentEvent) {
        const tshirtAddon = addons.find(a => a.id === 'addon-tshirt');
        if (!tshirtAddon || tshirtAddon.eventId !== currentEvent.id) {
          // T-shirt addon doesn't exist or is for a different event, create/update it
          try {
            const tshirtAddonData = {
              id: 'addon-tshirt',
              eventId: currentEvent.id,
              name: "Festival T-Shirt",
              description: "Premium cotton t-shirt with exclusive Dubai Tango Festival design",
              price: "35.00",
              category: "clothing",
              options: {
                sizes: ["XS", "S", "M", "L", "XL", "XXL"],
                allowImageUpload: true
              }
            };
            
            if (tshirtAddon) {
              await storage.updateAddon('addon-tshirt', tshirtAddonData);
            } else {
              await storage.createAddon(tshirtAddonData as any);
            }
            
            // Fetch addons again to include the newly created/updated t-shirt addon
            addons = await storage.getAddons();
          } catch (error: any) {
            // Log error but don't fail the request
            console.error("Error ensuring t-shirt addon:", error);
          }
        }
      }
      
      res.json(addons);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching add-ons: " + error.message });
    }
  });

  // Create addon (admin)
  app.post("/api/addons", async (req, res) => {
    try {
      let addonData = req.body;
      
      // If eventId is not provided, try to get the current event
      if (!addonData.eventId) {
        const currentEvent = await storage.getCurrentEvent();
        if (!currentEvent) {
          return res.status(400).json({ 
            message: "Event ID is required. Please select an event or set a current event." 
          });
        }
        addonData = { ...addonData, eventId: currentEvent.id };
      }
      
      // Validate the addon data (schema omits id, so we handle it separately)
      const validatedData = insertAddonSchema.parse(addonData);
      
      // If a custom ID is provided, include it (for special addons like t-shirt)
      if (addonData.id) {
        (validatedData as any).id = addonData.id;
      }
      
      const addon = await storage.createAddon(validatedData);
      res.json(addon);
    } catch (error: any) {
      console.error("Error creating addon:", error);
      res.status(400).json({ message: "Error creating addon: " + error.message });
    }
  });

  // Update addon (admin)
  app.put("/api/addons/:id", async (req, res) => {
    try {
      const addon = await storage.updateAddon(req.params.id, req.body);
      res.json(addon);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating addon: " + error.message });
    }
  });

  // Delete addon (admin)
  app.delete("/api/addons/:id", async (req, res) => {
    try {
      await storage.deleteAddon(req.params.id);
      res.json({ message: "Addon deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: "Error deleting addon: " + error.message });
    }
  });

  // Object storage endpoints - Supabase Storage uses direct URLs
  // This endpoint now redirects to Supabase Storage signed URLs
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const filePath = req.params.objectPath;
      // Get signed URL from Supabase (1 hour expiration)
      const signedUrl = await supabaseStorage.getSignedUrl(filePath, 3600);
      res.redirect(signedUrl);
    } catch (error) {
      console.error("Error accessing object:", error);
      return res.sendStatus(404);
    }
  });

  // Update addon with image URL after upload
  app.put("/api/addons/:id/image", async (req, res) => {
    try {
      const { imageURL } = req.body;
      await ensureValidImageUpload(imageURL);
      
      // Get existing addon and update image path
      const addon = await storage.getAddon(req.params.id);
      if (!addon) {
        return res.status(404).json({ message: "Addon not found" });
      }

      const updatedAddon = await storage.updateAddon(req.params.id, {
        ...addon,
        options: {
          ...(addon.options as any),
          image: imageURL
        }
      });

      res.json(updatedAddon);
    } catch (error: any) {
      console.error("Error updating addon image:", error);
      res.status(500).json({ message: "Error updating addon image: " + error.message });
    }
  });

  // Create registration
  app.post("/api/registrations", async (req, res) => {
    try {
      let validatedData = insertRegistrationSchema.parse(req.body);
      if (validatedData.workshopIds?.length) {
        const workshopRecords = await Promise.all(
          validatedData.workshopIds.map((id) => storage.getWorkshop(id))
        );
        const scheduleMap = new Map<string, Workshop>();
        for (const workshop of workshopRecords) {
          if (!workshop) {
            return res.status(400).json({ message: "One or more selected workshops were not found." });
          }
          const key = `${workshop.date}|${workshop.time}`;
          if (scheduleMap.has(key)) {
            return res.status(400).json({
              message: `Selected workshops "${scheduleMap.get(key)?.title}" and "${workshop.title}" occur at the same time.`,
            });
          }
          scheduleMap.set(key, workshop);
        }
      }
      const calculatedTotal = await calculateRegistrationTotal(validatedData);
      validatedData = { ...validatedData, totalAmount: calculatedTotal };
      const registration = await storage.createRegistration(validatedData);
      
      // Update workshop enrollments
      for (const workshopId of validatedData.workshopIds || []) {
        const workshop = await storage.getWorkshop(workshopId);
        if (workshop) {
          const multiplier = validatedData.role === 'couple' ? 2 : 1;
          await storage.updateWorkshopEnrollment(workshopId, (workshop.enrolled || 0) + multiplier);
        }
      }

      // Update milonga enrollments
      for (const milongaId of validatedData.milongaIds || []) {
        const milonga = await storage.getMilonga(milongaId);
        if (milonga) {
          const multiplier = validatedData.role === 'couple' ? 2 : 1;
          await storage.updateMilongaEnrollment(milongaId, (milonga.enrolled || 0) + multiplier);
        }
      }

      // Update seat availability (backward compatibility)
      for (const seatId of validatedData.seatIds || []) {
        await storage.updateSeatAvailability(seatId, false);
      }

      // Update table occupancy if table is selected
      if (validatedData.selectedTableNumber) {
        const seatsToBook = validatedData.role === 'couple' ? 2 : 1;
        try {
          await storage.updateTableOccupancy(validatedData.selectedTableNumber, seatsToBook);
        } catch (error: any) {
          return res.status(400).json({ message: error.message });
        }
      }

      res.json(registration);
    } catch (error: any) {
      console.error("Registration creation error:", error);
      logError("Registration creation error: " + (error.message || "Unknown error"));
      if (error.issues) {
        logObject("ERROR", "Validation errors", error.issues);
      }
      logObject("ERROR", "Request body", req.body);
      const errorMessage = error.message || error.toString() || "Unknown error occurred";
      res.status(400).json({ message: "Error creating registration: " + errorMessage });
    }
  });

  // Get all registrations (for admin)
  app.get("/api/registrations", async (req, res) => {
    try {
      const registrations = await storage.getRegistrations();
      res.json(registrations);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching registrations: " + error.message });
    }
  });

  // Get registration
  app.get("/api/registrations/:id", async (req, res) => {
    try {
      const registration = await storage.getRegistration(req.params.id);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      res.json(registration);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching registration: " + error.message });
    }
  });

  // Create payment intent
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { registrationId } = req.body;

      if (!registrationId) {
        return res.status(400).json({ message: "registrationId is required" });
      }

      const registration = await storage.getRegistration(registrationId);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      const totalAmount = Number(registration.totalAmount);
      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        return res.status(400).json({ message: "Registration total is invalid" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency: "aed",
        metadata: {
          registrationId,
        },
      });

      await storage.updateRegistration(registrationId, {
        stripePaymentIntentId: paymentIntent.id,
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Update payment status
  app.post("/api/registrations/:id/payment", async (req, res) => {
    try {
      const { paymentStatus, paymentIntentId } = req.body;
      const registration = await storage.updateRegistrationPayment(
        req.params.id,
        paymentStatus,
        paymentIntentId
      );
      res.json(registration);
    } catch (error: any) {
      res.status(500).json({ message: "Error updating payment status: " + error.message });
    }
  });

  // Create workshop (admin)
  app.post("/api/workshops", async (req, res) => {
    try {
      // Log workshop creation start
      logDebug("\n========== WORKSHOP CREATION START ==========");
      logObject("DEBUG", "Raw request body", req.body);
      
      let workshopData = { ...req.body };
      
      // If eventId is not provided or is empty, try to get the current event
      if (!workshopData.eventId || workshopData.eventId === '' || workshopData.eventId === null || workshopData.eventId === undefined) {
        console.log("No eventId provided, attempting to get current event...");
        
        // Try to get current event
        const currentEvent = await storage.getCurrentEvent();
        if (currentEvent) {
          logDebug(`Using current event: ${currentEvent.name} (${currentEvent.id})`);
        } else {
          logError("No current event found");
        }
        
        // If no current event, try to get first available event as fallback
        if (!currentEvent || !currentEvent.id) {
          console.warn("No current event found, trying to get first available event...");
          const allEvents = await storage.getAllEvents();
          console.log("All available events:", allEvents.map(e => ({ id: e.id, name: e.name, isCurrent: e.isCurrent })));
          
          if (allEvents.length === 0) {
            console.error("No events found in database at all!");
            return res.status(400).json({ 
              message: "No events found. Please create an event first." 
            });
          }
          
          // Use first event as fallback
          const fallbackEvent = allEvents[0];
          console.warn("Using first available event as fallback:", { id: fallbackEvent.id, name: fallbackEvent.name });
          workshopData.eventId = String(fallbackEvent.id);
        } else {
          // Phase 2: Explicitly set eventId and verify it's a string
          workshopData.eventId = String(currentEvent.id);
          logDebug(`Set eventId: ${workshopData.eventId}`);
        }
      }
      
      // Phase 2: Ensure eventId is set and is a string
      if (!workshopData.eventId || typeof workshopData.eventId !== 'string') {
        console.error("EventId validation failed:", { eventId: workshopData.eventId, type: typeof workshopData.eventId });
        return res.status(400).json({ 
          message: "Event ID is required and must be a valid string." 
        });
      }
      
      logDebug("Workshop data before field processing");
      
      // Ensure numeric fields are properly converted and valid
      if (workshopData.leaderCapacity !== undefined && workshopData.leaderCapacity !== null) {
        const leaderCap = Number(workshopData.leaderCapacity);
        if (isNaN(leaderCap) || leaderCap < 0) {
          return res.status(400).json({ message: "Leader capacity must be a valid positive number" });
        }
        workshopData.leaderCapacity = leaderCap;
      }
      
      if (workshopData.followerCapacity !== undefined && workshopData.followerCapacity !== null) {
        const followerCap = Number(workshopData.followerCapacity);
        if (isNaN(followerCap) || followerCap < 0) {
          return res.status(400).json({ message: "Follower capacity must be a valid positive number" });
        }
        workshopData.followerCapacity = followerCap;
      }
      
      // Calculate capacity from leaderCapacity + followerCapacity if not provided
      if (!workshopData.capacity && workshopData.leaderCapacity !== undefined && workshopData.followerCapacity !== undefined) {
        workshopData.capacity = Number(workshopData.leaderCapacity) + Number(workshopData.followerCapacity);
      } else if (workshopData.capacity !== undefined) {
        const cap = Number(workshopData.capacity);
        if (isNaN(cap) || cap < 0) {
          return res.status(400).json({ message: "Capacity must be a valid positive number" });
        }
        workshopData.capacity = cap;
      }
      
      // Ensure price is a valid decimal string
      if (workshopData.price !== undefined && workshopData.price !== null) {
        const priceNum = Number(workshopData.price);
        if (isNaN(priceNum) || priceNum < 0) {
          return res.status(400).json({ message: "Price must be a valid positive number" });
        }
        workshopData.price = priceNum.toString();
      }
      
      // Handle earlyBirdPrice
      if (workshopData.earlyBirdPrice !== undefined && workshopData.earlyBirdPrice !== null && workshopData.earlyBirdPrice !== '') {
        const earlyBirdNum = Number(workshopData.earlyBirdPrice);
        if (isNaN(earlyBirdNum) || earlyBirdNum < 0) {
          return res.status(400).json({ message: "Early bird price must be a valid positive number" });
        }
        workshopData.earlyBirdPrice = earlyBirdNum.toString();
      } else {
        workshopData.earlyBirdPrice = '0';
      }
      
      // Convert date fields to Date objects if they're strings
      if (workshopData.date !== undefined && workshopData.date !== null) {
        if (typeof workshopData.date === 'string') {
          const dateObj = new Date(workshopData.date);
          if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
          }
          workshopData.date = dateObj;
        } else if (!(workshopData.date instanceof Date)) {
          return res.status(400).json({ message: "Date must be a valid date" });
        }
      }
      
      // Handle earlyBirdEndDate (optional)
      if (workshopData.earlyBirdEndDate !== undefined && workshopData.earlyBirdEndDate !== null && workshopData.earlyBirdEndDate !== '') {
        if (typeof workshopData.earlyBirdEndDate === 'string') {
          const dateObj = new Date(workshopData.earlyBirdEndDate);
          if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ message: "Invalid early bird end date format" });
          }
          workshopData.earlyBirdEndDate = dateObj;
        } else if (!(workshopData.earlyBirdEndDate instanceof Date)) {
          return res.status(400).json({ message: "Early bird end date must be a valid date" });
        }
      } else {
        workshopData.earlyBirdEndDate = null;
      }
      
      // Phase 1 & 2: Double-check eventId is still present before validation
      if (!workshopData.eventId) {
        console.error("EventId missing before validation!");
        return res.status(400).json({ 
          message: "Event ID is missing. Please ensure an event is selected or set as current." 
        });
      }
      
      // Log before Zod validation
      logDebug("Workshop data before Zod validation");
      
      // Phase 2: Store eventId separately to ensure it survives validation
      const eventIdToPreserve = String(workshopData.eventId);
      
      // Validate the workshop data
      let validatedData;
      try {
        validatedData = insertWorkshopSchema.parse(workshopData);
      } catch (validationError: any) {
        logError(`Zod validation error: ${validationError.message}`);
        logObject("ERROR", "Data that failed validation", workshopData);
        return res.status(400).json({ 
          message: "Validation error: " + validationError.message 
        });
      }
      
      // Log after Zod validation
      logDebug(`Validated data - eventId: ${validatedData.eventId}`);
      
      // Phase 2: Ensure eventId survives validation - add it back if missing
      if (!validatedData.eventId) {
        console.warn("EventId lost during Zod validation! Restoring from preserved value.");
        validatedData.eventId = eventIdToPreserve;
      }
      
      // Final check: ensure eventId is in validated data
      if (!validatedData.eventId) {
        console.error("EventId still missing after restoration!");
        console.error("Original data:", JSON.stringify(workshopData, null, 2));
        console.error("Validated data:", JSON.stringify(validatedData, null, 2));
        return res.status(400).json({ 
          message: "Event ID validation failed. Please ensure an event is selected." 
        });
      }
      
      // Final check before database insert
      logDebug(`Final check - eventId: ${validatedData.eventId}, type: ${typeof validatedData.eventId}`);
      
      // CRITICAL CHECK: Verify eventId one more time before calling createWorkshop
      if (!validatedData.eventId || validatedData.eventId === 'undefined' || validatedData.eventId === 'null') {
        logError("CRITICAL ERROR: eventId is missing or invalid right before createWorkshop!");
        logObject("ERROR", "ValidatedData object", validatedData);
        logError(`ValidatedData keys: ${Object.keys(validatedData).join(", ")}`);
        return res.status(400).json({ 
          message: "Event ID is missing. This should not happen. Please check server logs." 
        });
      }
      
      logDebug(`Calling storage.createWorkshop with eventId: ${validatedData.eventId}`);
      const workshop = await storage.createWorkshop(validatedData);
      logDebug("=== WORKSHOP CREATION SUCCESS ===");
      res.json(workshop);
    } catch (error: any) {
      // Ensure error logs are visible even if truncated
      logError("\n========== WORKSHOP CREATION ERROR ==========");
      logError(`Error message: ${error.message}`);
      logError(`Error stack: ${error.stack}`);
      logError(`Error code: ${error.code}`);
      logError(`Error detail: ${error.detail}`);
      logError(`Error hint: ${error.hint}`);
      logObject("ERROR", "Workshop data received", req.body);
      logError("=============================================\n");
      
      // Log full error message without truncation
      const fullErrorMessage = error.message || "Unknown error";
      logError(`FULL ERROR MESSAGE: ${fullErrorMessage}`);
      
      res.status(400).json({ message: "Error creating workshop: " + fullErrorMessage });
    }
  });

  // Update workshop (admin)
  app.put("/api/workshops/:id", async (req, res) => {
    try {
      let workshopData = { ...req.body };
      
      // Convert date fields to Date objects if they're strings
      if (workshopData.date !== undefined && workshopData.date !== null) {
        if (typeof workshopData.date === 'string') {
          const dateObj = new Date(workshopData.date);
          if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
          }
          workshopData.date = dateObj;
        } else if (!(workshopData.date instanceof Date)) {
          return res.status(400).json({ message: "Date must be a valid date" });
        }
      }
      
      // Handle earlyBirdEndDate (optional)
      if (workshopData.earlyBirdEndDate !== undefined && workshopData.earlyBirdEndDate !== null && workshopData.earlyBirdEndDate !== '') {
        if (typeof workshopData.earlyBirdEndDate === 'string') {
          const dateObj = new Date(workshopData.earlyBirdEndDate);
          if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ message: "Invalid early bird end date format" });
          }
          workshopData.earlyBirdEndDate = dateObj;
        } else if (!(workshopData.earlyBirdEndDate instanceof Date)) {
          return res.status(400).json({ message: "Early bird end date must be a valid date" });
        }
      } else if (workshopData.earlyBirdEndDate === '') {
        workshopData.earlyBirdEndDate = null;
      }
      
      const workshop = await storage.updateWorkshop(req.params.id, workshopData);
      res.json(workshop);
    } catch (error: any) {
      console.error("Error updating workshop:", error);
      res.status(400).json({ message: "Error updating workshop: " + error.message });
    }
  });

  // Delete workshop (admin)
  app.delete("/api/workshops/:id", async (req, res) => {
    try {
      await storage.deleteWorkshop(req.params.id);
      res.json({ message: "Workshop deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: "Error deleting workshop: " + error.message });
    }
  });

  // Create milonga (admin)
  app.post("/api/milongas", async (req, res) => {
    try {
      let milongaData = req.body;
      
      // If eventId is not provided, try to get the current event
      if (!milongaData.eventId) {
        const currentEvent = await storage.getCurrentEvent();
        if (!currentEvent) {
          return res.status(400).json({ 
            message: "Event ID is required. Please select an event or set a current event." 
          });
        }
        milongaData = { ...milongaData, eventId: currentEvent.id };
      }
      
      // Validate the milonga data
      const validatedData = insertMilongaSchema.parse(milongaData);
      const milonga = await storage.createMilonga(validatedData);
      res.json(milonga);
    } catch (error: any) {
      console.error("Error creating milonga:", error);
      res.status(400).json({ message: "Error creating milonga: " + error.message });
    }
  });

  // Update milonga (admin)
  app.put("/api/milongas/:id", async (req, res) => {
    try {
      const milonga = await storage.updateMilonga(req.params.id, req.body);
      res.json(milonga);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating milonga: " + error.message });
    }
  });

  // Delete milonga (admin)
  app.delete("/api/milongas/:id", async (req, res) => {
    try {
      await storage.deleteMilonga(req.params.id);
      res.json({ message: "Milonga deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: "Error deleting milonga: " + error.message });
    }
  });

  // Update workshop enrollment (admin)
  app.put("/api/workshops/:id/enrollment", async (req, res) => {
    try {
      const { enrolled } = req.body;
      const workshop = await storage.updateWorkshopEnrollment(req.params.id, enrolled);
      res.json(workshop);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating enrollment: " + error.message });
    }
  });

  // Update seat availability (admin)
  app.put("/api/seats/:id", async (req, res) => {
    try {
      const { isAvailable } = req.body;
      const seat = await storage.updateSeatAvailability(req.params.id, isAvailable);
      res.json(seat);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating seat: " + error.message });
    }
  });

  // Update registration (admin)
  app.put("/api/registrations/:id", async (req, res) => {
    try {
      const registration = await storage.updateRegistration(req.params.id, req.body);
      res.json(registration);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating registration: " + error.message });
    }
  });

  // Update registration payment status (admin)
  app.put("/api/registrations/:id/payment", async (req, res) => {
    try {
      const { paymentStatus, paymentIntentId } = req.body;
      const registration = await storage.updateRegistrationPayment(req.params.id, paymentStatus, paymentIntentId);
      res.json(registration);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating payment: " + error.message });
    }
  });

  // Delete registration (admin)
  app.delete("/api/registrations/:id", async (req, res) => {
    try {
      // Express automatically decodes URL parameters, but ensure we have a valid string
      let registrationId = req.params.id;
      
      // Validate ID format
      if (!registrationId || typeof registrationId !== 'string') {
        return res.status(400).json({ message: "Invalid registration ID format" });
      }
      
      // Trim and validate the ID
      registrationId = registrationId.trim();
      if (registrationId === '') {
        return res.status(400).json({ message: "Registration ID cannot be empty" });
      }

      logDebug(`Attempting to delete registration with ID: ${registrationId}`);
      const registration = await storage.getRegistration(registrationId);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // Release workshop enrollments
      // Note: Workshop enrollments are recalculated dynamically in getWorkshops,
      // so we don't need to manually decrement them here. The deletion will
      // automatically be reflected in the next query.

      // Release milonga enrollments
      if (registration.milongaIds && Array.isArray(registration.milongaIds)) {
        for (const milongaId of registration.milongaIds) {
          const milonga = await storage.getMilonga(milongaId);
          if (milonga) {
            const multiplier = registration.role === 'couple' ? 2 : 1;
            await storage.updateMilongaEnrollment(milongaId, Math.max(0, (milonga.enrolled || 0) - multiplier));
          }
        }
      }

      // Release table seats
      if (registration.selectedTableNumber) {
        const seatsToRelease = registration.role === 'couple' ? 2 : 1;
        await storage.updateTableOccupancy(registration.selectedTableNumber, -seatsToRelease);
      }

      // Release gala dinner seats (backward compatibility)
      if (registration.seatIds && Array.isArray(registration.seatIds)) {
        for (const seatId of registration.seatIds) {
          await storage.updateSeatAvailability(seatId, true);
        }
      }

      // Delete the registration
      await storage.deleteRegistration(registrationId.trim());
      res.json({ message: "Registration deleted successfully" });
    } catch (error: any) {
      console.error("Delete registration error:", error);
      logError("Delete registration error: " + (error.message || "Unknown error"));
      logObject("ERROR", "Registration ID", req.params.id);
      res.status(500).json({ message: "Error deleting registration: " + error.message });
    }
  });

  // Seating layout management
  app.post("/api/seating-layout", async (req, res) => {
    try {
      // Store layout configuration
      const layout = await storage.saveSeatingLayout(req.body);
      res.json(layout);
    } catch (error: any) {
      res.status(400).json({ message: "Error saving layout: " + error.message });
    }
  });

  app.get("/api/seating-layout", async (req, res) => {
    try {
      const layout = await storage.getSeatingLayout();
      res.json(layout);
    } catch (error: any) {
      res.status(400).json({ message: "Error fetching layout: " + error.message });
    }
  });

  // New Table Management Routes
  app.get("/api/tables", async (req, res) => {
    try {
      const tables = await storage.getTables();
      res.json(tables);
    } catch (error: any) {
      res.status(400).json({ message: "Error fetching tables: " + error.message });
    }
  });

  app.get("/api/tables/:id", async (req, res) => {
    try {
      const table = await storage.getTable(req.params.id);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ message: "Error fetching table: " + error.message });
    }
  });

  app.post("/api/tables", requireAdminAuth, async (req, res) => {
    try {
      const table = await storage.createTable(req.body);
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ message: "Error creating table: " + error.message });
    }
  });

  app.put("/api/tables/:id", requireAdminAuth, async (req, res) => {
    try {
      const table = await storage.updateTable(req.params.id, req.body);
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating table: " + error.message });
    }
  });

  app.delete("/api/tables/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteTable(req.params.id);
      res.json({ message: "Table deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: "Error deleting table: " + error.message });
    }
  });

  app.put("/api/tables/:tableNumber/book", async (req, res) => {
    try {
      const { seatsToBook } = req.body;
      const tableNumber = parseInt(req.params.tableNumber);
      const table = await storage.updateTableOccupancy(tableNumber, seatsToBook);
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ message: "Error booking table: " + error.message });
    }
  });

  // Layout Settings Routes
  app.get("/api/layout-settings", async (req, res) => {
    try {
      const settings = await storage.getLayoutSettings();
      res.json(settings || { layoutImageUrl: null });
    } catch (error: any) {
      res.status(400).json({ message: "Error fetching layout settings: " + error.message });
    }
  });

  app.put("/api/layout-settings", requireAdminAuth, async (req, res) => {
    try {
      const settings = await storage.updateLayoutSettings(req.body);
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating layout settings: " + error.message });
    }
  });

  // Public object storage routes - redirect to Supabase public URLs
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    try {
      // Get public URL from Supabase
      const publicUrl = supabaseStorage.getPublicUrl(filePath);
      res.redirect(publicUrl);
    } catch (error) {
      console.error("Error accessing public object:", error);
      return res.status(404).json({ error: "File not found" });
    }
  });

  app.post("/api/objects/upload", requireAdminAuth, async (req, res) => {
    try {
      const { fileName, isPublic } = req.body;
      const { uploadUrl, path } = await supabaseStorage.getUploadUrl(
        fileName || 'upload',
        isPublic || false
      );
      res.json({ uploadURL: uploadUrl, path });
    } catch (error: any) {
      res.status(500).json({ message: "Error getting upload URL: " + error.message });
    }
  });

  app.put("/api/layout-image", requireAdminAuth, async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const imageURL = req.body.imageURL;
      await ensureValidImageUpload(imageURL);
      
      // Update layout settings with the new image
      const settings = await storage.updateLayoutSettings({ layoutImageUrl: imageURL });
      
      res.status(200).json({
        objectPath: imageURL,
        settings: settings
      });
    } catch (error) {
      console.error("Error setting layout image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Generate QR code for registration
  app.get("/api/registrations/:id/qr", async (req, res) => {
    try {
      const registration = await storage.getRegistration(req.params.id);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // Create URL that points to the confirmation page with registration details
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://${req.get('host')}` 
        : `http://${req.get('host')}`;
      const confirmationUrl = `${baseUrl}/confirmation?id=${req.params.id}`;

      // Generate QR code
      const qrCodeBuffer = await QRCode.toBuffer(confirmationUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', qrCodeBuffer.length);
      res.send(qrCodeBuffer);
    } catch (error: any) {
      res.status(400).json({ message: "Error generating QR code: " + error.message });
    }
  });

  // Events management endpoints
  // Public endpoint to get current event (no auth required)
  app.get("/api/events/current", async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      const currentEvent = events.find(event => event.isCurrent);
      
      if (!currentEvent) {
        return res.status(404).json({ message: "No current event found" });
      }
      
      res.json(currentEvent);
    } catch (error: any) {
      res.status(400).json({ message: "Error fetching current event: " + error.message });
    }
  });

  app.get("/api/events", requireAdminAuth, async (req, res) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error: any) {
      res.status(400).json({ message: "Error fetching events: " + error.message });
    }
  });

  app.post("/api/events", requireAdminAuth, async (req, res) => {
    try {
      const eventData = sanitizeEventData(req.body);
      
      // If this event is set as current, make sure no other event is current
      if (eventData.isCurrent) {
        await storage.clearCurrentEvent();
      }
      
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error: any) {
      console.error("Error creating event:", error);
      console.error("Event data received:", JSON.stringify(req.body, null, 2));
      res.status(400).json({ message: "Error creating event: " + error.message });
    }
  });

  app.put("/api/events/:id", requireAdminAuth, async (req, res) => {
    try {
      const eventData = sanitizeEventData(req.body);
      
      // If this event is set as current, make sure no other event is current
      if (eventData.isCurrent) {
        await storage.clearCurrentEvent();
      }
      
      const event = await storage.updateEvent(req.params.id, eventData);
      res.json(event);
    } catch (error: any) {
      console.error("Error updating event:", error);
      console.error("Event data received:", JSON.stringify(req.body, null, 2));
      res.status(400).json({ message: "Error updating event: " + error.message });
    }
  });

  app.delete("/api/events/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deleteEvent(req.params.id);
      res.json({ message: "Event deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: "Error deleting event: " + error.message });
    }
  });

  app.put("/api/events/:id/set-current", requireAdminAuth, async (req, res) => {
    try {
      await storage.clearCurrentEvent();
      await storage.setCurrentEvent(req.params.id);
      res.json({ message: "Event set as current successfully" });
    } catch (error: any) {
      res.status(400).json({ message: "Error setting current event: " + error.message });
    }
  });

  // PRICING TIERS MANAGEMENT ROUTES
  
  // Get all pricing tiers for an event
  app.get("/api/events/:eventId/pricing-tiers", async (req, res) => {
    try {
      const pricingTiers = await storage.getPricingTiersByEvent(req.params.eventId);
      res.json(pricingTiers);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching pricing tiers: " + error.message });
    }
  });

  // Get active pricing tier for an event (based on current date)
  app.get("/api/events/:eventId/active-pricing-tier", async (req, res) => {
    try {
      const activeTier = await storage.getActivePricingTier(req.params.eventId);
      res.json(activeTier);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching active pricing tier: " + error.message });
    }
  });

  // Create pricing tier
  app.post("/api/events/:eventId/pricing-tiers", requireAdminAuth, async (req, res) => {
    try {
      const tierData = { ...req.body, eventId: req.params.eventId };
      const validatedData = insertPricingTierSchema.parse(tierData);
      const pricingTier = await storage.createPricingTier(validatedData);
      res.json(pricingTier);
    } catch (error: any) {
      res.status(400).json({ message: "Error creating pricing tier: " + error.message });
    }
  });

  // Update pricing tier
  app.put("/api/pricing-tiers/:id", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertPricingTierSchema.partial().parse(req.body);
      const pricingTier = await storage.updatePricingTier(req.params.id, validatedData);
      res.json(pricingTier);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating pricing tier: " + error.message });
    }
  });

  // Delete pricing tier
  app.delete("/api/pricing-tiers/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deletePricingTier(req.params.id);
      res.json({ message: "Pricing tier deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: "Error deleting pricing tier: " + error.message });
    }
  });

  // PACKAGE CONFIGURATIONS MANAGEMENT ROUTES
  
  // Get all package configurations for an event
  app.get("/api/events/:eventId/package-configurations", async (req, res) => {
    try {
      const packages = await storage.getPackageConfigurationsByEvent(req.params.eventId);
      res.json(packages);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching package configurations: " + error.message });
    }
  });

  // Create package configuration
  app.post("/api/events/:eventId/package-configurations", requireAdminAuth, async (req, res) => {
    try {
      const packageData = { ...req.body, eventId: req.params.eventId };
      const validatedData = insertPackageConfigurationSchema.parse(packageData);
      const packageConfig = await storage.createPackageConfiguration(validatedData);
      res.json(packageConfig);
    } catch (error: any) {
      res.status(400).json({ message: "Error creating package configuration: " + error.message });
    }
  });

  // Update package configuration
  app.put("/api/package-configurations/:id", requireAdminAuth, async (req, res) => {
    try {
      const validatedData = insertPackageConfigurationSchema.partial().parse(req.body);
      const packageConfig = await storage.updatePackageConfiguration(req.params.id, validatedData);
      res.json(packageConfig);
    } catch (error: any) {
      res.status(400).json({ message: "Error updating package configuration: " + error.message });
    }
  });

  // Delete package configuration
  app.delete("/api/package-configurations/:id", requireAdminAuth, async (req, res) => {
    try {
      await storage.deletePackageConfiguration(req.params.id);
      res.json({ message: "Package configuration deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: "Error deleting package configuration: " + error.message });
    }
  });

  // PRICING CALCULATION ROUTE
  
  // Calculate pricing for a registration based on current tiers and packages
  app.post("/api/calculate-pricing", async (req, res) => {
    try {
      const { eventId, packageType, role, workshopCount, includeGala, addons } = req.body;
      
      // Get active pricing tier and package configuration
      const [activeTier, packageConfig] = await Promise.all([
        storage.getActivePricingTier(eventId),
        storage.getPackageConfiguration(eventId, packageType)
      ]);

      if (!packageConfig) {
        return res.status(404).json({ message: "Package configuration not found" });
      }

      // Calculate base price
      const multiplier = role === 'couple' ? packageConfig.coupleMultiplier : 1;
      let totalPrice = Number(packageConfig.basePrice) * Number(multiplier);

      // Add workshop costs
      if (packageConfig.includedWorkshops && workshopCount > packageConfig.includedWorkshops) {
        const additionalWorkshops = workshopCount - packageConfig.includedWorkshops;
        
        // Check for custom workshop pricing
        const customPricing = packageConfig.customWorkshopPricing as any;
        if (customPricing && customPricing[workshopCount.toString()]) {
          totalPrice += Number(customPricing[workshopCount.toString()]) * Number(multiplier);
        } else {
          totalPrice += additionalWorkshops * Number(packageConfig.workshopOveragePrice) * Number(multiplier);
        }
      }

      // Add gala dinner cost if not included
      if (includeGala && !packageConfig.includedGalaDinner) {
        // This would need gala dinner pricing logic
        totalPrice += 200 * Number(multiplier); // Placeholder
      }

      // Apply pricing tier discount
      if (activeTier) {
        if (Number(activeTier.discountPercentage) > 0) {
          totalPrice = totalPrice * (1 - Number(activeTier.discountPercentage) / 100);
        }
        if (Number(activeTier.discountAmount) > 0) {
          totalPrice = Math.max(0, totalPrice - Number(activeTier.discountAmount));
        }
      }

      res.json({
        totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimal places
        packageConfig,
        activeTier,
        breakdown: {
          basePrice: Number(packageConfig.basePrice) * Number(multiplier),
          workshopCosts: (packageConfig.includedWorkshops && workshopCount > packageConfig.includedWorkshops) ? 
            (workshopCount - packageConfig.includedWorkshops) * Number(packageConfig.workshopOveragePrice) * Number(multiplier) : 0,
          discountApplied: activeTier ? {
            percentage: Number(activeTier.discountPercentage),
            amount: Number(activeTier.discountAmount),
            tierName: activeTier.name
          } : null
        }
      });
    } catch (error: any) {
      res.status(400).json({ message: "Error calculating pricing: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
