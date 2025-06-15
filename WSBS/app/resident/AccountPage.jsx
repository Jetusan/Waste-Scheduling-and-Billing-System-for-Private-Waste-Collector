import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const AccountPage = () => {
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
    // Add logic to save changes
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.profilePictureContainer}>
        <View style={styles.profilePicture} />
        <TouchableOpacity style={styles.editPictureButton}>
          <Text style={styles.editPictureText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
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
        placeholder="Country/Region"
        value={country}
        onChangeText={setCountry}
      />
      <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
        <Text style={styles.saveButtonText}>Save changes</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#A8E890',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#C0C0C0',
  },
  editPictureButton: {
    marginTop: 10,
  },
  editPictureText: {
    color: '#000',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#C0C0C0',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#FFF',
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default AccountPage;