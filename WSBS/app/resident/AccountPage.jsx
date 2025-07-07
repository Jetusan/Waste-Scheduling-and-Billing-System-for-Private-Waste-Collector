import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const AccountPage = () => {
  const router = useRouter();

  const [name, setName] = useState('Melissa Peters');
  const [email, setEmail] = useState('melpeters@gmail.com');
  const [password, setPassword] = useState('********');
  const [dob, setDob] = useState('23/05/1995');
  const [country, setCountry] = useState('Nigeria');

  const saveChanges = () => {
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Date of Birth:', dob);
    console.log('Country/Region:', country);
    // API logic here
  };

  const handleLogout = () => {
    router.replace('/RLogin');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Your Profile</Text>

        <View style={styles.profilePictureContainer}>
          <View style={styles.profilePicture} />
          <TouchableOpacity style={styles.editPictureButton}>
            <Text style={styles.editPictureText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Date of Birth"
          value={dob}
          onChangeText={setDob}
        />
        <TextInput
          style={styles.input}
          placeholder="Country / Region"
          value={country}
          onChangeText={setCountry}
        />

        <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FAFAFA',
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicture: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#C0C0C0',
  },
  editPictureButton: {
    marginTop: 12,
  },
  editPictureText: {
    color: '#4CD964',
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FDFDFD',
    fontSize: 16,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#4CD964',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default AccountPage;
