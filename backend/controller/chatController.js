const pool = require('../config/db');

// Create or get existing chat for a special pickup request
const getOrCreateChat = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Check if chat already exists
    let chatQuery = `
      SELECT c.*, spr.user_id, spr.waste_type, spr.status as request_status
      FROM special_pickup_chats c
      JOIN special_pickup_requests spr ON c.request_id = spr.request_id
      WHERE c.request_id = $1
    `;
    
    let result = await pool.query(chatQuery, [requestId]);
    
    if (result.rows.length === 0) {
      // Create new chat
      const createChatQuery = `
        INSERT INTO special_pickup_chats (request_id)
        VALUES ($1)
        RETURNING *
      `;
      
      const chatResult = await pool.query(createChatQuery, [requestId]);
      
      // Get the full chat info with request details
      result = await pool.query(chatQuery, [requestId]);
    }
    
    res.json({
      success: true,
      chat: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error getting/creating chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error accessing chat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get chat messages
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        m.*,
        CASE 
          WHEN m.sender_type = 'resident' THEN un.first_name || ' ' || un.last_name
          WHEN m.sender_type = 'admin' THEN 'Admin'
          WHEN m.sender_type = 'collector' THEN 'Collector'
        END as sender_name
      FROM special_pickup_chat_messages m
      LEFT JOIN users u ON m.sender_id = u.user_id AND m.sender_type = 'resident'
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE m.chat_id = $1
      ORDER BY m.sent_at ASC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [chatId, limit, offset]);
    
    res.json({
      success: true,
      messages: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { 
      message_text, 
      message_type = 'text', 
      price_amount = null,
      sender_type,
      sender_id 
    } = req.body;
    
    // Validate required fields
    if (!message_text || !sender_type || !sender_id) {
      return res.status(400).json({
        success: false,
        message: 'Message text, sender type, and sender ID are required'
      });
    }
    
    // Insert message
    const insertQuery = `
      INSERT INTO special_pickup_chat_messages 
      (chat_id, sender_type, sender_id, message_text, message_type, price_amount)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [chatId, sender_type, sender_id, message_text, message_type, price_amount];
    const result = await pool.query(insertQuery, values);
    
    // If it's a price acceptance, update the chat and request
    if (message_type === 'price_accept' && price_amount) {
      await pool.query(`
        UPDATE special_pickup_chats 
        SET final_agreed_price = $1, price_agreed = true, status = 'closed'
        WHERE chat_id = $2
      `, [price_amount, chatId]);
      
      await pool.query(`
        UPDATE special_pickup_requests 
        SET final_price = $1, price_status = 'agreed'
        WHERE request_id = (SELECT request_id FROM special_pickup_chats WHERE chat_id = $2)
      `, [price_amount, chatId]);
    }
    
    res.json({
      success: true,
      message: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { sender_type, sender_id } = req.body;
    
    // Mark all messages from other senders as read
    const query = `
      UPDATE special_pickup_chat_messages 
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE chat_id = $1 
      AND (sender_type != $2 OR sender_id != $3)
      AND is_read = false
    `;
    
    await pool.query(query, [chatId, sender_type, sender_id]);
    
    res.json({
      success: true,
      message: 'Messages marked as read'
    });
    
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get chat summary for admin dashboard
const getChatSummary = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.chat_id,
        c.request_id,
        c.status,
        c.price_agreed,
        c.final_agreed_price,
        c.updated_at,
        spr.waste_type,
        spr.status as request_status,
        un.first_name || ' ' || un.last_name as resident_name,
        (
          SELECT COUNT(*) 
          FROM special_pickup_chat_messages m 
          WHERE m.chat_id = c.chat_id 
          AND m.sender_type = 'resident' 
          AND m.is_read = false
        ) as unread_count,
        (
          SELECT m.message_text 
          FROM special_pickup_chat_messages m 
          WHERE m.chat_id = c.chat_id 
          ORDER BY m.sent_at DESC 
          LIMIT 1
        ) as last_message
      FROM special_pickup_chats c
      JOIN special_pickup_requests spr ON c.request_id = spr.request_id
      JOIN users u ON spr.user_id = u.user_id
      JOIN user_names un ON u.name_id = un.name_id
      WHERE c.status = 'active'
      ORDER BY c.updated_at DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      chats: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching chat summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getOrCreateChat,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  getChatSummary
};
