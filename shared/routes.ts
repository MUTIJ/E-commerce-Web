import { z } from 'zod';
import { insertProductSchema, insertRegionSchema, products, regions, orders } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      input: z.object({
        category: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id',
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products',
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id',
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  regions: {
    list: {
      method: 'GET' as const,
      path: '/api/regions',
      responses: {
        200: z.array(z.custom<typeof regions.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/regions',
      input: insertRegionSchema,
      responses: {
        201: z.custom<typeof regions.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/regions/:id',
      responses: {
        204: z.void(),
      },
    },
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders',
      responses: {
        200: z.array(z.custom<typeof orders.$inferSelect>()), 
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/orders/:id',
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/orders',
      input: z.object({
        guestName: z.string().optional(),
        guestPhone: z.string().optional(),
        deliveryAddress: z.string(),
        regionId: z.coerce.number().optional(),
        customRegion: z.string().optional(),
        paymentMethod: z.enum(['cod', 'mpesa']),
        mpesaPhoneNumber: z.string().optional(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
        })),
      }),
      responses: {
        201: z.custom<typeof orders.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/status',
      input: z.object({ status: z.string() }),
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats',
      responses: {
        200: z.object({
          totalSales: z.number(),
          totalOrders: z.number(),
          pendingOrders: z.number(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ProductInput = z.infer<typeof api.products.create.input>;
export type OrderInput = z.infer<typeof api.orders.create.input>;
