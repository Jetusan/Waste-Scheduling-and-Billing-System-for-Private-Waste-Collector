const { Server } = require('socket.io');

let io = null;

/**
 * Initialize Socket.IO server
 * @param {http.Server} server - HTTP server instance
 */
function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for development
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`✅ WebSocket client connected: ${socket.id}`);

    // Handle collector joining their room
    socket.on('join_collector', (collectorId) => {
      const room = `collector_${collectorId}`;
      socket.join(room);
      console.log(`👤 Collector ${collectorId} joined room: ${room}`);
      socket.emit('joined', { room, collectorId });
    });

    // Handle resident joining their room
    socket.on('join_resident', (userId) => {
      const room = `resident_${userId}`;
      socket.join(room);
      console.log(`🏠 Resident ${userId} joined room: ${room}`);
      socket.emit('joined', { room, userId });
    });

    // Handle admin joining admin room
    socket.on('join_admin', () => {
      socket.join('admin');
      console.log(`👨‍💼 Admin joined admin room`);
      socket.emit('joined', { room: 'admin' });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ WebSocket client disconnected: ${socket.id}`);
    });

    // Ping-pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  console.log('🔌 WebSocket server initialized');
  return io;
}

/**
 * Get the Socket.IO instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeWebSocket first.');
  }
  return io;
}

/**
 * Emit collection update to specific collector
 * @param {number} collectorId - Collector ID
 * @param {object} data - Update data
 */
function emitCollectionUpdate(collectorId, data) {
  if (!io) return;
  
  const room = `collector_${collectorId}`;
  io.to(room).emit('collection_update', {
    type: 'collection_update',
    collectorId,
    timestamp: new Date().toISOString(),
    ...data
  });
  
  console.log(`📡 Emitted collection_update to collector ${collectorId}:`, data);
}

/**
 * Emit stats update to specific collector
 * @param {number} collectorId - Collector ID
 * @param {object} stats - Updated stats
 */
function emitStatsUpdate(collectorId, stats) {
  if (!io) return;
  
  const room = `collector_${collectorId}`;
  io.to(room).emit('stats_update', {
    type: 'stats_update',
    collectorId,
    timestamp: new Date().toISOString(),
    stats
  });
  
  console.log(`📊 Emitted stats_update to collector ${collectorId}`);
}

/**
 * Emit notification to specific collector
 * @param {number} collectorId - Collector ID
 * @param {object} notification - Notification data
 */
function emitNotification(collectorId, notification) {
  if (!io) return;
  
  const room = `collector_${collectorId}`;
  io.to(room).emit('notification', {
    type: 'notification',
    collectorId,
    timestamp: new Date().toISOString(),
    ...notification
  });
  
  console.log(`🔔 Emitted notification to collector ${collectorId}:`, notification.title);
}

/**
 * Emit notification to specific resident
 * @param {number} userId - Resident user ID
 * @param {object} notification - Notification data
 */
function emitResidentNotification(userId, notification) {
  if (!io) return;
  
  const room = `resident_${userId}`;
  io.to(room).emit('notification', {
    type: 'notification',
    userId,
    timestamp: new Date().toISOString(),
    ...notification
  });
  
  console.log(`🔔 Emitted notification to resident ${userId}:`, notification.title);
}

/**
 * Emit admin dashboard update
 * @param {object} data - Update data
 */
function emitAdminUpdate(data) {
  if (!io) return;
  
  io.to('admin').emit('admin_update', {
    type: 'admin_update',
    timestamp: new Date().toISOString(),
    ...data
  });
  
  console.log(`📡 Emitted admin_update:`, data);
}

/**
 * Broadcast to all connected clients
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
function broadcast(event, data) {
  if (!io) return;
  
  io.emit(event, {
    timestamp: new Date().toISOString(),
    ...data
  });
  
  console.log(`📢 Broadcasted ${event} to all clients`);
}

module.exports = {
  initializeWebSocket,
  getIO,
  emitCollectionUpdate,
  emitStatsUpdate,
  emitNotification,
  emitResidentNotification,
  emitAdminUpdate,
  broadcast
};
