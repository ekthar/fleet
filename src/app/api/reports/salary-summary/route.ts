import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { parseDateRange } from '@/lib/date-range';
import { json, unauthorized } from '@/lib/response';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const { from, to } = parseDateRange(searchParams.get('range'));

  const where: Prisma.EntryWhereInput = {
    employeeId: { not: null },
  };
  if (from) {
    where.date = { gte: from, lte: to };
  }

  const entries = await prisma.entry.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, role: true } },
    },
  });

  // Group by employee
  const employeeMap = new Map<
    string,
    {
      id: string;
      name: string;
      role: string;
      totalCollection: number;
      totalExpenses: number;
      totalSalary: number;
      entryCount: number;
    }
  >();

  for (const entry of entries) {
    if (!entry.employee) continue;

    const key = entry.employee.id;
    if (!employeeMap.has(key)) {
      employeeMap.set(key, {
        id: entry.employee.id,
        name: entry.employee.name,
        role: entry.employee.role,
        totalCollection: 0,
        totalExpenses: 0,
        totalSalary: 0,
        entryCount: 0,
      });
    }

    const emp = employeeMap.get(key)!;
    const collection = Number(entry.collection);
    const expenses =
      Number(entry.cng) +
      Number(entry.maintenance) +
      Number(entry.toll) +
      Number(entry.uberSub) +
      Number(entry.misc);
    const commBase =
      entry.commissionBase === 'net' ? collection - expenses : collection;
    const salary = (Number(entry.commissionPercent) * commBase) / 100;

    emp.totalCollection += collection;
    emp.totalExpenses += expenses;
    emp.totalSalary += salary;
    emp.entryCount += 1;
  }

  const summary = Array.from(employeeMap.values()).map((emp) => ({
    ...emp,
    totalCollection: Math.round(emp.totalCollection * 100) / 100,
    totalExpenses: Math.round(emp.totalExpenses * 100) / 100,
    totalSalary: Math.round(emp.totalSalary * 100) / 100,
  }));

  // Sort by salary descending
  summary.sort((a, b) => b.totalSalary - a.totalSalary);

  return json({
    summary,
    totalSalary: Math.round(summary.reduce((s, e) => s + e.totalSalary, 0) * 100) / 100,
  });
}
