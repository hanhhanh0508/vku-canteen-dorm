const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const Redis = require('ioredis');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const statusRoutes = require('./routes/statusRoutes');

// Import socket handler
const initCanteenSocket = require('./sockets/canteenSocket');

const app = express();
const server = http.createServer(app);

// 1. Cấu hình Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

// 2. Cấu hình Redis với cơ chế bắt lỗi và ngắt vòng lặp retry
try {
  const redisOptions = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null // Không retry khi sai thông tin để tránh spam log
  };

  const pubClient = new Redis(redisOptions);
  const subClient = pubClient.duplicate();

  pubClient.on('error', () => {});
  subClient.on('error', () => {});

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Kết nối Redis Adapter THÀNH CÔNG');
    })
    .catch(() => {
      console.warn('⚠️ Redis Cloud xác thực thất bại. Hệ thống tự động chuyển sang In-memory Socket.');
    });
} catch (err) {
  console.warn('⚠️ Bỏ qua Redis Adapter, chạy Socket.io mặc định.');
}

// Gắn io vào Express app để các controller có thể emit sự kiện
app.set('io', io);

// Khởi chạy socket logic
initCanteenSocket(io);

// 3. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 4. Routes
app.use('/api/auth', authRoutes);
app.use('/api/status', statusRoutes);

app.get('/', (req, res) => {
  res.send('VKU Canteen & Dorm Delivery API đang hoạt động!');
});

// 5. Kết nối MongoDB & Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000
  })
  .then(() => {
    console.log('✅ 1. Kết nối MongoDB Atlas THÀNH CÔNG!');
  })
  .catch((err) => {
    console.error('❌ Lỗi kết nối MongoDB Atlas (kiểm tra lại DNS 8.8.8.8 hoặc mạng Wi-Fi):', err.message);
  });