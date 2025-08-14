import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView,ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Fontisto, Feather } from '@expo/vector-icons';


const CHome = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
            <Text style={styles.welcomeText}>Welcome Collector!</Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.notificationIcon}
              onPress={() => router.push('/collector/CNotif')}>
                <Fontisto name="email" size={24} color="black" />
                <View style={styles.notificationDot}/>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.notificationIcon, { marginLeft: 16 }]}
                onPress={() => router.push('/CSettings')}
              >
                <Feather name="settings" size={24} color="black" />
              </TouchableOpacity>
            </View>
         </View>



        {/* Background Map (placeholder) */}
                <View style={styles.mapPlaceholder}>
                    <ImageBackground
            source={require('../../assets/images/M.jpg')}
            style={styles.mapPlaceholder}
            imageStyle={{ borderRadius: 8 }}
            resizeMode="cover"
              >
                <View style={{ flex: 1 }} />
              </ImageBackground>
        </View>


        {/* Today’s Pickup Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today&#39;s Pickup</Text>
          <Text style={styles.cardValueGreen}>N/A</Text>
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today&#39;s Hour Worked</Text>
          <Text style={styles.cardValue}>N/A</Text>

          <Text style={styles.cardTitle}>Today&#39;s Distance Covered</Text>
          <Text style={styles.cardValue}>N/A</Text>

          <Text style={styles.cardTitle}>Today&#39;s Waste Collected</Text>
          <Text style={styles.cardValue}>N/A</Text>
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.buttonGreen} 
        onPress={() => router.push('/collector/LCO')}>
          <Text style={styles.buttonText}>Last Collection&#39;s Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonGreen}
        onPress={() => router.push('/collector/CSchedule')}>
          <Text style={styles.buttonText}>Schedules</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonGreen}
        onPress={() => router.push('/collector/specialpickup')}>
          <Text style={styles.buttonText}>Special Pick Up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonDarkGreen}
        onPress={() => router.push('/collector/CStartCollection')}>
          <Text style={styles.buttonText}>Start Collections</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default CHome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationIcon: {
  position: 'relative',
  padding: 8,
},
  mailIcon: {
    width: 24,
    height: 24,
  },
 notificationDot: {
  width: 8,
  height: 8,
  backgroundColor: 'red',
  borderRadius: 4,
  position: 'absolute',
  top: 2,
  right: 2,
},
 mapPlaceholder: {
  height: 150,             // increased height for a better banner look
  width: '100%',          
  marginVertical: 12,
  borderRadius: 8,
  overflow: 'hidden',      // clips corners if image overflows
},
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2, // Android
    shadowColor: '#000', // iOS
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardValueGreen: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'green',
  },
  buttonGreen: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    marginVertical: 4,
    alignItems: 'center',
  },
  buttonDarkGreen: {
    backgroundColor: '#2e7d32',
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
