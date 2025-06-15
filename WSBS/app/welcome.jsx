import { Text, View, Image, StyleSheet, Pressable, ImageBackground } from "react-native";
import { globalStyles, colors } from './styles/global';
import { useRouter } from 'expo-router';

export default function Welcome() {
  const router = useRouter();

  return (
    <ImageBackground 
      source={require("../assets/images/BGwaste.jpg")}
      style={styles.backgroundImage}
    >
      <View style={[globalStyles.container, styles.container]}>
        <View style={styles.content}>
          <Image
            source={require("../assets/images/LOGO.png")}
            style={styles.logo}
          />
          <Text style={[globalStyles.title, styles.title]}>WSBS</Text>
          <Text style={styles.description}>
            A cleaner community starts with you. Manage your waste collection schedules, payments, and notifications—all in one place. Let&apos;s work together for a greener, healthier neighborhood!
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <Pressable 
            style={styles.button}
            onPress={() => router.push('/role')}
          >
            <Text style={styles.buttonText}>NEXT</Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  container: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },

  title: {
  fontSize: 35,
  fontWeight: 'bold',
  color: '#1C1C1C', // Darker color for better contrast
  textAlign: 'center',
  marginBottom: 15,
  textShadowColor: 'rgba(0, 0, 0, 0.2)',
  textShadowOffset: { width: 1, height: 2 },
  textShadowRadius: 3,
  },


  description: {
  fontSize: 16,
  lineHeight: 24,
  textAlign: 'justify', // works on iOS, may not on Android
  marginHorizontal: 20,
  marginBottom: 20,
  color: colors.text,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  padding: 15,
  borderRadius: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3, // Android shadow
  },

  buttonContainer: {
  position: 'absolute',
  bottom: 80,
  right: 40,
  shadowColor: '#000',
  shadowOffset: { width: 1, height: 5 },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 5, // for Android shadow
  },

  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  }
});
