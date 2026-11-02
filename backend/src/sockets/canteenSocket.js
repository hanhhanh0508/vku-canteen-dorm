/**
 * Quản lý các kết nối và sự kiện thời gian thực (Real-time) cho Căn tin và Menu
 */
const initCanteenSocket = (io) => {
  // Namespace hoặc logic lắng nghe sự kiện chung
  io.on('connection', (socket) => {
    console.log(`⚡ [Socket.io] Client đã kết nối: ${socket.id}`);

    // Cho phép client tham gia vào phòng riêng của một Căn tin cụ thể
    socket.on('canteen:join', (canteenId) => {
      const room = `canteen_${canteenId}`;
      socket.join(room);
      console.log(`📌 Socket ${socket.id} đã tham gia phòng: ${room}`);
    });

    // Cho phép client rời phòng
    socket.on('canteen:leave', (canteenId) => {
      const room = `canteen_${canteenId}`;
      socket.leave(room);
      console.log(`🚪 Socket ${socket.id} đã rời phòng: ${room}`);
    });

    // Lắng nghe khi client ngắt kết nối
    socket.on('disconnect', (reason) => {
      console.log(`❌ [Socket.io] Client đã ngắt kết nối: ${socket.id} (Lý do: ${reason})`);
    });
  });
};

module.exports = initCanteenSocket;