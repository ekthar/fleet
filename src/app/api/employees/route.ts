import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { createEmployeeSchema } from '@/lib/validators';
import { json, error, unauthorized } from '@/lib/response';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      assignedVehicle: { select: { id: true, name: true, regNumber: true } },
    },
  });

  return json(employees);
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.errors.map((e) => e.message).join(', '), 400);
    }

    const { currentPercent, ...data } = parsed.data;

    // Create employee and initial rate history in a transaction
    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          ...data,
          currentPercent,
        },
      });

      // Log initial commission rate
      await tx.rateHistory.create({
        data: {
          employeeId: emp.id,
          percent: currentPercent,
          effectiveFrom: new Date(),
        },
      });

      return emp;
    });

    return json(employee, 201);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return error('Employee with this phone number already exists', 409);
    }
    console.error('Create employee error:', e);
    return error('Internal server error', 500);
  }
}
