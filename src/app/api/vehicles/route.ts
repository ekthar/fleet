import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { createVehicleSchema } from '@/lib/validators';
import { json, error, unauthorized } from '@/lib/response';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      employees: {
        where: { status: 'active' },
        select: { id: true, name: true },
      },
    },
  });

  return json(vehicles);
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createVehicleSchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.errors.map((e) => e.message).join(', '), 400);
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        name: parsed.data.name,
        regNumber: parsed.data.regNumber,
        model: parsed.data.model,
        startKm: parsed.data.startKm,
        status: parsed.data.status || 'active',
      },
    });

    return json(vehicle, 201);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return error('Vehicle with this registration number already exists', 409);
    }
    console.error('Create vehicle error:', e);
    return error('Internal server error', 500);
  }
}
