import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  StatusBar,
  Platform
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { wp, hp, fp, rs, DEVICE_WIDTH, DEVICE_HEIGHT, isSmallDevice } from '../utils/responsive';

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
    paddingTop: hp(20),
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: wp(20),
    paddingTop: hp(30),
    minHeight: hp(400),
  },
  handImage: {
    width: isSmallDevice() ? DEVICE_WIDTH * 0.9 : DEVICE_WIDTH * 0.95,
    height: isSmallDevice() ? hp(300) : hp(400),
    maxWidth: 950,
    maxHeight: 950,
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: rs(32),
    borderTopRightRadius: rs(32),
    paddingHorizontal: wp(24),
    paddingTop: hp(36),
    paddingBottom: hp(50),
    minHeight: isSmallDevice() ? hp(320) : hp(350),
  },
  title: {
    fontSize: fp(28),
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'left',
    marginBottom: hp(16),
    fontFamily: 'System',
    lineHeight: fp(34),
  },
  titleAccent: {
    color: '#00664F',
  },
  subtitle: {
    fontSize: fp(16),
    color: '#6B7280',
    textAlign: 'left',
    marginBottom: hp(32),
    lineHeight: fp(24),
    fontFamily: 'System',
  },
  getStartedButton: {
    backgroundColor: '#00664F',
    paddingVertical: hp(18),
    paddingHorizontal: wp(32),
    borderRadius: rs(16),
    alignItems: 'center',
    minHeight: hp(56),
    justifyContent: 'center',
    marginTop: hp(8),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fp(18),
    fontWeight: '600',
    fontFamily: 'System',
  },
});
