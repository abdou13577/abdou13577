import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { COLORS } from '../../constants/colors';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  maxWidth?: number;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  maxWidth = 1400,
}) => {
  const { isDesktop, width } = useResponsive();

  if (isDesktop && Platform.OS === 'web') {
    return (
      <View style={styles.desktopContainer}>
        <View style={[styles.desktopContent, { maxWidth }]}>
          {sidebar && <View style={styles.sidebar}>{sidebar}</View>}
          <View style={styles.mainContent}>{children}</View>
        </View>
      </View>
    );
  }

  return <View style={styles.mobileContainer}>{children}</View>;
};

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  desktopContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  desktopContent: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  sidebar: {
    width: 280,
    marginRight: 24,
  },
  mainContent: {
    flex: 1,
  },
});
