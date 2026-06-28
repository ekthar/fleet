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

interface VehicleForm {
  name: string;
  regNumber: string;
  model: string;
  startKm: string;
}

const emptyForm: VehicleForm = { name: '', regNumber: '', model: '', startKm: '' };

export default function VehiclesScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VehicleForm>(emptyForm);

  const { data: vehicles, isLoading, refetch } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.getVehicles(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeSheet();
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeSheet();
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    onError: (err: Error) => Alert.alert('Error', err.message),
  });

  const openSheet = useCallback((vehicle?: any) => {
    if (vehicle) {
      setEditingId(vehicle.id);
      setForm({
        name: vehicle.name,
        regNumber: vehicle.regNumber,
        model: vehicle.model,
        startKm: String(vehicle.startKm),
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
      regNumber: form.regNumber,
      model: form.model,
      startKm: parseFloat(form.startKm) || 0,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Vehicle', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const renderVehicle = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => openSheet(item)} activeOpacity={0.7}>
      <Card style={styles.vehicleCard}>
        <View style={styles.vehicleHeader}>
          <View style={[styles.iconBg, { backgroundColor: theme.accent + '15' }]}>
            <Ionicons name="car-sport" size={22} color={theme.accent} />
          </View>
          <View style={styles.vehicleInfo}>
            <Text style={[styles.vehicleName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.vehicleReg, { color: theme.textSecondary }]}>
              {item.regNumber} · {item.model}
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
        <View style={styles.vehicleMeta}>
          <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>
            Start KM: <Text style={{ color: theme.text, fontWeight: '600' }}>{Number(item.startKm).toLocaleString()}</Text>
          </Text>
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
        data={vehicles || []}
        keyExtractor={(item) => item.id}
        renderItem={renderVehicle}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState icon="car-outline" title="No Vehicles" message="Add your first vehicle to get started" />
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
        snapPoints={['65%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: theme.card }}
        handleIndicatorStyle={{ backgroundColor: theme.textTertiary }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                {editingId ? 'Edit Vehicle' : 'Add Vehicle'}
              </Text>

              <View style={styles.formFields}>
                <FormField
                  label="Vehicle Name"
                  value={form.name}
                  onChangeText={(t: string) => setForm({ ...form, name: t })}
                  placeholder="e.g. Swift DZire #1"
                  theme={theme}
                />
                <FormField
                  label="Registration Number"
                  value={form.regNumber}
                  onChangeText={(t: string) => setForm({ ...form, regNumber: t })}
                  placeholder="e.g. MH01AB1234"
                  theme={theme}
                  autoCapitalize="characters"
                />
                <FormField
                  label="Model"
                  value={form.model}
                  onChangeText={(t: string) => setForm({ ...form, model: t })}
                  placeholder="e.g. Maruti Swift DZire"
                  theme={theme}
                />
                <FormField
                  label="Starting KM"
                  value={form.startKm}
                  onChangeText={(t: string) => setForm({ ...form, startKm: t })}
                  placeholder="0"
                  theme={theme}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.accent }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update Vehicle' : 'Add Vehicle'}
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
  vehicleCard: { padding: Spacing.lg },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: { flex: 1 },
  vehicleName: { ...Typography.headline },
  vehicleReg: { ...Typography.footnote, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.md },
  vehicleMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { ...Typography.footnote },
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
