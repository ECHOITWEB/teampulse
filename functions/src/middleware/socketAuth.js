// Middleware to ensure socket connection for real-time features
exports.ensureSocketConnection = (req, res, next) => {
  if (!req.io) {
    console.warn('Socket.IO not available in request');
  }
  next();
};

// Helper to emit events to specific users/meetings
exports.createSocketEmitters = (io) => ({
  emitToMeeting: (meetingId, event, data) => {
    io.to(`meeting_${meetingId}`).emit(event, data);
  },
  
  emitToUser: (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
  },
  
  emitToUsers: (userIds, event, data) => {
    userIds.forEach(userId => {
      io.to(`user_${userId}`).emit(event, data);
    });
  }
});