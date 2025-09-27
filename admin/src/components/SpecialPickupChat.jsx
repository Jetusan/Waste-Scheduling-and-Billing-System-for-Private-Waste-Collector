import React, { useState, useEffect, useRef } from 'react';
import './SpecialPickupChat.css';

const API_BASE_URL = 'http://localhost:5000';

const SpecialPickupChat = ({ requestId, requestData, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [priceOffer, setPriceOffer] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chat, setChat] = useState(null);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    if (chat) {
      setIsPolling(true);
      const interval = setInterval(() => {
        fetchMessages(chat.chat_id);
      }, 2000); // Poll for new messages every 2 seconds
      return () => clearInterval(interval);
    }
  }, [chat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
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
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prevMessages => {
          // Only update if messages have actually changed
          if (JSON.stringify(prevMessages) !== JSON.stringify(data.messages)) {
            return data.messages;
          }
          return prevMessages;
        });
        
        // Mark messages as read
        await markAsRead(chatId);
      } else {
        console.error('Failed to fetch messages:', response.status);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (chatId) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_BASE_URL}/api/chat/${chatId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_type: 'admin',
          sender_id: 1 // Admin ID
        }),
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (messageText, messageType = 'text', priceAmount = null) => {
    if ((!messageText.trim() && messageType === 'text') || !chat || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/chat/${chat.chat_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_text: messageText,
          message_type: messageType,
          price_amount: priceAmount,
          sender_type: 'admin',
          sender_id: 1 // Admin ID
        }),
      });

      if (response.ok) {
        setNewMessage('');
        setPriceOffer('');
        setShowPriceInput(false);
        await fetchMessages();
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = () => {
    sendMessage(newMessage.trim());
  };

  const handleSendPriceOffer = () => {
    if (!priceOffer || isNaN(priceOffer)) {
      alert('Please enter a valid price');
      return;
    }
    
    const messageText = `I'm offering ₱${priceOffer} for this pickup. Please let me know if this works for you.`;
    sendMessage(messageText, 'price_offer', parseFloat(priceOffer));
  };

  const renderMessage = (message) => {
    const isMyMessage = message.sender_type === 'admin';
    const isPriceOffer = message.message_type === 'price_offer';
    const isPriceResponse = ['price_accept', 'price_reject', 'price_counter'].includes(message.message_type);

    return (
      <div key={message.message_id} className={`message ${isMyMessage ? 'admin-message' : 'resident-message'}`}>
        <div className="message-bubble">
          <div className="message-header">
            <span className="sender-name">{message.sender_name}</span>
            <span className="message-time">
              {new Date(message.sent_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          
          <div className="message-content">
            {message.message_text}
            
            {(isPriceOffer || isPriceResponse) && message.price_amount && (
              <div className={`price-badge ${message.message_type}`}>
                ₱{message.price_amount}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="chat-modal">
        <div className="chat-container">
          <div className="chat-header">
            <h3>Loading chat...</h3>
            <button onClick={onClose} className="close-btn">&times;</button>
          </div>
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-modal">
      <div className="chat-container">
        <div className="chat-header">
          <div className="request-info">
            <h3>Chat - Request #{requestId}</h3>
            <p>{requestData?.waste_type} • {requestData?.status}</p>
            {isPolling && (
              <small className="polling-indicator">
                🔄 Live updates active
              </small>
            )}
          </div>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(renderMessage)
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-section">
          {showPriceInput ? (
            <div className="price-input-container">
              <input
                type="number"
                value={priceOffer}
                onChange={(e) => setPriceOffer(e.target.value)}
                placeholder="Enter price amount"
                className="price-input"
                min="0"
                step="0.01"
              />
              <button 
                onClick={handleSendPriceOffer}
                disabled={sending || !priceOffer}
                className="send-price-btn"
              >
                Send Offer
              </button>
              <button 
                onClick={() => setShowPriceInput(false)}
                className="cancel-price-btn"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="message-input-container">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="message-input"
                rows="2"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="input-actions">
                <button 
                  onClick={() => setShowPriceInput(true)}
                  className="price-offer-btn"
                  title="Send Price Offer"
                >
                  💰
                </button>
                <button 
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="send-message-btn"
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecialPickupChat;
