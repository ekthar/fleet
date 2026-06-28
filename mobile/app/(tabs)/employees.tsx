import React, { useState, useCallback, useRef } from 'react';
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

interface EmployeeForm {
  name: string;
  role: string;
  phone: string;
  currentPercent: string;
}

const emptyForm: EmployeeForm = { name: '', role: '', phone: '', currentPercent: '' };

export default function EmployeesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  const { data: employees, isLoading, refetch } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.getEmployees(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeSheet();
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeSheet();
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const openSheet = useCallback((employee?: any) => {
    if (employee) {
      setEditingId(employee.id);
      setForm({
        name: employee.name,
        role: employee.role,
        phone: employee.phone,
        currentPercent: String(employee.currentPercent),
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    bottomSheetRef.current?.expand();
  }, []);

  const closeSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    setForm(emptyForm);
    setEditingId(null);
  }, []);

  const handleSave = () => {
    const data = {
      name: form.name,
      role: form.role,
      phone: form.phone,
      currentPercent: parseFloat(form.currentPercent) || 0,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Employee', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const renderEmployee = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => openSheet(item)} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: theme.accent + '15' }]}>
            <Ionicons name="person" size={20} color={theme.accent} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {item.role} · {item.phone}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.name)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
          </TouchableOpacity>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.separator }]} />
        <View style={styles.bottomRow}>
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Commission</Text>
            <Text style={[styles.percent, { color: theme.accent }]}>
              {Number(item.currentPercent)}%
            </Text>
          </View>
          {item.assignedVehicle && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Vehicle</Text>
              <Text style={[styles.vehicleName, { color: theme.text }]}>
                {item.assignedVehicle.name}
              </Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? theme.success + '20' : theme.textTertiary + '20' }]}>
            <Text style={[styles.statusText, { color: item.status === 'active' ? theme.success : theme.textTertiary }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={employees || []}
        keyExtractor={(item) => item.id}
        renderItem={renderEmployee}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="people-outline" title="No Employees" message="Add your first employee to track commissions" />
          ) : null
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => openSheet()}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['60%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: theme.card }}
        handleIndicatorStyle={{ backgroundColor: theme.textTertiary }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                {editingId ? 'Edit Employee' : 'Add Employee'}
              </Text>

              <View style={styles.formFields}>
                <FormField label="Name" value={form.name} onChangeText={(t: string) => setForm({ ...form, name: t })} placeholder="Full name" theme={theme} />
                <FormField label="Role" value={form.role} onChangeText={(t: string) => setForm({ ...form, role: t })} placeholder="e.g. Driver" theme={theme} />
                <FormField label="Phone" value={form.phone} onChangeText={(t: string) => setForm({ ...form, phone: t })} placeholder="Phone number" theme={theme} keyboardType="phone-pad" />
                <FormField label="Commission %" value={form.currentPercent} onChangeText={(t: string) => setForm({ ...form, currentPercent: t })} placeholder="e.g. 12.5" theme={theme} keyboardType="decimal-pad" />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.accent }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update Employee' : 'Add Employee'}
                </Text>
              </TouchableOpacity>
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
  card: { padding: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBg: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { ...Typography.headline },
  meta: { ...Typography.footnote, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.md },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...Typography.caption },
  percent: { ...Typography.title3, fontVariant: ['tabular-nums'] },
  vehicleName: { ...Typography.footnote, fontWeight: '600' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 6 },
  statusText: { ...Typography.caption, fontWeight: '600', textTransform: 'capitalize' },
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
  sheetContent: { padding: Spacing.xxl, flex: 1 },
  sheetTitle: { ...Typography.title2, marginBottom: Spacing.xl },
  formFields: { gap: Spacing.lg },
  field: { gap: Spacing.xs },
  fieldLabel: { ...Typography.footnote, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    ...Typography.body,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
  },
  saveButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  saveButtonText: { color: '#FFFFFF', ...Typography.headline },
});
