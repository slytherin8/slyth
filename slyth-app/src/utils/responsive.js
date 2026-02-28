import { Dimensions, Platform, PixelRatio } from 'react-native';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11 Pro)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Responsive width based on screen width
 * @param {number} size - The size you want to scale
 * @returns {number} - Scaled size
 */
export const wp = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Responsive height based on screen height
 * @param {number} size - The size you want to scale
 * @returns {number} - Scaled size
 */
export const hp = (size) => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Responsive font size
 * @param {number} size - The font size you want to scale
 * @returns {number} - Scaled font size
 */
export const fp = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  // Ensure minimum readability
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  // Android needs slightly different scaling
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
};

/**
 * Get responsive size (general purpose)
 * @param {number} size - The size you want to scale
 * @returns {number} - Scaled size
 */
export const rs = (size) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Check if device is small (width < 375)
 * @returns {boolean}
 */
export const isSmallDevice = () => SCREEN_WIDTH < 375;

/**
 * Check if device is large (width > 414)
 * @returns {boolean}
 */
export const isLargeDevice = () => SCREEN_WIDTH > 414;

/**
 * Check if device is tablet
 * @returns {boolean}
 */
export const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  return SCREEN_WIDTH >= 768 && aspectRatio < 1.6;
};

/**
 * Get safe padding for different devices
 * @returns {object} - Padding values
 */
export const getSafePadding = () => {
  if (isSmallDevice()) {
    return {
      horizontal: wp(16),
      vertical: hp(12),
    };
  } else if (isLargeDevice()) {
    return {
      horizontal: wp(24),
      vertical: hp(16),
    };
  }
  return {
    horizontal: wp(20),
    vertical: hp(14),
  };
};

/**
 * Get responsive spacing
 * @param {string} size - 'xs', 'sm', 'md', 'lg', 'xl'
 * @returns {number} - Spacing value
 */
export const getSpacing = (size) => {
  const spacingMap = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  };
  return rs(spacingMap[size] || spacingMap.md);
};

/**
 * Get responsive border radius
 * @param {string} size - 'sm', 'md', 'lg', 'xl', 'full'
 * @returns {number} - Border radius value
 */
export const getBorderRadius = (size) => {
  const radiusMap = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  };
  return rs(radiusMap[size] || radiusMap.md);
};

/**
 * Get responsive icon size
 * @param {string} size - 'sm', 'md', 'lg', 'xl'
 * @returns {number} - Icon size
 */
export const getIconSize = (size) => {
  const iconMap = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  };
  return rs(iconMap[size] || iconMap.md);
};

// Export dimensions
export const DEVICE_WIDTH = SCREEN_WIDTH;
export const DEVICE_HEIGHT = SCREEN_HEIGHT;

// Export platform checks
export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';

export default {
  wp,
  hp,
  fp,
  rs,
  isSmallDevice,
  isLargeDevice,
  isTablet,
  getSafePadding,
  getSpacing,
  getBorderRadius,
  getIconSize,
  DEVICE_WIDTH,
  DEVICE_HEIGHT,
  IS_IOS,
  IS_ANDROID,
};
