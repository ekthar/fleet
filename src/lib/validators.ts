import { z } from 'zod';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  phone: z.string().min(10).max(15),
  password: z.string().min(1), // Accepts both full passwords and PINs
});

// ─── Vehicle ─────────────────────────────────────────────────────────────────

export const createVehicleSchema = z.object({
  name: z.string().min(1).max(100),
  regNumber: z.string().min(1).max(20),
  model: z.string().min(1).max(100),
  startKm: z.number().min(0),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

// ─── Employee ────────────────────────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(50),
  phone: z.string().min(10).max(15),
  assignedVehicleId: z.string().nullable().optional(),
  currentPercent: z.number().min(0).max(100),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

// ─── Entry ───────────────────────────────────────────────────────────────────

export const createEntrySchema = z.object({
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  vehicleId: z.string().min(1),
  employeeId: z.string().nullable().optional(),
  startKm: z.number().min(0),
  endKm: z.number().min(0),
  collection: z.number().min(0),
  cng: z.number().min(0).optional().default(0),
  maintenance: z.number().min(0).optional().default(0),
  toll: z.number().min(0).optional().default(0),
  uberSub: z.number().min(0).optional().default(0),
  misc: z.number().min(0).optional().default(0),
  commissionPercent: z.number().min(0).max(100),
  commissionBase: z.enum(['gross', 'net']).optional().default('net'),
});

export const updateEntrySchema = createEntrySchema.partial();
