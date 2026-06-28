import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LineChart } from 'react-native-chart-kit';
import { api } from '@/lib/api';
import { useTheme, Spacing, Typography, BorderRadius } from '@/lib/theme';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/Card';

const RANGES = ['Today', '7D', '30D', 'Month', 'All'];
const RANGE_VALUES = ['today', '7d', '30d', 'month', 'all'];

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
}

function formatKm(km: number): string {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}K km`;
  return `${km.toFixed(0)} km`;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const [rangeIndex, setRangeIndex] = useState(1); // Default: 7D

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', RANGE_VALUES[rangeIndex]],
    queryFn: () => api.getDashboardSummary(RANGE_VALUES[rangeIndex]),
  });

  const screenWidth = Dimensions.get('window').width - Spacing.xxl * 2;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      {/* Range selector */}
      <SegmentedControl
        segments={RANGES}
        selectedIndex={rangeIndex}
        onChange={setRangeIndex}
      />

      {/* Hero stat */}
      <StatCard
        label="Net Profit"
        value={formatCurrency(data?.netProfit ?? 0)}
        color={data?.netProfit >= 0 ? theme.success : theme.danger}
        fullWidth
      />

      {/* Two-up grid */}
      <View style={styles.row}>
        <StatCard label="Revenue" value={formatCurrency(data?.revenue ?? 0)} />
        <StatCard
          label="Expenses"
          value={formatCurrency(data?.expenses ?? 0)}
          color={theme.danger}
        />
      </View>

      <View style={styles.row}>
        <StatCard
          label="Salary Paid"
          value={formatCurrency(data?.salary ?? 0)}
          color={theme.warning}
        />
        <StatCard label="Total KM" value={formatKm(data?.totalKm ?? 0)} />
      </View>

      {/* Trend line chart */}
      {data?.trend && data.trend.length > 0 && (
        <Card>
          <Text style={[styles.chartTitle, { color: theme.text }]}>14-Day Trend</Text>
          <LineChart
            data={{
              labels: data.trend
                .filter((_: any, i: number) => i % 3 === 0)
                .map((t: any) => t.date.slice(5)),
              datasets: [
                {
                  data: data.trend.map((t: any) => t.profit || 0),
                  color: () => theme.accent,
                  strokeWidth: 2,
                },
              ],
            }}
            width={screenWidth - Spacing.lg * 2}
            height={180}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: theme.card,
              backgroundGradientTo: theme.card,
              decimalPlaces: 0,
              color: () => theme.accent,
              labelColor: () => theme.textSecondary,
              propsForDots: { r: '3', strokeWidth: '1', stroke: theme.accent },
              propsForBackgroundLines: { stroke: theme.separator, strokeDasharray: '' },
            }}
            bezier
            withInnerLines={false}
            withOuterLines={false}
            style={styles.chart}
          />
        </Card>
      )}

      {/* Expense breakdown */}
      {data?.expenseBreakdown && (
        <Card>
          <Text style={[styles.chartTitle, { color: theme.text }]}>Expense Breakdown</Text>
          {data.expenseBreakdown.map((item: any) => (
            <View key={item.category} style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textSecondary }]}>
                {item.category}
              </Text>
              <Text style={[styles.breakdownValue, { color: theme.text }]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxl + 20,
    gap: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  chartTitle: {
    ...Typography.headline,
    marginBottom: Spacing.md,
  },
  chart: {
    borderRadius: BorderRadius.md,
    marginLeft: -Spacing.lg,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  breakdownLabel: {
    ...Typography.subheadline,
  },
  breakdownValue: {
    ...Typography.subheadline,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
