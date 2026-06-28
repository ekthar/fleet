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

  const entries = await prisma.entry.findMany({ where });

  // Aggregate
  let totalRevenue = 0;
  let totalCng = 0;
  let totalMaintenance = 0;
  let totalToll = 0;
  let totalUberSub = 0;
  let totalMisc = 0;
  let totalSalary = 0;
  let totalKm = 0;

  for (const entry of entries) {
    const collection = Number(entry.collection);
    const cng = Number(entry.cng);
    const maintenance = Number(entry.maintenance);
    const toll = Number(entry.toll);
    const uberSub = Number(entry.uberSub);
    const misc = Number(entry.misc);
    const commPercent = Number(entry.commissionPercent);
    const expenses = cng + maintenance + toll + uberSub + misc;
    const commBase =
      entry.commissionBase === 'net' ? collection - expenses : collection;
    const salary = (commPercent * commBase) / 100;

    totalRevenue += collection;
    totalCng += cng;
    totalMaintenance += maintenance;
    totalToll += toll;
    totalUberSub += uberSub;
    totalMisc += misc;
    totalSalary += salary;
    totalKm += Number(entry.endKm) - Number(entry.startKm);
  }

  const totalExpenses = totalCng + totalMaintenance + totalToll + totalUberSub + totalMisc;
  const netProfit = totalRevenue - totalExpenses - totalSalary;

  // 14-day trend series (last 14 days relative to `to`)
  const trendStart = new Date(to);
  trendStart.setDate(trendStart.getDate() - 13);
  trendStart.setHours(0, 0, 0, 0);

  const trendEntries = await prisma.entry.findMany({
    where: { date: { gte: trendStart, lte: to } },
    select: {
      date: true,
      collection: true,
      cng: true,
      maintenance: true,
      toll: true,
      uberSub: true,
      misc: true,
      commissionPercent: true,
      commissionBase: true,
    },
  });

  // Build daily buckets
  const trendMap = new Map<string, { revenue: number; expenses: number; profit: number }>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(trendStart);
    d.setDate(d.getDate() + i);
    trendMap.set(d.toISOString().split('T')[0], { revenue: 0, expenses: 0, profit: 0 });
  }

  for (const e of trendEntries) {
    const dateKey = new Date(e.date).toISOString().split('T')[0];
    const bucket = trendMap.get(dateKey);
    if (!bucket) continue;

    const collection = Number(e.collection);
    const expenses =
      Number(e.cng) + Number(e.maintenance) + Number(e.toll) + Number(e.uberSub) + Number(e.misc);
    const commBase =
      e.commissionBase === 'net' ? collection - expenses : collection;
    const salary = (Number(e.commissionPercent) * commBase) / 100;

    bucket.revenue += collection;
    bucket.expenses += expenses;
    bucket.profit += collection - expenses - salary;
  }

  const trend = Array.from(trendMap.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));

  // Expense breakdown by category
  const expenseBreakdown = [
    { category: 'CNG', amount: Math.round(totalCng * 100) / 100 },
    { category: 'Maintenance', amount: Math.round(totalMaintenance * 100) / 100 },
    { category: 'Toll', amount: Math.round(totalToll * 100) / 100 },
    { category: 'Uber Subscription', amount: Math.round(totalUberSub * 100) / 100 },
    { category: 'Miscellaneous', amount: Math.round(totalMisc * 100) / 100 },
  ];

  return json({
    revenue: Math.round(totalRevenue * 100) / 100,
    expenses: Math.round(totalExpenses * 100) / 100,
    salary: Math.round(totalSalary * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    totalKm: Math.round(totalKm * 100) / 100,
    entryCount: entries.length,
    trend,
    expenseBreakdown,
  });
}
