import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useTheme, Spacing, BorderRadius } from '@/lib/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
  padding?: number;
}

export function Card({ children, elevated, padding, style, ...props }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? theme.cardElevated : theme.card,
          shadowColor: theme.shadow,
          padding: padding ?? Spacing.lg,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
});
