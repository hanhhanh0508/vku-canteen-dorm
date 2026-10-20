const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// 1. Kết nối MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('\x1b[32m%s\x1b[0m', '✅ 1. Kết nối MongoDB Atlas THÀNH CÔNG!'))
  .catch((err) => console.error('\x1b[31m%s\x1b[0m', '❌ Lỗi kết nối MongoDB:', err.message));

// 2. Kết nối Redis Cloud
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: 'default',
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 0,
  retryStrategy(times) {
    if (times > 2) return null;
    return Math.min(times * 500, 2000);
  }
});

redis.on('ready', () => {
  console.log('\x1b[32m%s\x1b[0m', '✔ 2. Kết nối Redis Cloud THÀNH CÔNG!');
});

redis.on('error', (err) => {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️ Trạng thái Redis:', err.message);
});

// 3. Gắn tuyến đường Auth
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});