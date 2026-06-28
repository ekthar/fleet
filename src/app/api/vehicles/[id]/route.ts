import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { updateVehicleSchema } from '@/lib/validators';
import { json, error, unauthorized, notFound, forbidden } from '@/lib/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      employees: { select: { id: true, name: true, role: true, currentPercent: true } },
    },
  });

  if (!vehicle) return notFound('Vehicle not found');
  return json(vehicle);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = updateVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors.map((e) => e.message).join(', '), 400);
  }

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: parsed.data,
    });
    return json(vehicle);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') return notFound('Vehicle not found');
    if ((e as { code?: string }).code === 'P2002') return error('Registration number already exists', 409);
    console.error('Update vehicle error:', e);
    return error('Internal server error', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return forbidden('Only owners can delete vehicles');

  const { id } = await params;

  try {
    await prisma.vehicle.delete({ where: { id } });
    return json({ success: true });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') return notFound('Vehicle not found');
    console.error('Delete vehicle error:', e);
    return error('Internal server error', 500);
  }
}
