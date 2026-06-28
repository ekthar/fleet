import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    background: '#F2F2F7',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#8E8E93',
    textTertiary: '#AEAEB2',
    accent: '#0A84FF',
    separator: '#E5E5EA',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    background: '#000000',
    card: '#1C1C1E',
    cardElevated: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textTertiary: '#636366',
    accent: '#0A84FF',
    separator: '#38383A',
    success: '#30D158',
    danger: '#FF453A',
    warning: '#FF9F0A',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

export type Theme = typeof Colors.light;

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const Typography = {
  heroNumeral: {
    fontSize: 40,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'] as const,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  title2: {
    fontSize: 22,
    fontWeight: '600' as const,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
  },
  tabularNums: {
    fontVariant: ['tabular-nums'] as const,
  },
};
