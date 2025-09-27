import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getToken, getUserId } from '../auth';
import { API_BASE_URL } from '../config';

const FeedbackPage = () => {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userFeedbacks, setUserFeedbacks] = useState([]);
  const [showFeedbacks, setShowFeedbacks] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    getCurrentUserId();
  }, []);

  const getCurrentUserId = async () => {
    try {
      const storedUserId = await getUserId();
      setCurrentUserId(storedUserId);
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
  };

  const handleRating = (value) => {
    setRating(value);
  };

  const sendRatings = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'Please log in to submit feedback');
      return;
    }

    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting');
      return;
    }

    if (!feedback.trim()) {
      Alert.alert('Feedback Required', 'Please provide your feedback before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      
      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: parseInt(currentUserId),
          rating: rating,
          feedback_text: feedback.trim(),
          category: category
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success!', 
          'Thank you for your feedback! We appreciate your input.',
          [
            {
              text: 'OK',
              onPress: () => {
                setRating(0);
                setFeedback('');
                setCategory('general');
              }
            }
          ]
        );
      } else {
        throw new Error(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewRatings = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'Please log in to view feedback');
      return;
    }

    setIsLoading(true);
    setShowFeedbacks(true);

    try {
      const token = await getToken();
      
      // Fetch ALL feedback, not just user's feedback
      const response = await fetch(`${API_BASE_URL}/api/feedback`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Sort feedback with user's feedback first, then by date
        const sortedFeedback = data.feedback ? data.feedback.sort((a, b) => {
          // User's feedback first
          if (a.user_id === parseInt(currentUserId) && b.user_id !== parseInt(currentUserId)) return -1;
          if (b.user_id === parseInt(currentUserId) && a.user_id !== parseInt(currentUserId)) return 1;
          // Then by date (newest first)
          return new Date(b.created_at) - new Date(a.created_at);
        }) : [];
        
        setUserFeedbacks(sortedFeedback);
      } else {
        throw new Error('Failed to fetch feedback');
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      Alert.alert('Error', 'Failed to load feedback. Please try again.');
      setShowFeedbacks(false);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#4CD964';
      case 'reviewed': return '#2196F3';
      case 'resolved': return '#4CAF50';
      default: return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'checkmark-circle-outline';
      case 'reviewed': return 'eye-outline';
      case 'resolved': return 'checkmark-done-outline';
      default: return 'help-circle-outline';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Submitted';
      case 'reviewed': return 'Under Review';
      case 'resolved': return 'Resolved';
      default: return status;
    }
  };

  const renderFeedbackItem = ({ item }) => {
    const isCurrentUser = item.user_id === parseInt(currentUserId);
    
    return (
      <View style={[
        styles.feedbackItem,
        isCurrentUser && styles.currentUserFeedback
      ]}>
        {isCurrentUser && (
          <View style={styles.yourFeedbackBadge}>
            <Text style={styles.yourFeedbackText}>Your Feedback</Text>
          </View>
        )}
        
        <View style={styles.feedbackHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {isCurrentUser ? 'You' : `${item.first_name || 'User'} ${item.last_name || ''}`}
            </Text>
            <View style={styles.ratingDisplay}>
              {[1, 2, 3, 4, 5].map((star) => (
                <FontAwesome
                  key={star}
                  name={star <= item.rating ? 'star' : 'star-o'}
                  size={14}
                  color={star <= item.rating ? '#FFD700' : '#D3D3D3'}
                />
              ))}
              <Text style={styles.ratingText}>({item.rating}/5)</Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <Ionicons 
              name={getStatusIcon(item.status)} 
              size={16} 
              color={getStatusColor(item.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.feedbackText}>{item.feedback_text}</Text>
        
        {item.admin_response && (
          <View style={styles.adminResponse}>
            <Text style={styles.adminResponseLabel}>Admin Response:</Text>
            <Text style={styles.adminResponseText}>{item.admin_response}</Text>
          </View>
        )}
        
        <Text style={styles.feedbackDate}>{formatDate(item.created_at)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
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

          {rating > 0 && (
            <Text style={styles.ratingLabel}>
              {rating === 1 && "We're sorry to hear that. Please tell us how we can improve."}
              {rating === 2 && "We appreciate your feedback. How can we do better?"}
              {rating === 3 && "Thank you for your feedback. What can we improve?"}
              {rating === 4 && "Great! We'd love to know what we did well and how we can improve."}
              {rating === 5 && "Excellent! We're thrilled you had a great experience!"}
            </Text>
          )}

          <Text style={styles.label}>Your Feedback</Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Share your experience with us..."
            value={feedback}
            onChangeText={setFeedback}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity 
            style={[styles.button, isSubmitting && styles.buttonDisabled]} 
            onPress={sendRatings}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>SEND FEEDBACK</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={viewRatings}>
            <Ionicons name="list-outline" size={20} color="#4CD964" style={{ marginRight: 8 }} />
            <Text style={[styles.buttonText, { color: '#4CD964' }]}>VIEW ALL FEEDBACK</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Feedback History Modal */}
      <Modal
        visible={showFeedbacks}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Feedback</Text>
            <TouchableOpacity onPress={() => setShowFeedbacks(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CD964" />
              <Text style={styles.loadingText}>Loading feedback...</Text>
            </View>
          ) : userFeedbacks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Feedback Available</Text>
              <Text style={styles.emptySubtitle}>
                No feedback has been submitted yet. Be the first to share your experience!
              </Text>
            </View>
          ) : (
            <FlatList
              data={userFeedbacks}
              renderItem={renderFeedbackItem}
              keyExtractor={(item) => item.feedback_id.toString()}
              contentContainerStyle={styles.feedbackList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4CD964',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    padding: 20,
    flexGrow: 1,
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
    marginBottom: 15,
  },
  star: {
    marginHorizontal: 8,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
    lineHeight: 20,
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
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  secondaryButton: {
    backgroundColor: '#E8F5E9',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  feedbackList: {
    padding: 16,
  },
  feedbackItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentUserFeedback: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CD964',
    backgroundColor: '#F8FFF8',
  },
  yourFeedbackBadge: {
    backgroundColor: '#4CD964',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  yourFeedbackText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  adminResponse: {
    backgroundColor: '#f0fff4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CD964',
  },
  adminResponseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CD964',
    marginBottom: 4,
  },
  adminResponseText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
});

export default FeedbackPage;
