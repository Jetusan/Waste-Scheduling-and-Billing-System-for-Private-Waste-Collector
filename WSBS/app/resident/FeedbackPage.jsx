import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const FeedbackPage = () => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleRating = (value) => {
    setRating(value);
  };

  const sendRatings = () => {
    console.log('Rating:', rating);
    console.log('Feedback:', feedback);
    // Add API logic here
  };

  const viewRatings = () => {
    console.log('Viewing ratings');
    // Add navigation or logic here
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Rate Our Service</Text>

        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => handleRating(star)}>
              <FontAwesome
                name={star <= rating ? 'star' : 'star-o'}
                size={36}
                color={star <= rating ? '#FFD700' : '#D3D3D3'}
                style={styles.star}
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Your Feedback</Text>
        <TextInput
          style={styles.feedbackInput}
          placeholder="Share your experience with us..."
          value={feedback}
          onChangeText={setFeedback}
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.button} onPress={sendRatings}>
          <Text style={styles.buttonText}>SEND FEEDBACK</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={viewRatings}>
          <Text style={[styles.buttonText, { color: '#4CD964' }]}>VIEW FEEDBACKS</Text>
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
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 25,
  },
  star: {
    marginHorizontal: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 10,
  },
  feedbackInput: {
    height: 120,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#FDFDFD',
    fontSize: 15,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4CD964',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#E8F5E9',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default FeedbackPage;
