import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { updateEmployeeSchema } from '@/lib/validators';
import { json, error, unauthorized, notFound, forbidden } from '@/lib/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      assignedVehicle: { select: { id: true, name: true, regNumber: true } },
      rateHistory: { orderBy: { effectiveFrom: 'desc' }, take: 20 },
    },
  });

  if (!employee) return notFound('Employee not found');
  return json(employee);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = updateEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors.map((e) => e.message).join(', '), 400);
  }

  // Only owner can change commission rate
  if (parsed.data.currentPercent !== undefined && user.role !== 'owner') {
    return forbidden('Only owners can change commission rates');
  }

  try {
    const employee = await prisma.$transaction(async (tx) => {
      const existing = await tx.employee.findUnique({ where: { id } });
      if (!existing) throw new Error('NOT_FOUND');

      // If currentPercent changed, log in rate history
      if (
        parsed.data.currentPercent !== undefined &&
        Number(existing.currentPercent) !== parsed.data.currentPercent
      ) {
        await tx.rateHistory.create({
          data: {
            employeeId: id,
            percent: parsed.data.currentPercent,
            effectiveFrom: new Date(),
          },
        });
      }

      return tx.employee.update({
        where: { id },
        data: parsed.data,
      });
    });

    return json(employee);
  } catch (e: unknown) {
    if ((e as Error).message === 'NOT_FOUND') return notFound('Employee not found');
    if ((e as { code?: string }).code === 'P2025') return notFound('Employee not found');
    if ((e as { code?: string }).code === 'P2002') return error('Phone number already in use', 409);
    console.error('Update employee error:', e);
    return error('Internal server error', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return forbidden('Only owners can delete employees');

  const { id } = await params;

  try {
    await prisma.employee.delete({ where: { id } });
    return json({ success: true });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') return notFound('Employee not found');
    console.error('Delete employee error:', e);
    return error('Internal server error', 500);
  }
}
