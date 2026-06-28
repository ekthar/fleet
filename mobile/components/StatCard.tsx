import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { useTheme, Spacing, Typography } from '@/lib/theme';

interface StatCardProps {
  label: string;
  value: string;
  color?: string;
  fullWidth?: boolean;
}

export function StatCard({ label, value, color, fullWidth }: StatCardProps) {
  const theme = useTheme();
  const valueColor = color || theme.text;

  return (
    <Card style={fullWidth ? styles.fullWidth : styles.halfWidth}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    ...Typography.footnote,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...Typography.heroNumeral,
    fontVariant: ['tabular-nums'],
  },
});
