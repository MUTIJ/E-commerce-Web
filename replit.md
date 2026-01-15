# Karen Pishori Rice E-commerce Platform

## Overview

This is a full-stack e-commerce application for selling premium Pishori rice from Mwea, Kenya. The platform features a customer-facing storefront with product browsing, shopping cart, and checkout functionality, along with an admin dashboard for managing products, orders, and delivery regions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: 
  - Zustand for global cart state with localStorage persistence
  - TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with custom earthy/nature theme colors
- **UI Components**: shadcn/ui component library (Radix UI primitives)
- **Animations**: Framer Motion for page transitions and UI interactions
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ES modules)
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for type-safe request/response validation
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` defines all database tables:
  - `users` - User accounts with admin flag
  - `products` - Rice products with category, weight, stock
  - `regions` - Delivery regions with pricing
  - `orders` - Customer orders with status tracking
  - `orderItems` - Individual items within orders
  - `sessions` - Auth session storage

### Build System
- **Development**: Vite dev server with HMR
- **Production Build**: 
  - Client: Vite builds to `dist/public`
  - Server: esbuild bundles to `dist/index.cjs`
- **Database Migrations**: Drizzle Kit with `db:push` command

### Project Structure
```
client/          # React frontend
  src/
    components/  # UI components (Navbar, ProductCard, CartDrawer)
    pages/       # Route pages (Home, Products, Cart, Orders, admin/*)
    hooks/       # Custom hooks (use-auth, use-cart, use-products, etc.)
    lib/         # Utilities (queryClient, utils)
server/          # Express backend
  index.ts       # Server entry point
  routes.ts      # API route handlers
  storage.ts     # Database access layer
  db.ts          # Database connection
  replit_integrations/auth/  # Replit Auth setup
shared/          # Shared code between client/server
  schema.ts      # Drizzle database schema
  routes.ts      # API contract definitions with Zod
  models/auth.ts # User/session models
```

### Key Design Patterns
- **API Contract Pattern**: `shared/routes.ts` defines typed API contracts used by both frontend hooks and backend handlers
- **Storage Abstraction**: `IStorage` interface in `server/storage.ts` abstracts database operations
- **Component Composition**: shadcn/ui components built on Radix primitives with Tailwind styling
- **Optimistic Updates**: React Query handles caching and invalidation for data mutations

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable

### Authentication
- **Replit Auth**: OpenID Connect authentication via Replit's identity provider
- **Required env vars**: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`

### Payment (Planned)
- **M-PESA**: Schema includes fields for M-PESA phone number and transaction ID (STK push integration)
- **Cash on Delivery**: Default payment method

### Third-Party Libraries
- **@tanstack/react-query**: Server state management
- **zustand**: Client state management for cart
- **framer-motion**: Animations
- **recharts**: Admin dashboard charts
- **date-fns**: Date formatting
- **zod**: Runtime type validation