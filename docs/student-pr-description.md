# Pull Request: Phân hệ Sinh viên đặt hàng KTX (Tuần 3 — Module 4 + Frontend)

* **Người thực hiện:** Lệ (Đảm nhận 25% khối lượng đồ án)
* **Nhánh nguồn:** `feature/fe-student-order`
* **Nhánh đích:** `main`

---

## 1. Mục tiêu công việc
* Hoàn thiện Backend: Xác thực và kiểm tra chặt chẽ dữ liệu đặt hàng KTX (Tòa nhà VKU, Số phòng, SĐT nhận hàng), chặn đặt món khi hết hàng (`isAvailable = false`), bảo mật gắn quyền `student` và tính tổng tiền từ Database.
* Hoàn thiện API chi tiết đơn hàng `GET /api/orders/:id` với cơ chế phân quyền RBAC nghiêm ngặt (chặn sinh viên xem trộm đơn của người khác bằng mã 403).
* Xây dựng giao diện Frontend chuyên biệt cho Sinh viên (`student.html`, `student.js`, `student.css`) đáp ứng chuẩn Responsive (Desktop 2 cột, Mobile xếp dọc) và tuân thủ bảng màu Design Tokens cố định của dự án.
* Tích hợp sự kiện Real-time Socket.io (`join_student_room`, `order_status_changed`) để tự động cập nhật trạng thái đơn hàng tức thì trên giao diện mà không cần tải lại trang.

---

## 2. Danh sách File thay đổi & tạo mới

### A. Backend & Kiểm thử
1. `backend/src/validators/orderValidator.js` *(Tạo mới)*:
   - Danh sách Tòa KTX hợp lệ: `['Khu A', 'Khu B', 'Khu K', 'Tòa A', 'Tòa B', 'Tòa K']`.
   - Middleware `validateCreateOrderInput` kiểm tra định dạng `canteenId`, `items`, `dormBlock`, `roomNumber`, `phone` (10 số chuẩn VN), `note` (tối đa 200 ký tự).
2. `backend/src/controllers/orderController.js` *(Cập nhật)*:
   - `createOrder`: Chặn món hết hàng (`isAvailable: false`), bảo mật gắn `student: req.user._id`, tính `totalAmount` từ DB, emit Socket `order:new`.
   - `getOrderById`: Chặn sinh viên xem đơn người khác (trả 403), populate đầy đủ `student`, `canteen`, `items.food`.
3. `backend/src/routes/orderRoutes.js` *(Cập nhật)*:
   - Gắn middleware validate vào tuyến đường `POST /api/orders`.
4. `backend/tests/orderValidator.test.js` *(Tạo mới)*:
   - Bộ 9 test case tự động kiểm tra tính đúng đắn của dữ liệu đầu vào.
5. `backend/package.json` *(Cập nhật)*:
   - Bổ sung lệnh chạy test: `"test:order-validator": "node tests/orderValidator.test.js"`.

### B. Frontend Phân hệ Sinh viên
1. `backend/public/student.html` *(Tạo mới)*:
   - Header hiển thị thông tin sinh viên + nút đăng xuất.
   - Cột trái: Bộ chọn Căn tin, tìm kiếm, lọc danh mục, danh sách thẻ món ăn (ảnh, tên, giá, mô tả, nút thêm giỏ).
   - Cột phải: Giỏ hàng mini sticky + form thông tin giao hàng KTX.
   - Dưới cùng: Bảng "Đơn hàng của tôi" với badge trạng thái cố định và Bootstrap Modal xem chi tiết.
2. `backend/public/js/student.js` *(Tạo mới)*:
   - Tách bạch 12 hàm chức năng: `getToken()`, `checkAuth()`, `loadCanteens()`, `loadCategories()`, `loadFoods()`, `addToCart()`, `updateCartUI()`, `calculateTotal()`, `placeOrder()`, `loadMyOrders()`, `viewOrderDetail()`, `showToast()`.
   - Tích hợp Socket.io: `join_student_room` và đón sự kiện `order_status_changed`.
3. `backend/public/css/student.css` *(Tạo mới)*:
   - Khai báo và sử dụng duy nhất bảng màu Design Tokens qua các biến CSS: `--vk-primary`, `--vk-primary-dark`, `--vk-bg`, `--vk-surface`, `--vk-border`, `--vk-text`, `--vk-text-muted`, `--vk-success`, `--vk-warning`, `--vk-info`, `--vk-danger`.

---

## 3. Hướng dẫn Kiểm thử (How to test)

### Bước 1: Chạy Unit Test Backend
```bash
cd backend
npm run test:order-validator
```
*Kết quả kỳ vọng: 9/9 Test cases PASS.*

### Bước 2: Test API qua Postman
* Import file `postman/VKU-Canteen-Student.postman_collection.json`.
* Chạy theo thứ tự: Đăng nhập sinh viên ➔ Lấy Căn tin/Thực đơn ➔ Đặt đơn hợp lệ ➔ Test các case lỗi (sai KTX, hết món, xem đơn người khác 403).

### Bước 3: Test Giao diện Web
1. Khởi động server: `npm run dev` tại thư mục `backend/`.
2. Mở trình duyệt: `http://localhost:5000/student.html`.
3. Kiểm tra các chức năng: chọn quán, lọc món, thêm vào giỏ, đặt hàng, xem chi tiết trên modal và kiểm tra trạng thái nhảy tự động khi Căn tin/Shipper đổi trạng thái.

---

## 4. Checklist Review (Dành cho Trưởng nhóm Hạnh)

- [ ] Các route và controller của Căn tin, Shipper, Auth không bị ảnh hưởng.
- [ ] Backend đã chạy kiểm tra cú pháp `node --check` không có lỗi.
- [ ] Không có mã màu tùy tiện ngoài bảng Design Tokens đã thỏa thuận.
- [ ] Validation KTX bắt đúng các tòa `Khu A`, `Khu B`, `Khu K`.
- [ ] Quyền xem đơn hàng RBAC bảo mật đúng quy định (Sinh viên không xem được đơn của bạn khác).
- [ ] Postman Collection đã được xuất và gom biến đầy đủ.

---

## 5. ⚠️ Ghi chú đặc biệt khi Merge vào Main
* Để mở được giao diện tĩnh `student.html` tại cổng 5000, file `backend/src/server.js` **cần đảm bảo có dòng cấu hình express.static cho thư mục public**:
  ```javascript
  app.use(express.static(path.join(__dirname, '../public')));
  ```
  *(Dòng này thuộc phạm vi bạn Hưng phụ trách cấu hình chính thức ở Bước 1 của Tuần 3).*
