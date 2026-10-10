const dns = require('dns'); // 1. Khai báo thư viện dns ở đầu file
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();
app.use(express.json());

// 1. Kiểm tra kết nối MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ 1. Kết nối MongoDB Atlas THÀNH CÔNG!'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err.message));

// 2. Kiểm tra kết nối Redis Cloud
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

redis.on('connect', () => console.log('✅ 2. Kết nối Redis Cloud THÀNH CÔNG!'));
redis.on('error', (err) => console.error('❌ Lỗi kết nối Redis:', err.message));

// Route test
app.get('/', (req, res) => {
  res.send('API VKU Canteen & Dorm đang hoạt động!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});