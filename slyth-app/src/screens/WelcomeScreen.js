import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
  Platform
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Responsive helper functions
const getResponsiveSize = (size) => {
  const scale = width / 375; // Base width (iPhone X)
  return Math.round(size * scale);
};

const getResponsiveFontSize = (size) => {
  const scale = width / 375;
  const newSize = size * scale;
  return Math.max(newSize, size * 0.85); // Minimum 85% of original size
};

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#00664F" />
        
        {/* Main content area */}
        <View style={styles.contentContainer}>
          {/* Hand illustration - larger and more prominent */}
          <View style={styles.illustrationContainer}>
            <Image
              source={require("../../assets/images/hand.png")}
              style={styles.handImage}
              resizeMode="contain"
            />
          </View>

          {/* Bottom card */}
          <View style={styles.bottomCard}>
            <Text style={styles.title}>
              Let's <Text style={styles.titleAccent}>Build</Text> Better{'\n'}Together.
            </Text>
            
            <Text style={styles.subtitle}>
              The #1 private collaboration platform designed for teams to communicate, share ideas, manage work, and grow collectively in one secure space.
            </Text>

            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#00664F",
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Math.max(height * 0.02, 20), // Reduced top padding to move image higher
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'flex-start', // Changed from 'center' to 'flex-start'
    alignItems: 'center',
    paddingHorizontal: Math.max(width * 0.05, 20),
    paddingTop: Math.max(height * 0.05, 30), // Added top padding to position image higher
    minHeight: height * 0.5, // Increased minimum height
  },
  handImage: {
    width: Math.min(width * 0.95, 900), // Increased from 0.85 to 0.95 and maxWidth to 700
    height: Math.min(width * 0.95, height * 0.6), // Increased height ratio to 0.6
    maxWidth: 800, // Increased from 550
    maxHeight: 900, // Increased from 700
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: getResponsiveSize(32),
    borderTopRightRadius: getResponsiveSize(32),
    paddingHorizontal: Math.max(width * 0.06, 24),
    paddingTop: getResponsiveSize(36),
    paddingBottom: Math.max(getResponsiveSize(50), 50), // Increased bottom padding
    minHeight: height * 0.4, // Increased minimum height for more space
  },
  title: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'left',
    marginBottom: getResponsiveSize(16),
    fontFamily: 'System',
    lineHeight: getResponsiveFontSize(34),
  },
  titleAccent: {
    color: '#00664F',
  },
  subtitle: {
    fontSize: getResponsiveFontSize(16),
    color: '#6B7280',
    textAlign: 'left',
    marginBottom: getResponsiveSize(32),
    lineHeight: getResponsiveFontSize(24),
    fontFamily: 'System',
  },
  getStartedButton: {
    backgroundColor: '#00664F',
    paddingVertical: getResponsiveSize(18),
    paddingHorizontal: getResponsiveSize(32),
    borderRadius: getResponsiveSize(16),
    alignItems: 'center',
    minHeight: getResponsiveSize(56),
    justifyContent: 'center',
    marginTop: getResponsiveSize(8), // Added margin top for better spacing
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    fontFamily: 'System',
  },
});
