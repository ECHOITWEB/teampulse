const jwt = require('jsonwebtoken');
const db = require('./database');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware for socket connections
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [user] = await db.query(
          'SELECT id, email, name FROM users WHERE id = ?',
          [decoded.userId]
        );

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.user.email} connected`);

      // Join user's personal room for notifications
      socket.join(`user_${socket.userId}`);

      // Handle joining objective rooms for comments
      socket.on('objective:join', async (objectiveId) => {
        try {
          // Verify user has access to this objective
          const [objective] = await db.query(
            'SELECT * FROM objectives WHERE id = ?',
            [objectiveId]
          );

          if (!objective) {
            socket.emit('error', { message: 'Objective not found' });
            return;
          }

          socket.join(`objective_${objectiveId}`);
          socket.emit('objective:joined', { objectiveId });
        } catch (error) {
          console.error('Error joining objective:', error);
          socket.emit('error', { message: 'Failed to join objective' });
        }
      });

      // Handle leaving objective rooms
      socket.on('objective:leave', (objectiveId) => {
        socket.leave(`objective_${objectiveId}`);
      });

      // Handle comment typing indicators
      socket.on('comment:typing', ({ objectiveId }) => {
        socket.to(`objective_${objectiveId}`).emit('comment:typing', {
          userId: socket.userId,
          userName: socket.user.name,
          objectiveId
        });
      });

      socket.on('comment:stopTyping', ({ objectiveId }) => {
        socket.to(`objective_${objectiveId}`).emit('comment:stopTyping', {
          userId: socket.userId,
          objectiveId
        });
      });

      // Handle joining meeting rooms
      socket.on('meeting:join', async (meetingId) => {
        try {
          // Verify user is participant
          const [participant] = await db.query(
            'SELECT * FROM meeting_participants WHERE meeting_id = ? AND user_id = ?',
            [meetingId, socket.userId]
          );

          if (!participant) {
            socket.emit('error', { message: 'Not authorized to join this meeting' });
            return;
          }

          socket.join(`meeting_${meetingId}`);
          socket.emit('meeting:joined', { meetingId });

          // Notify other participants
          socket.to(`meeting_${meetingId}`).emit('participant:joined', {
            userId: socket.userId,
            userName: socket.user.name,
            meetingId
          });

          // Mark attendance if meeting is in progress
          const [meeting] = await db.query(
            'SELECT status FROM meetings WHERE id = ?',
            [meetingId]
          );

          if (meeting && meeting.status === 'in_progress') {
            await db.query(
              'UPDATE meeting_participants SET attended = TRUE WHERE meeting_id = ? AND user_id = ?',
              [meetingId, socket.userId]
            );
          }
        } catch (error) {
          console.error('Error joining meeting:', error);
          socket.emit('error', { message: 'Failed to join meeting' });
        }
      });

      // Handle leaving meeting rooms
      socket.on('meeting:leave', (meetingId) => {
        socket.leave(`meeting_${meetingId}`);
        socket.to(`meeting_${meetingId}`).emit('participant:left', {
          userId: socket.userId,
          userName: socket.user.name,
          meetingId
        });
      });

      // Handle real-time note updates
      socket.on('note:typing', ({ meetingId, noteId }) => {
        socket.to(`meeting_${meetingId}`).emit('note:typing', {
          userId: socket.userId,
          userName: socket.user.name,
          noteId
        });
      });

      socket.on('note:stopTyping', ({ meetingId, noteId }) => {
        socket.to(`meeting_${meetingId}`).emit('note:stopTyping', {
          userId: socket.userId,
          noteId
        });
      });

      // Handle cursor position for collaborative editing
      socket.on('cursor:update', ({ meetingId, noteId, position }) => {
        socket.to(`meeting_${meetingId}`).emit('cursor:update', {
          userId: socket.userId,
          userName: socket.user.name,
          noteId,
          position
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.user.email} disconnected`);
        
        // Notify all rooms the user was in
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('meeting_')) {
            socket.to(room).emit('participant:disconnected', {
              userId: socket.userId,
              userName: socket.user.name
            });
          }
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  // Method to emit events from controllers
  emitToMeeting(meetingId, event, data) {
    this.io.to(`meeting_${meetingId}`).emit(event, data);
  }

  emitToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  emitToObjective(objectiveId, event, data) {
    this.io.to(`objective_${objectiveId}`).emit(event, data);
  }

  // Get connected users in a meeting
  async getConnectedUsers(meetingId) {
    const room = this.io.sockets.adapter.rooms.get(`meeting_${meetingId}`);
    if (!room) return [];

    const connectedUsers = [];
    for (const socketId of room) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket && socket.user) {
        connectedUsers.push({
          userId: socket.userId,
          name: socket.user.name,
          email: socket.user.email
        });
      }
    }

    return connectedUsers;
  }
}

module.exports = SocketHandler;