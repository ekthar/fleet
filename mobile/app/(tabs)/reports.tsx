import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from '@/lib/api';
import { useTheme, Spacing, BorderRadius, Typography } from '@/lib/theme';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Card } from '@/components/Card';

const RANGES = ['7D', '30D', 'Month', 'All'];
const RANGE_VALUES = ['7d', '30d', 'month', 'all'];

const TABS = ['Salary', 'Vehicle P&L'];

export default function ReportsScreen() {
  const theme = useTheme();
  const [rangeIndex, setRangeIndex] = useState(0);
  const [tabIndex, setTabIndex] = useState(0);

  const { data: salaryData, isLoading: salaryLoading, refetch: refetchSalary } = useQuery({
    queryKey: ['salary-summary', RANGE_VALUES[rangeIndex]],
    queryFn: () => api.getSalarySummary(RANGE_VALUES[rangeIndex]),
    enabled: tabIndex === 0,
  });

  const { data: pnlData, isLoading: pnlLoading, refetch: refetchPnl } = useQuery({
    queryKey: ['vehicle-pnl', RANGE_VALUES[rangeIndex]],
    queryFn: () => api.getVehiclePnl(RANGE_VALUES[rangeIndex]),
    enabled: tabIndex === 1,
  });

  const isLoading = tabIndex === 0 ? salaryLoading : pnlLoading;
  const refetch = tabIndex === 0 ? refetchSalary : refetchPnl;

  const exportCSV = async () => {
    try {
      let csv = '';

      if (tabIndex === 0 && salaryData?.summary) {
        csv = 'Employee,Role,Entries,Collection,Expenses,Salary\n';
        for (const emp of salaryData.summary) {
          csv += `"${emp.name}","${emp.role}",${emp.entryCount},${emp.totalCollection},${emp.totalExpenses},${emp.totalSalary}\n`;
        }
        csv += `\nTotal Salary,,,,,"${salaryData.totalSalary}"\n`;
      } else if (tabIndex === 1 && pnlData?.vehicles) {
        csv = 'Vehicle,Reg Number,Entries,Revenue,Expenses,Salary,Net Profit,KM\n';
        for (const veh of pnlData.vehicles) {
          csv += `"${veh.name}","${veh.regNumber}",${veh.entryCount},${veh.totalRevenue},${veh.totalExpenses},${veh.totalSalary},${veh.netProfit},${veh.totalKm}\n`;
        }
        csv += `\nTotals,,,${pnlData.totals.revenue},${pnlData.totals.expenses},${pnlData.totals.salary},${pnlData.totals.netProfit},${pnlData.totals.totalKm}\n`;
      }

      if (!csv) {
        Alert.alert('No Data', 'No data available to export');
        return;
      }

      const fileName = tabIndex === 0 ? 'salary-report' : 'vehicle-pnl-report';
      const fileUri = `${FileSystem.cacheDirectory}${fileName}-${RANGE_VALUES[rangeIndex]}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Report' });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (err: any) {
      Alert.alert('Export Error', err.message);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      {/* Tab Selector */}
      <SegmentedControl segments={TABS} selectedIndex={tabIndex} onChange={setTabIndex} />

      {/* Range Selector */}
      <SegmentedControl segments={RANGES} selectedIndex={rangeIndex} onChange={setRangeIndex} />

      {/* Export Button */}
      <TouchableOpacity
        style={[styles.exportButton, { borderColor: theme.accent }]}
        onPress={exportCSV}
        activeOpacity={0.7}
      >
        <Ionicons name="share-outline" size={18} color={theme.accent} />
        <Text style={[styles.exportText, { color: theme.accent }]}>Export CSV</Text>
      </TouchableOpacity>

      {/* Salary Tab */}
      {tabIndex === 0 && (
        <View style={styles.tableContainer}>
          {salaryData?.summary?.length > 0 ? (
            <>
              {/* Total */}
              <Card style={styles.totalCard}>
                <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total Salary</Text>
                <Text style={[styles.totalValue, { color: theme.warning }]}>
                  ₹{salaryData.totalSalary.toLocaleString('en-IN')}
                </Text>
              </Card>

              {/* Table */}
              {salaryData.summary.map((emp: any) => (
                <Card key={emp.id} style={styles.tableRow}>
                  <View style={styles.rowHeader}>
                    <Text style={[styles.rowName, { color: theme.text }]}>{emp.name}</Text>
                    <Text style={[styles.rowSalary, { color: theme.warning }]}>
                      ₹{emp.totalSalary.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.rowMetaText, { color: theme.textSecondary }]}>
                      {emp.role} · {emp.entryCount} entries
                    </Text>
                    <Text style={[styles.rowMetaText, { color: theme.textSecondary }]}>
                      ₹{emp.totalCollection.toLocaleString('en-IN')} collected
                    </Text>
                  </View>
                </Card>
              ))}
            </>
          ) : (
            !isLoading && (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No salary data for this period
              </Text>
            )
          )}
        </View>
      )}

      {/* Vehicle P&L Tab */}
      {tabIndex === 1 && (
        <View style={styles.tableContainer}>
          {pnlData?.vehicles?.length > 0 ? (
            <>
              {/* Totals */}
              <Card style={styles.totalCard}>
                <View style={styles.totalRow}>
                  <View>
                    <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Net Profit</Text>
                    <Text style={[styles.totalValue, { color: pnlData.totals.netProfit >= 0 ? theme.success : theme.danger }]}>
                      ₹{pnlData.totals.netProfit.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Revenue</Text>
                    <Text style={[styles.totalSubValue, { color: theme.text }]}>
                      ₹{pnlData.totals.revenue.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Per-vehicle rows */}
              {pnlData.vehicles.map((veh: any) => (
                <Card key={veh.id} style={styles.tableRow}>
                  <View style={styles.rowHeader}>
                    <View>
                      <Text style={[styles.rowName, { color: theme.text }]}>{veh.name}</Text>
                      <Text style={[styles.rowMetaText, { color: theme.textSecondary }]}>
                        {veh.regNumber} · {veh.entryCount} entries · {veh.totalKm.toLocaleString()} km
                      </Text>
                    </View>
                    <Text style={[styles.rowSalary, { color: veh.netProfit >= 0 ? theme.success : theme.danger }]}>
                      ₹{veh.netProfit.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={[styles.pnlBreakdown, { borderTopColor: theme.separator }]}>
                    <View style={styles.pnlItem}>
                      <Text style={[styles.pnlLabel, { color: theme.textSecondary }]}>Revenue</Text>
                      <Text style={[styles.pnlValue, { color: theme.text }]}>₹{veh.totalRevenue.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.pnlItem}>
                      <Text style={[styles.pnlLabel, { color: theme.textSecondary }]}>Expenses</Text>
                      <Text style={[styles.pnlValue, { color: theme.danger }]}>₹{veh.totalExpenses.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.pnlItem}>
                      <Text style={[styles.pnlLabel, { color: theme.textSecondary }]}>Salary</Text>
                      <Text style={[styles.pnlValue, { color: theme.warning }]}>₹{veh.totalSalary.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </>
          ) : (
            !isLoading && (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No vehicle data for this period
              </Text>
            )
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.xxl, paddingBottom: Spacing.xxxl + 20, gap: Spacing.lg },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm + 2,
  },
  exportText: { ...Typography.subheadline, fontWeight: '600' },
  tableContainer: { gap: Spacing.md },
  totalCard: { padding: Spacing.lg },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { ...Typography.footnote, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { ...Typography.title1, fontVariant: ['tabular-nums'], marginTop: 4 },
  totalSubValue: { ...Typography.headline, fontVariant: ['tabular-nums'], marginTop: 4 },
  tableRow: { padding: Spacing.lg },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName: { ...Typography.headline },
  rowSalary: { ...Typography.headline, fontVariant: ['tabular-nums'] },
  rowMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  rowMetaText: { ...Typography.caption },
  pnlBreakdown: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  pnlItem: { alignItems: 'center' },
  pnlLabel: { ...Typography.caption },
  pnlValue: { ...Typography.subheadline, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 2 },
  emptyText: { ...Typography.body, textAlign: 'center', marginTop: Spacing.xxxl },
});
