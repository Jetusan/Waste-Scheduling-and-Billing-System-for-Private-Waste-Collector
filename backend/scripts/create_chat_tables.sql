-- Create chat tables for special pickup requests

-- Table for chat sessions
CREATE TABLE IF NOT EXISTS special_pickup_chats (
    chat_id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES special_pickup_requests(request_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    price_agreed BOOLEAN DEFAULT FALSE,
    final_agreed_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for chat messages
CREATE TABLE IF NOT EXISTS special_pickup_chat_messages (
    message_id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL REFERENCES special_pickup_chats(chat_id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('resident', 'admin', 'collector')),
    sender_id INTEGER NOT NULL,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'price_offer', 'price_accept', 'price_reject', 'price_counter')),
    price_amount DECIMAL(10,2),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_special_pickup_chats_request_id ON special_pickup_chats(request_id);
CREATE INDEX IF NOT EXISTS idx_special_pickup_chat_messages_chat_id ON special_pickup_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_special_pickup_chat_messages_sender ON special_pickup_chat_messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_special_pickup_chat_messages_sent_at ON special_pickup_chat_messages(sent_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE special_pickup_chats 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE chat_id = NEW.chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chat_timestamp ON special_pickup_chat_messages;
CREATE TRIGGER trigger_update_chat_timestamp
    AFTER INSERT ON special_pickup_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_timestamp();
