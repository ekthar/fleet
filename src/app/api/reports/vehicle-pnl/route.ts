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

  const where: Prisma.EntryWhereInput = {};
  if (from) {
    where.date = { gte: from, lte: to };
  }

  const entries = await prisma.entry.findMany({
    where,
    include: {
      vehicle: { select: { id: true, name: true, regNumber: true } },
    },
  });

  // Group by vehicle
  const vehicleMap = new Map<
    string,
    {
      id: string;
      name: string;
      regNumber: string;
      totalRevenue: number;
      totalExpenses: number;
      totalSalary: number;
      totalKm: number;
      entryCount: number;
    }
  >();

  for (const entry of entries) {
    const key = entry.vehicle.id;
    if (!vehicleMap.has(key)) {
      vehicleMap.set(key, {
        id: entry.vehicle.id,
        name: entry.vehicle.name,
        regNumber: entry.vehicle.regNumber,
        totalRevenue: 0,
        totalExpenses: 0,
        totalSalary: 0,
        totalKm: 0,
        entryCount: 0,
      });
    }

    const veh = vehicleMap.get(key)!;
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

    veh.totalRevenue += collection;
    veh.totalExpenses += expenses;
    veh.totalSalary += salary;
    veh.totalKm += Number(entry.endKm) - Number(entry.startKm);
    veh.entryCount += 1;
  }

  const pnl = Array.from(vehicleMap.values()).map((veh) => ({
    ...veh,
    totalRevenue: Math.round(veh.totalRevenue * 100) / 100,
    totalExpenses: Math.round(veh.totalExpenses * 100) / 100,
    totalSalary: Math.round(veh.totalSalary * 100) / 100,
    totalKm: Math.round(veh.totalKm * 100) / 100,
    netProfit: Math.round((veh.totalRevenue - veh.totalExpenses - veh.totalSalary) * 100) / 100,
  }));

  // Sort by net profit descending
  pnl.sort((a, b) => b.netProfit - a.netProfit);

  return json({
    vehicles: pnl,
    totals: {
      revenue: Math.round(pnl.reduce((s, v) => s + v.totalRevenue, 0) * 100) / 100,
      expenses: Math.round(pnl.reduce((s, v) => s + v.totalExpenses, 0) * 100) / 100,
      salary: Math.round(pnl.reduce((s, v) => s + v.totalSalary, 0) * 100) / 100,
      netProfit: Math.round(pnl.reduce((s, v) => s + v.netProfit, 0) * 100) / 100,
      totalKm: Math.round(pnl.reduce((s, v) => s + v.totalKm, 0) * 100) / 100,
    },
  });
}
