import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export const useResponsive = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const isWeb = Platform.OS === 'web';
  const width = dimensions.width;
  const height = dimensions.height;

  // Breakpoints
  const isSmallMobile = width < 375;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isLargeDesktop = width >= 1440;

  // Grid columns based on screen size
  const gridColumns = isDesktop ? (isLargeDesktop ? 3 : 2) : 1;

  return {
    width,
    height,
    isWeb,
    isSmallMobile,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    gridColumns,
  };
};
