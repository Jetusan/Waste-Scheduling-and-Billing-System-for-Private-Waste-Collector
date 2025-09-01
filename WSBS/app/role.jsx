import { Text, View, StyleSheet, Pressable } from "react-native";
import { globalStyles, colors } from './styles/global';
import { useRouter } from 'expo-router';

export default function RoleScreen() {
  const router = useRouter();

  return (
    <View style={[globalStyles.container, styles.container]}>
      <Pressable 
        style={styles.backButton}
        onPress={() => router.push("/welcome")}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Select Your Role</Text>
      
      <View style={styles.buttonContainer}> 
        <Pressable 
          style={styles.roleButton} 
          onPress={() => router.push('/RLogin')}
        >
          <Text style={styles.buttonText}>Resident(Subscriber)</Text>
        </Pressable>
        <Pressable 
          style={styles.roleButton}
          onPress={() => router.push('/collector/CLogin')}
        >
          <Text style={styles.buttonText}>Collector</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>Choose your role to continue.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    gap: 15,
  },
  roleButton: {
    backgroundColor: '#4CD964',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  }
});
