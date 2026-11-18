// File quy ước hằng số dùng chung cho toàn bộ dự án VKU Canteen & Dorm
const APP_CONSTANTS = {
  API_BASE_URL: 'http://localhost:5000/api',

  // Key lưu trong localStorage sau khi đăng nhập
  STORAGE_KEYS: {
    TOKEN: 'token',
    USER: 'user'
  },

  // 4 Vai trò người dùng
  ROLES: {
    STUDENT: 'student',
    CANTEEN_OWNER: 'canteen_owner',
    SHIPPER: 'shipper',
    ADMIN: 'admin'
  },

  // Đường dẫn 4 trang giao diện trong thư mục public/
  PAGES: {
    LOGIN: '/index.html',
    STUDENT: '/student.html',
    CANTEEN: '/canteen.html',
    ADMIN_SHIPPER: '/admin-shipper.html'
  },

  // Các trạng thái đơn hàng (Khớp 100% với enum trong Order.js)
  ORDER_STATUS: {
    PENDING: 'Chờ xác nhận',
    PREPARING: 'Đang chế biến',
    READY: 'Sẵn sàng giao',
    DELIVERING: 'Đang giao',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy'
  },

  // Tên các sự kiện Socket.io Real-time 3 chặng
  SOCKET_EVENTS: {
    ORDER_CREATED: 'order_created',
    ORDER_READY: 'order_ready',
    ORDER_COMPLETED: 'order_completed',
    ORDER_STATUS_UPDATED: 'order_status_updated'
  }
};

// Dòng này giúp file chạy được trên cả Node.js (Backend) lẫn Trình duyệt (Frontend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APP_CONSTANTS;
}