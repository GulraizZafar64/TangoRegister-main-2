# Overview

This is a comprehensive registration system for the Dubai Tango Festival built with React frontend, Express backend, and in-memory storage. The application features three package options: Full Package (1350 AED), Evening Package (700 AED), and Create Your Own Package (custom pricing). Users can register as leaders, followers, or couples through a multi-step wizard that includes workshop selection, milonga events, gala dinner seating, add-ons, and dual payment options (Stripe/offline).

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## Seat Designer & Layout Management (August 2025)
- Fixed stage movement functionality with proper drag and drop mechanics
- Enhanced seating layout saving with comprehensive data persistence and validation
- Made tables circular (rounded-full) for better visual appeal in both designer and frontend
- Improved frontend synchronization between seat designer and gala dinner component
- Added console logging for layout save/load debugging and confirmed working save mechanism
- Fixed layout reversion issues by improving storage initialization
- Added automatic cache invalidation for both seats and layout data
- Implemented dynamic layout positioning in frontend gala dinner view matching seat designer exactly
- Fixed personal information form to show role selection first (removed couple as default)

## Admin Dashboard & Payment Management (August 2025)
- Fixed SelectItem errors by replacing empty string values with "all" in filter dropdowns
- Corrected workshop enrollment calculation to use actual registration data instead of outdated values
- Added payment management features: mark payments as received and send reminder emails
- Implemented QR code check-in status with green indicator for Full Package participants
- Enhanced seat synchronization between seat designer, gala dinner component, and frontend display
- Fixed gala dinner pricing to show "Included" for Full and Evening packages
- Added real-time data syncing with 5-second intervals for seat availability
- Replaced send reminder email feature with comprehensive export functionality supporting CSV, Excel, and PDF formats
- Added filtering-aware export with detailed registration data including contact info and selections

## Custom Package Implementation (January 2025)
- Added "Create Your Own Package" option with flexible pricing
- Implemented milonga selection step for custom packages
- Enhanced checkout to display specific milonga events selected
- Fixed routing to show "Continue to Milongas" for custom packages
- Added bulk pricing discounts (4 workshops = 580 AED, 6 workshops = 820 AED)
- Resolved infinite loop issues in addons step
- Updated registration summary to show complete user selections

## Current Status
- All three package types (Full, Evening, Custom) fully functional
- Comprehensive admin dashboard with payment management and filtering
- Multi-step registration wizard with proper navigation
- Real-time seat synchronization across all components
- QR code check-in system with visual indicators
- Payment tracking and reminder system
- Ready for deployment with full administrative capabilities

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React hooks for local state, TanStack Query for server state
- **Navigation**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Payment Processing**: Stripe Elements for secure payment collection

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for workshops, seats, addons, and registrations
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Storage**: In-memory storage implementation with interface for database abstraction
- **Development**: Vite dev server integration for full-stack development

## Database Schema
- **Users**: Authentication with username/password
- **Registrations**: Main entity storing participant info, selections, and payment status
- **Workshops**: Dance classes with instructors, levels, capacity, and pricing
- **Seats**: Gala dinner seating with table assignments and VIP options
- **Addons**: Optional extras with quantity and configuration options

## Payment Integration
- **Provider**: Stripe for payment processing
- **Implementation**: Stripe Elements with Payment Intents API
- **Flow**: Multi-step wizard culminating in secure payment collection
- **Offline Support**: Alternative offline payment method option

## Development Features
- **Hot Reload**: Vite HMR for both frontend and backend
- **Type Safety**: End-to-end TypeScript with shared schemas
- **Error Handling**: Runtime error overlay and comprehensive error boundaries
- **Logging**: Request/response logging with performance metrics

# External Dependencies

## Core Technologies
- **Database**: PostgreSQL with Neon serverless driver
- **Payment Processing**: Stripe (requires STRIPE_SECRET_KEY environment variable)
- **UI Framework**: Radix UI primitives for accessible components
- **Validation**: Zod for runtime type checking and form validation

## Development Tools
- **Build System**: Vite with React plugin and TypeScript support
- **Database Migrations**: Drizzle Kit for schema management
- **Code Quality**: TypeScript compiler for type checking
- **Environment**: Replit-specific plugins for development experience

## Third-Party Services
- **Stripe**: Payment processing requiring secret key configuration
- **Database**: PostgreSQL connection via DATABASE_URL environment variable
- **Session Storage**: PostgreSQL-backed session store with connect-pg-simple