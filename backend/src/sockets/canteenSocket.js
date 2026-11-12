/**
 * Quản lý các kết nối và sự kiện thời gian thực (Real-time)
 * Tích hợp cả Phase 2 (Trạng thái Căn tin/Menu) & Module 3 (Đặt hàng KTX & Giao hàng)
 */
const initCanteenSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ [Socket.io] Client đã kết nối: ${socket.id}`);

    // ==========================================
    // 1. THAM GIA / RỜI PHÒNG (ROOMS)
    // ==========================================

    // Căn tin tham gia phòng quản lý của quán (Hỗ trợ cả tên sự kiện Phase 2 & Module 3)
    const handleJoinCanteen = (canteenId) => {
      if (canteenId) {
        const room = `canteen_${canteenId}`;
        socket.join(room);
        console.log(`🏪 Socket ${socket.id} đã vào phòng: ${room}`);
      }
    };
    socket.on('canteen:join', handleJoinCanteen);
    socket.on('join_canteen_room', handleJoinCanteen);

    socket.on('canteen:leave', (canteenId) => {
      if (canteenId) {
        const room = `canteen_${canteenId}`;
        socket.leave(room);
        console.log(`🚪 Socket ${socket.id} đã rời phòng: ${room}`);
      }
    });

    // Sinh viên tham gia phòng cá nhân để nhận trạng thái đơn hàng (Lệ)
    socket.on('join_student_room', (studentId) => {
      if (studentId) {
        socket.join(`student_${studentId}`);
        console.log(`🎓 Socket ${socket.id} đã vào phòng: student_${studentId}`);
      }
    });

    // Shipper KTX tham gia phòng chung để săn đơn sẵn sàng giao (Hạnh)
    socket.on('join_shipper_room', () => {
      socket.join('shippers_dorm_vku');
      console.log(`🛵 Socket ${socket.id} đã vào phòng: shippers_dorm_vku`);
    });

    // ==========================================
    // 2. SỰ KIỆN REALTIME MODULE 3 (ORDERS)
    // ==========================================

    // Sự kiện 1: Sinh viên (Lệ) tạo đơn hàng mới -> Báo cho Căn tin (Huyền)
    socket.on('new_order_created', (orderData) => {
      const { canteenId, orderId, dormBuilding, roomNumber } = orderData;
      if (canteenId) {
        io.to(`canteen_${canteenId}`).emit('receive_new_order', {
          message: `Có đơn hàng KTX mới (#${orderId}) tại ${dormBuilding} - Phòng ${roomNumber}!`,
          order: orderData,
          timestamp: new Date()
        });
      }
    });

    // Sự kiện 2: Căn tin (Huyền) đổi trạng thái đơn -> Báo cho Shipper (Hạnh) & Sinh viên (Lệ)
    socket.on('order_status_updated', (updateData) => {
      const { orderId, studentId, status, canteenName, dormBuilding, roomNumber } = updateData;

      // Cập nhật trạng thái đơn mới nhất cho Sinh viên đặt hàng
      if (studentId) {
        io.to(`student_${studentId}`).emit('order_status_changed', {
          message: `Đơn hàng #${orderId} của bạn đã chuyển sang trạng thái: ${status}`,
          orderId,
          status,
          timestamp: new Date()
        });
      }

      // Nếu trạng thái là 'Sẵn sàng giao', phát tín hiệu ngay lập tức tới đội ngũ Shipper KTX
      if (status === 'Sẵn sàng giao') {
        io.to('shippers_dorm_vku').emit('order_ready_for_delivery', {
          message: `Đơn mới sẵn sàng giao tại ${canteenName} -> Giao tới ${dormBuilding} (${roomNumber})`,
          order: updateData,
          timestamp: new Date()
        });
      }
    });

    // ==========================================
    // 3. NGẮT KẾT NỐI
    // ==========================================
    socket.on('disconnect', (reason) => {
      console.log(`❌ [Socket.io] Client đã ngắt kết nối: ${socket.id} (Lý do: ${reason})`);
    });
  });
};

module.exports = initCanteenSocket;