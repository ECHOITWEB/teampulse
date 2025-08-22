class EnhancedSocketHandler {
  constructor(io) {
    this.io = io;
    this.activeUsers = new Map(); // userId -> socketId mapping
    this.userSessions = new Map(); // socketId -> user data
    
    this.initialize();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log('New socket connection:', socket.id);

      // Authentication
      socket.on('authenticate', async (data) => {
        try {
          const { userId, token } = data;
          
          // Store user session
          this.activeUsers.set(userId, socket.id);
          this.userSessions.set(socket.id, { userId, joinedAt: new Date() });

          // Join user-specific room
          socket.join(`user_${userId}`);

          // Join team rooms
          const teams = await this.getUserTeams(userId);
          teams.forEach(team => {
            socket.join(`team_${team.id}`);
          });

          socket.emit('authenticated', { success: true });

          // Notify team members of user coming online
          this.broadcastUserStatus(userId, 'online');
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('authenticated', { success: false, error: error.message });
        }
      });

      // Real-time collaboration events
      socket.on('join:objective', (objectiveId) => {
        socket.join(`objective_${objectiveId}`);
      });

      socket.on('leave:objective', (objectiveId) => {
        socket.leave(`objective_${objectiveId}`);
      });

      socket.on('join:task', (taskId) => {
        socket.join(`task_${taskId}`);
        // Notify others that someone is viewing this task
        socket.to(`task_${taskId}`).emit('user:viewing', {
          taskId,
          userId: this.userSessions.get(socket.id)?.userId
        });
      });

      socket.on('leave:task', (taskId) => {
        socket.leave(`task_${taskId}`);
        socket.to(`task_${taskId}`).emit('user:stopped_viewing', {
          taskId,
          userId: this.userSessions.get(socket.id)?.userId
        });
      });

      // Real-time updates
      socket.on('task:update', (data) => {
        const { taskId, updates } = data;
        // Broadcast to all users watching this task
        socket.to(`task_${taskId}`).emit('task:updated', {
          taskId,
          updates,
          updatedBy: this.userSessions.get(socket.id)?.userId
        });
      });

      socket.on('comment:typing', (data) => {
        const { taskId, isTyping } = data;
        socket.to(`task_${taskId}`).emit('comment:typing', {
          taskId,
          userId: this.userSessions.get(socket.id)?.userId,
          isTyping
        });
      });

      // Capacity updates
      socket.on('capacity:update', (data) => {
        const { teamId, date, updates } = data;
        socket.to(`team_${teamId}`).emit('capacity:updated', {
          date,
          updates,
          updatedBy: this.userSessions.get(socket.id)?.userId
        });
      });

      // Analytics events
      socket.on('analytics:track', (data) => {
        // Can process real-time analytics here
        this.trackAnalyticsEvent(socket, data);
      });

      // Presence management
      socket.on('presence:update', (data) => {
        const { status, currentView } = data;
        const userSession = this.userSessions.get(socket.id);
        if (userSession) {
          userSession.status = status;
          userSession.currentView = currentView;
          this.broadcastPresenceUpdate(userSession.userId, status, currentView);
        }
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        const userSession = this.userSessions.get(socket.id);
        if (userSession) {
          this.activeUsers.delete(userSession.userId);
          this.userSessions.delete(socket.id);
          this.broadcastUserStatus(userSession.userId, 'offline');
        }
        console.log('Socket disconnected:', socket.id);
      });
    });

    // Set up periodic tasks
    this.setupPeriodicTasks();
  }

  // Helper methods
  async getUserTeams(userId) {
    // This would query the database for user's teams
    // Placeholder implementation
    return [];
  }

  broadcastUserStatus(userId, status) {
    this.io.emit('user:status', { userId, status, timestamp: new Date() });
  }

  broadcastPresenceUpdate(userId, status, currentView) {
    this.io.emit('presence:update', {
      userId,
      status,
      currentView,
      timestamp: new Date()
    });
  }

  trackAnalyticsEvent(socket, data) {
    // Implementation for real-time analytics tracking
    const userSession = this.userSessions.get(socket.id);
    if (userSession) {
      // Could emit to analytics dashboard or store in time-series DB
      this.io.to('analytics').emit('event:tracked', {
        ...data,
        userId: userSession.userId,
        timestamp: new Date()
      });
    }
  }

  setupPeriodicTasks() {
    // Heartbeat to check active connections
    setInterval(() => {
      const activeCount = this.activeUsers.size;
      console.log(`Active users: ${activeCount}`);
    }, 60000); // Every minute

    // Clean up stale sessions
    setInterval(() => {
      const now = Date.now();
      this.userSessions.forEach((session, socketId) => {
        if (now - session.joinedAt > 24 * 60 * 60 * 1000) { // 24 hours
          this.io.sockets.sockets.get(socketId)?.disconnect();
        }
      });
    }, 3600000); // Every hour
  }

  // Methods for emitting events from controllers
  emitToUser(userId, event, data) {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  emitToTeam(teamId, event, data) {
    this.io.to(`team_${teamId}`).emit(event, data);
  }

  emitToObjective(objectiveId, event, data) {
    this.io.to(`objective_${objectiveId}`).emit(event, data);
  }

  emitToTask(taskId, event, data) {
    this.io.to(`task_${taskId}`).emit(event, data);
  }

  getActiveUsersInTeam(teamId) {
    const activeUsers = [];
    this.io.sockets.adapter.rooms.get(`team_${teamId}`)?.forEach(socketId => {
      const userSession = this.userSessions.get(socketId);
      if (userSession) {
        activeUsers.push({
          userId: userSession.userId,
          status: userSession.status,
          currentView: userSession.currentView
        });
      }
    });
    return activeUsers;
  }
}

module.exports = EnhancedSocketHandler;