import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import { json, error } from '@/lib/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.errors[0].message, 400);
    }

    const { phone, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return error('Invalid phone or password', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return error('Invalid phone or password', 401);
    }

    const token = signToken({
      userId: user.id,
      role: user.role as 'owner' | 'staff',
      name: user.name,
    });

    return json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (e: unknown) {
    console.error('Login error:', e);
    return error('Internal server error', 500);
  }
}
