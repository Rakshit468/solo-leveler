export default function socketHandler(io) {
  io.on('connection', (socket) => {
    console.log(`📡 User connected: ${socket.id}`);

    // Join user to their personal room
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined their room`);
    });

    // Handle quest completion broadcast
    socket.on('questCompleted', (data) => {
      socket.broadcast.emit('questCompleted', data);
    });

    // Handle level up broadcast
    socket.on('levelUp', (data) => {
      socket.broadcast.emit('levelUp', data);
    });

    // Handle leaderboard updates
    socket.on('updateLeaderboard', () => {
      io.emit('leaderboardUpdate');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`📡 User disconnected: ${socket.id}`);
    });
  });

  return io;
}