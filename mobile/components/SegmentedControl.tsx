import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Spacing, BorderRadius, Typography } from '@/lib/theme';

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({ segments, selectedIndex, onChange }: SegmentedControlProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.separator }]}>
      {segments.map((segment, index) => (
        <TouchableOpacity
          key={segment}
          onPress={() => onChange(index)}
          style={[
            styles.segment,
            index === selectedIndex && {
              backgroundColor: theme.card,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 1,
              shadowRadius: 3,
              elevation: 2,
            },
          ]}
        >
          <Text
            style={[
              styles.label,
              {
                color: index === selectedIndex ? theme.text : theme.textSecondary,
                fontWeight: index === selectedIndex ? '600' : '400',
              },
            ]}
          >
            {segment}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.sm,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm - 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.footnote,
  },
});
