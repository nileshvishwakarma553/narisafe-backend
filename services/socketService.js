let ioInstance = null;

export const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    // Client joins their personal user room
    socket.on('join_user_room', (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        socket.join(`monitor:${userId}`);
      }
    });

    // Guardian joins monitoring room for their assigned ward
    socket.on('monitor_user', ({ guardianId, wardId }) => {
      if (wardId) {
        socket.join(`monitor:${wardId}`);
      }
    });

    // Real-time location broadcast from user
    socket.on('live_location_ping', (data) => {
      if (data && data.userId) {
        io.to(`monitor:${data.userId}`).emit('guardian_location_update', data);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
};

export const getIO = () => ioInstance;

export const notifyGuardiansOfSOS = (emergencyData) => {
  if (ioInstance && emergencyData && emergencyData.userId) {
    const userId = emergencyData.userId._id || emergencyData.userId;
    // Broadcast to the user's specific monitor room
    ioInstance.to(`monitor:${userId}`).emit('emergency_sos_alert', emergencyData);
    // Also broadcast to admin room
    ioInstance.to('admin_room').emit('admin_emergency_alert', emergencyData);
    // Broadcast to the user room for cross-device notification
    ioInstance.to(`user:${userId}`).emit('user_sos_confirmed', emergencyData);
  }
};

export const notifySafetyStatusChange = (userId, status, user) => {
  if (ioInstance && userId) {
    ioInstance.to(`monitor:${userId}`).emit('safety_status_updated', {
      userId,
      safetyStatus: status,
      user,
      updatedAt: new Date().toISOString(),
    });
  }
};

export const broadcastLocationUpdate = (userId, locationData) => {
  if (ioInstance && userId) {
    ioInstance.to(`monitor:${userId}`).emit('guardian_location_update', {
      userId,
      ...locationData,
      updatedAt: new Date().toISOString(),
    });
  }
};
