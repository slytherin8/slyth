import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
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
    </View>
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
    paddingTop: 80,
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  handImage: {
    width: width * 0.9,
    height: width * 0.9,
    maxWidth: 500,
    maxHeight: 500,
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'left',
    marginBottom: 16,
    fontFamily: 'Urbanist-Bold', // Will fallback to system font if not loaded
    lineHeight: 38,
  },
  titleAccent: {
    color: '#00664F',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'left',
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: 'Urbanist-Regular', // Will fallback to system font if not loaded
  },
  getStartedButton: {
    backgroundColor: '#00664F',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#00664F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Urbanist-SemiBold', // Will fallback to system font if not loaded
  },
});
