const APP_CONSTANTS = require('../../public/js/constants');
const { SOCKET_EVENTS, ORDER_STATUS } = APP_CONSTANTS;

const initCanteenSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ [Socket.io] Client đã kết nối: ${socket.id}`);

    // 1. Tham gia phòng theo vai trò / ID
    const handleJoinCanteen = (canteenId) => {
      if (canteenId) {
        socket.join(`canteen_${canteenId}`);
        console.log(`🏪 Socket ${socket.id} đã vào phòng: canteen_${canteenId}`);
      }
    };
    socket.on('canteen:join', handleJoinCanteen);
    socket.on('join_canteen_room', handleJoinCanteen);

    socket.on('canteen:leave', (canteenId) => {
      if (canteenId) {
        socket.leave(`canteen_${canteenId}`);
        console.log(`🚪 Socket ${socket.id} đã rời phòng: canteen_${canteenId}`);
      }
    });

    socket.on('join_student_room', (studentId) => {
      if (studentId) {
        socket.join(`student_${studentId}`);
        console.log(`🎓 Socket ${socket.id} đã vào phòng: student_${studentId}`);
      }
    });

    socket.on('join_shipper_room', () => {
      socket.join('shippers_dorm_vku');
      console.log(`🛵 Socket ${socket.id} đã vào phòng: shippers_dorm_vku`);
    });

    // 2. Sự kiện 1: Sinh viên tạo đơn hàng mới -> Báo cho Căn tin
    socket.on(SOCKET_EVENTS.ORDER_CREATED, (orderData) => {
      const { canteenId, orderId, dormBuilding, roomNumber } = orderData;
      if (canteenId) {
        io.to(`canteen_${canteenId}`).emit(SOCKET_EVENTS.ORDER_CREATED, {
          message: `Có đơn hàng KTX mới (#${orderId}) tại ${dormBuilding} - Phòng ${roomNumber}!`,
          order: orderData,
          timestamp: new Date()
        });
      }
    });

    // 3. Sự kiện 2: Đổi trạng thái đơn -> Báo cho Sinh viên & Shipper
    socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, (updateData) => {
      const { orderId, studentId, status, canteenName, dormBuilding, roomNumber } = updateData;

      // Báo cập nhật trạng thái cho Sinh viên
      if (studentId) {
        io.to(`student_${studentId}`).emit(SOCKET_EVENTS.ORDER_STATUS_UPDATED, {
          message: `Đơn hàng #${orderId} của bạn đã chuyển sang trạng thái: ${status}`,
          orderId,
          status,
          timestamp: new Date()
        });
      }

      // Nếu trạng thái là 'Sẵn sàng giao', phát sự kiện 'order_ready' cho Shipper KTX
      if (status === ORDER_STATUS.READY) {
        io.to('shippers_dorm_vku').emit(SOCKET_EVENTS.ORDER_READY, {
          message: `Đơn mới sẵn sàng giao tại ${canteenName} -> Giao tới ${dormBuilding} (${roomNumber})`,
          order: updateData,
          timestamp: new Date()
        });
      }

      // Nếu trạng thái là 'Hoàn thành', phát sự kiện 'order_completed'
      if (status === ORDER_STATUS.COMPLETED && studentId) {
        io.to(`student_${studentId}`).emit(SOCKET_EVENTS.ORDER_COMPLETED, {
          message: `Đơn hàng #${orderId} đã giao hoàn tất!`,
          orderId,
          timestamp: new Date()
        });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ [Socket.io] Client đã ngắt kết nối: ${socket.id} (Lý do: ${reason})`);
    });
  });
};

module.exports = initCanteenSocket;