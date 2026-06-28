import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { updateEntrySchema } from '@/lib/validators';
import { json, error, unauthorized, notFound, forbidden } from '@/lib/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: {
      vehicle: { select: { id: true, name: true, regNumber: true } },
      employee: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!entry) return notFound('Entry not found');
  return json(entry);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors.map((e) => e.message).join(', '), 400);
  }

  try {
    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.date) updateData.date = new Date(parsed.data.date);

    const entry = await prisma.entry.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: { select: { id: true, name: true, regNumber: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    return json(entry);
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') return notFound('Entry not found');
    console.error('Update entry error:', e);
    return error('Internal server error', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (user.role !== 'owner') return forbidden('Only owners can delete entries');

  const { id } = await params;

  try {
    await prisma.entry.delete({ where: { id } });
    return json({ success: true });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2025') return notFound('Entry not found');
    console.error('Delete entry error:', e);
    return error('Internal server error', 500);
  }
}
