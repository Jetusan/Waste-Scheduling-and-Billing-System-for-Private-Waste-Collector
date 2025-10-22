import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '../config';
import { getToken, getUserId } from '../auth';

const RequestChatSection = ({ requestId, isExpanded, onToggle, unreadCount = 0 }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chat, setChat] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const scrollViewRef = useRef();

  useEffect(() => {
    if (isExpanded && !chat) {
      initializeChat();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (chat && isExpanded) {
      const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [chat, isExpanded]);

  const initializeChat = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const userId = await getUserId();
      
      if (userId) {
        setCurrentUser({ userId });
      }

      // Get or create chat
      const chatResponse = await fetch(`${API_BASE_URL}/api/chat/request/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (chatResponse.ok) {
        const chatData = await chatResponse.json();
        setChat(chatData.chat);
        await fetchMessages(chatData.chat.chat_id);
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId = chat?.chat_id) => {
    if (!chatId) return;

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        
        // Mark messages as read
        await markAsRead(chatId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (chatId) => {
    if (!currentUser) return;

    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/api/chat/${chatId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_type: 'resident',
          sender_id: currentUser.userId
        }),
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chat || sending) return;

    setSending(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/chat/${chat.chat_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_text: newMessage.trim(),
          message_type: 'text',
          sender_type: 'resident',
          sender_id: currentUser.userId
        }),
      });

      if (response.ok) {
        setNewMessage('');
        await fetchMessages();
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handlePriceResponse = async (action, price) => {
    if (!chat || sending) return;

    setSending(true);
    try {
      const token = await getToken();
      let messageText = '';
      let messageType = '';

      switch (action) {
        case 'accept':
          messageText = `I accept the price of ₱${price}`;
          messageType = 'price_accept';
          break;
        case 'reject':
          messageText = `I reject the price of ₱${price}`;
          messageType = 'price_reject';
          break;
      }

      const response = await fetch(`${API_BASE_URL}/api/chat/${chat.chat_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_text: messageText,
          message_type: messageType,
          price_amount: price,
          sender_type: 'resident',
          sender_id: currentUser.userId
        }),
      });

      if (response.ok) {
        await fetchMessages();
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error responding to price:', error);
      Alert.alert('Error', 'Failed to respond to price');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = (message) => {
    const isMyMessage = message.sender_type === 'resident' && message.sender_id === currentUser?.userId;
    const isPriceOffer = message.message_type === 'price_offer';

    return (
      <View key={message.message_id} style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={styles.senderName}>{message.sender_name}</Text>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {message.message_text}
          </Text>
          
          {isPriceOffer && message.price_amount && !isMyMessage && (
            <View style={styles.priceActions}>
              <TouchableOpacity
                style={[styles.priceButton, styles.acceptButton]}
                onPress={() => handlePriceResponse('accept', message.price_amount)}
              >
                <Text style={styles.priceButtonText}>Accept ₱{message.price_amount}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.priceButton, styles.rejectButton]}
                onPress={() => handlePriceResponse('reject', message.price_amount)}
              >
                <Text style={styles.priceButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <Text style={styles.messageTime}>
            {new Date(message.sent_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  // Always show the chat toggle
  if (!isExpanded) {
    return (
      <TouchableOpacity style={[
        styles.chatToggle,
        unreadCount > 0 && { backgroundColor: '#FFF3E0' }
      ]} onPress={onToggle}>
        <View style={{ position: 'relative' }}>
          <Ionicons 
            name="chatbubble-outline" 
            size={16} 
            color={unreadCount > 0 ? '#FF5722' : '#4CAF50'} 
          />
          {unreadCount > 0 && (
            <View style={{
              position: 'absolute',
              top: -4,
              right: -4,
              backgroundColor: '#FF1744',
              borderRadius: 8,
              minWidth: 16,
              height: 16,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 4,
            }}>
              <Text style={{
                color: 'white',
                fontSize: 10,
                fontWeight: 'bold',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        <Text style={[
          styles.chatToggleText,
          unreadCount > 0 && { color: '#FF5722', fontWeight: 'bold' }
        ]}>
          {unreadCount > 0 ? `Chat (${unreadCount} new)` : 'Chat with Collector'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={unreadCount > 0 ? '#FF5722' : '#4CAF50'} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.chatContainer}>
      <TouchableOpacity style={styles.chatHeader} onPress={onToggle}>
        <Ionicons name="chatbubble" size={16} color="#4CAF50" />
        <Text style={styles.chatHeaderText}>Chat with Collector</Text>
        <Ionicons name="chevron-up" size={16} color="#4CAF50" />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>
                  No messages yet. Start a conversation!
                </Text>
              </View>
            ) : (
              messages.map(renderMessage)
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  chatToggleText: {
    marginHorizontal: 8,
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  chatContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
  },
  chatHeaderText: {
    marginHorizontal: 8,
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  messagesContainer: {
    maxHeight: 200,
    paddingHorizontal: 12,
  },
  messagesContent: {
    paddingVertical: 8,
  },
  emptyChat: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyChatText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  messageContainer: {
    marginVertical: 2,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 8,
    borderRadius: 12,
  },
  myMessageBubble: {
    backgroundColor: '#4CAF50',
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  senderName: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
    opacity: 0.7,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 2,
    opacity: 0.6,
  },
  priceActions: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  priceButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flex: 1,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  priceButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxHeight: 80,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    padding: 8,
    marginLeft: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default RequestChatSection;
