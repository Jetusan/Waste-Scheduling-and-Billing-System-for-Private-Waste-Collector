import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
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
    // Add logic to send ratings and feedback
  };

  const viewRatings = () => {
    console.log('Viewing ratings');
    // Add logic to view ratings
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FeedBack</Text>
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => handleRating(star)}>
            <FontAwesome
              name={star <= rating ? 'star' : 'star-o'}
              size={32}
              color={star <= rating ? '#FFD700' : '#C0C0C0'}
            />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.feedbackInput}
        placeholder="Write your feedback here..."
        value={feedback}
        onChangeText={setFeedback}
        multiline
      />
      <TouchableOpacity style={styles.button} onPress={sendRatings}>
        <Text style={styles.buttonText}>SEND RATINGS</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={viewRatings}>
        <Text style={styles.buttonText}>VIEW RATINGS</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#A8E890',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  feedbackInput: {
    width: '80%',
    height: 100,
    borderWidth: 1,
    borderColor: '#C0C0C0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFF',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: '60%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});

export default FeedbackPage;