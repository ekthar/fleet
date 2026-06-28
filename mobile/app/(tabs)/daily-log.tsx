import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { api } from '@/lib/api';
import { useTheme, Spacing, BorderRadius, Typography } from '@/lib/theme';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';

interface EntryForm {
  date: string;
  vehicleId: string;
  employeeId: string;
  startKm: string;
  endKm: string;
  collection: string;
  cng: string;
  maintenance: string;
  toll: string;
  uberSub: string;
  misc: string;
  commissionPercent: string;
  commissionBase: 'gross' | 'net';
}

const emptyForm: EntryForm = {
  date: new Date().toISOString().split('T')[0],
  vehicleId: '',
  employeeId: '',
  startKm: '',
  endKm: '',
  collection: '',
  cng: '0',
  maintenance: '0',
  toll: '0',
  uberSub: '0',
  misc: '0',
  commissionPercent: '',
  commissionBase: 'net',
};

export default function DailyLogScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [form, setForm] = useState<EntryForm>(emptyForm);

  const { data: entriesData, isLoading, refetch } = useQuery({
    queryKey: ['entries'],
    queryFn: () => api.getEntries(),
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.getEmployees(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeSheet();
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  // Live preview computation
  const preview = useMemo(() => {
    const collection = parseFloat(form.collection) || 0;
    const cng = parseFloat(form.cng) || 0;
    const maintenance = parseFloat(form.maintenance) || 0;
    const toll = parseFloat(form.toll) || 0;
    const uberSub = parseFloat(form.uberSub) || 0;
    const misc = parseFloat(form.misc) || 0;
    const commPercent = parseFloat(form.commissionPercent) || 0;

    const totalExpenses = cng + maintenance + toll + uberSub + misc;
    const commBase = form.commissionBase === 'net' ? collection - totalExpenses : collection;
    const salary = (commPercent * commBase) / 100;
    const netProfit = collection - totalExpenses - salary;

    return { totalExpenses, salary, netProfit };
  }, [form]);

  const openSheet = useCallback(() => {
    setForm(emptyForm);
    bottomSheetRef.current?.expand();
  }, []);

  const closeSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    setForm(emptyForm);
  }, []);

  const handleSave = () => {
    if (!form.vehicleId) {
      Alert.alert('Error', 'Please select a vehicle');
      return;
    }

    const data = {
      date: form.date,
      vehicleId: form.vehicleId,
      employeeId: form.employeeId || null,
      startKm: parseFloat(form.startKm) || 0,
      endKm: parseFloat(form.endKm) || 0,
      collection: parseFloat(form.collection) || 0,
      cng: parseFloat(form.cng) || 0,
      maintenance: parseFloat(form.maintenance) || 0,
      toll: parseFloat(form.toll) || 0,
      uberSub: parseFloat(form.uberSub) || 0,
      misc: parseFloat(form.misc) || 0,
      commissionPercent: parseFloat(form.commissionPercent) || 0,
      commissionBase: form.commissionBase,
    };

    createMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  // Auto-fill commission when employee is selected
  const handleEmployeeSelect = (employeeId: string) => {
    const emp = employees?.find((e: any) => e.id === employeeId);
    setForm({
      ...form,
      employeeId,
      commissionPercent: emp ? String(Number(emp.currentPercent)) : form.commissionPercent,
    });
  };

  const renderEntry = ({ item }: { item: any }) => {
    const collection = Number(item.collection);
    const expenses = Number(item.cng) + Number(item.maintenance) + Number(item.toll) + Number(item.uberSub) + Number(item.misc);
    const commBase = item.commissionBase === 'net' ? collection - expenses : collection;
    const salary = (Number(item.commissionPercent) * commBase) / 100;
    const profit = collection - expenses - salary;

    return (
      <Card style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View>
            <Text style={[styles.entryDate, { color: theme.text }]}>
              {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
            <Text style={[styles.entryMeta, { color: theme.textSecondary }]}>
              {item.vehicle?.name} {item.employee ? `· ${item.employee.name}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.entryProfit, { color: profit >= 0 ? theme.success : theme.danger }]}>
              ₹{profit.toFixed(0)}
            </Text>
            <Text style={[styles.entryCollection, { color: theme.textSecondary }]}>
              ₹{collection.toFixed(0)} collected
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={16} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={entriesData?.entries || []}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="document-text-outline" title="No Entries" message="Tap + to log your first daily entry" />
          ) : null
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={openSheet}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Sheet Form */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['90%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: theme.card }}
        handleIndicatorStyle={{ backgroundColor: theme.textTertiary }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>New Entry</Text>

              {/* Date */}
              <FormField label="Date" value={form.date} onChangeText={(t: string) => setForm({ ...form, date: t })} placeholder="YYYY-MM-DD" theme={theme} />

              {/* Vehicle Picker (simplified as text list) */}
              <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Vehicle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                {(vehicles || []).map((v: any) => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setForm({ ...form, vehicleId: v.id })}
                    style={[
                      styles.pickerChip,
                      {
                        backgroundColor: form.vehicleId === v.id ? theme.accent : theme.background,
                        borderColor: form.vehicleId === v.id ? theme.accent : theme.separator,
                      },
                    ]}
                  >
                    <Text style={{ color: form.vehicleId === v.id ? '#FFF' : theme.text, fontSize: 13 }}>
                      {v.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Employee Picker */}
              <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Employee</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                <TouchableOpacity
                  onPress={() => setForm({ ...form, employeeId: '' })}
                  style={[styles.pickerChip, { backgroundColor: !form.employeeId ? theme.accent : theme.background, borderColor: !form.employeeId ? theme.accent : theme.separator }]}
                >
                  <Text style={{ color: !form.employeeId ? '#FFF' : theme.text, fontSize: 13 }}>None</Text>
                </TouchableOpacity>
                {(employees || []).map((e: any) => (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => handleEmployeeSelect(e.id)}
                    style={[
                      styles.pickerChip,
                      {
                        backgroundColor: form.employeeId === e.id ? theme.accent : theme.background,
                        borderColor: form.employeeId === e.id ? theme.accent : theme.separator,
                      },
                    ]}
                  >
                    <Text style={{ color: form.employeeId === e.id ? '#FFF' : theme.text, fontSize: 13 }}>
                      {e.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* KM Fields */}
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <FormField label="Start KM" value={form.startKm} onChangeText={(t: string) => setForm({ ...form, startKm: t })} keyboardType="numeric" theme={theme} />
                </View>
                <View style={styles.halfField}>
                  <FormField label="End KM" value={form.endKm} onChangeText={(t: string) => setForm({ ...form, endKm: t })} keyboardType="numeric" theme={theme} />
                </View>
              </View>

              {/* Collection */}
              <FormField label="Collection (₹)" value={form.collection} onChangeText={(t: string) => setForm({ ...form, collection: t })} keyboardType="numeric" theme={theme} />

              {/* Expenses Row */}
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <FormField label="CNG" value={form.cng} onChangeText={(t: string) => setForm({ ...form, cng: t })} keyboardType="numeric" theme={theme} />
                </View>
                <View style={styles.halfField}>
                  <FormField label="Maintenance" value={form.maintenance} onChangeText={(t: string) => setForm({ ...form, maintenance: t })} keyboardType="numeric" theme={theme} />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <FormField label="Toll" value={form.toll} onChangeText={(t: string) => setForm({ ...form, toll: t })} keyboardType="numeric" theme={theme} />
                </View>
                <View style={styles.halfField}>
                  <FormField label="Uber Sub" value={form.uberSub} onChangeText={(t: string) => setForm({ ...form, uberSub: t })} keyboardType="numeric" theme={theme} />
                </View>
              </View>
              <FormField label="Misc" value={form.misc} onChangeText={(t: string) => setForm({ ...form, misc: t })} keyboardType="numeric" theme={theme} />

              {/* Commission */}
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <FormField label="Commission %" value={form.commissionPercent} onChangeText={(t: string) => setForm({ ...form, commissionPercent: t })} keyboardType="decimal-pad" theme={theme} />
                </View>
                <View style={styles.halfField}>
                  <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Base</Text>
                  <View style={styles.baseToggle}>
                    {(['net', 'gross'] as const).map((base) => (
                      <TouchableOpacity
                        key={base}
                        onPress={() => setForm({ ...form, commissionBase: base })}
                        style={[styles.baseChip, { backgroundColor: form.commissionBase === base ? theme.accent : theme.background, borderColor: theme.separator }]}
                      >
                        <Text style={{ color: form.commissionBase === base ? '#FFF' : theme.text, fontSize: 13, fontWeight: '600' }}>
                          {base.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Live Preview */}
              <Card style={[styles.previewCard, { backgroundColor: theme.background }]}>
                <Text style={[styles.previewTitle, { color: theme.textSecondary }]}>PREVIEW</Text>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Expenses</Text>
                  <Text style={[styles.previewValue, { color: theme.danger }]}>₹{preview.totalExpenses.toFixed(0)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Salary</Text>
                  <Text style={[styles.previewValue, { color: theme.warning }]}>₹{preview.salary.toFixed(0)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Net Profit</Text>
                  <Text style={[styles.previewValue, { color: preview.netProfit >= 0 ? theme.success : theme.danger, fontWeight: '700' }]}>
                    ₹{preview.netProfit.toFixed(0)}
                  </Text>
                </View>
              </Card>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.accent }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Save Entry</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

function FormField({ label, theme, ...inputProps }: { label: string; theme: any; [key: string]: any }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.separator }]}
        placeholderTextColor={theme.textTertiary}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.xxl, paddingBottom: 100 },
  entryCard: { padding: Spacing.lg },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  entryDate: { ...Typography.headline },
  entryMeta: { ...Typography.footnote, marginTop: 2 },
  entryProfit: { ...Typography.headline, fontVariant: ['tabular-nums'] },
  entryCollection: { ...Typography.caption, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: Spacing.xxl,
    bottom: Spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sheetContent: { padding: Spacing.xl, flex: 1 },
  sheetTitle: { ...Typography.title2, marginBottom: Spacing.lg },
  pickerLabel: { ...Typography.footnote, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: Spacing.xs },
  pickerRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  pickerChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  halfField: { flex: 1 },
  baseToggle: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  baseChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  previewCard: { marginTop: Spacing.lg, padding: Spacing.lg },
  previewTitle: { ...Typography.caption, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  previewLabel: { ...Typography.subheadline },
  previewValue: { ...Typography.subheadline, fontWeight: '600', fontVariant: ['tabular-nums'] },
  field: { gap: Spacing.xs, marginTop: Spacing.sm },
  fieldLabel: { ...Typography.footnote, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    ...Typography.body,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  saveButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  saveButtonText: { color: '#FFFFFF', ...Typography.headline },
});
