import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

const LCO = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Map at the top with back button inside */}
        <ImageBackground
          source={require('../../assets/images/map.png')}
          style={styles.mapBackground}
          imageStyle={{ borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}
          resizeMode="cover"
        >
          <TouchableOpacity
            onPress={() => router.push('/collector/CHome')}
            style={styles.backButton}
          >
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
        </ImageBackground>

        {/* Content below map */}
        <View style={styles.content}>
          <Text style={styles.title}>Last Collection&apos;s Overview</Text>

          <TouchableOpacity style={styles.refreshButton}>
            <Text style={styles.refreshText}>Refresh Stats</Text>
          </TouchableOpacity>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Total Pickup:</Text>
              <Text style={styles.statValue}>N/A</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Missed Collections:</Text>
              <Text style={styles.statValue}>N/A</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Total Hours Worked:</Text>
              <Text style={styles.statValue}>N/A</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statTitle}>Total Distance:</Text>
              <Text style={styles.statValue}>N/A</Text>
            </View>
            <View style={styles.statCardLarge}>
              <Text style={styles.statTitle}>Total Waste Collected:</Text>
              <Text style={styles.statValue}>N/A</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.buttonLightGreen}>
              <Text style={styles.buttonText}>Yesterday&apos;s Overview</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonGreen}>
              <Text style={styles.buttonText}>Start Collections</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default LCO;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mapBackground: {
    height: 200,
    width: '100%',
    justifyContent: 'flex-start',
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    color: 'black',
    fontSize: 16,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    borderRadius: 8,
    marginVertical: 8,
  },
  refreshText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statsContainer: {
    marginTop: 8,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  statCardLarge: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  statTitle: {
    fontSize: 14,
    color: '#333',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  buttonLightGreen: {
    backgroundColor: '#8BC34A',
    flex: 1,
    marginRight: 8,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonGreen: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginLeft: 8,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
