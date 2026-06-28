import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { createEntrySchema } from '@/lib/validators';
import { json, error, unauthorized } from '@/lib/response';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicleId');
  const employeeId = searchParams.get('employeeId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const where: Prisma.EntryWhereInput = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (employeeId) where.employeeId = employeeId;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      orderBy: { date: 'desc' },
      take: Math.min(limit, 200),
      skip: offset,
      include: {
        vehicle: { select: { id: true, name: true, regNumber: true } },
        employee: { select: { id: true, name: true } },
      },
    }),
    prisma.entry.count({ where }),
  ]);

  return json({ entries, total, limit, offset });
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createEntrySchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.errors.map((e) => e.message).join(', '), 400);
    }

    const data = parsed.data;

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle) return error('Vehicle not found', 404);

    // Verify employee exists if provided
    if (data.employeeId) {
      const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
      if (!employee) return error('Employee not found', 404);
    }

    // Server-side commission computation
    const totalExpenses =
      data.cng + data.maintenance + data.toll + data.uberSub + data.misc;
    const commissionBaseAmount =
      data.commissionBase === 'net'
        ? data.collection - totalExpenses
        : data.collection;
    const _salary = (data.commissionPercent * commissionBaseAmount) / 100;
    // salary is computed on the fly from stored fields — we don't store it

    const entry = await prisma.entry.create({
      data: {
        date: new Date(data.date),
        vehicleId: data.vehicleId,
        employeeId: data.employeeId || null,
        startKm: data.startKm,
        endKm: data.endKm,
        collection: data.collection,
        cng: data.cng,
        maintenance: data.maintenance,
        toll: data.toll,
        uberSub: data.uberSub,
        misc: data.misc,
        commissionPercent: data.commissionPercent,
        commissionBase: data.commissionBase,
        createdById: user.userId,
      },
      include: {
        vehicle: { select: { id: true, name: true, regNumber: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    return json(entry, 201);
  } catch (e: unknown) {
    console.error('Create entry error:', e);
    return error('Internal server error', 500);
  }
}
