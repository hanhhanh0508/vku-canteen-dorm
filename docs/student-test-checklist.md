# Bảng Kiểm thử Chi tiết (Test Checklist) — Phân hệ Sinh viên
**Dự án:** VKU Canteen & Dorm Delivery  
**Thành viên phụ trách:** Lệ (`feature/fe-student-order`)

Tài liệu này dùng để nhóm tổng duyệt toàn diện trước buổi báo cáo nghiệm thu Tuần 3 và demo cuối kỳ.

---

## 1. Kiểm thử Đăng nhập & Điều hướng (Authentication & Routing)

- [ ] **TC-AUTH-01:** Truy cập trực tiếp `http://localhost:5000/student.html` khi chưa đăng nhập (không có token trong localStorage) ➔ Hệ thống tự động chuyển hướng về `/index.html`.
- [ ] **TC-AUTH-02:** Đăng nhập với tài khoản role khác (vd: `canteen_owner` hoặc `shipper`) rồi mở `student.html` ➔ Hệ thống hiển thị Toast lỗi quyền hạn và điều hướng về `/index.html`.
- [ ] **TC-AUTH-03:** Đăng nhập với tài khoản role `student` ➔ Trang tải thành công, header hiển thị đúng tên sinh viên.
- [ ] **TC-AUTH-04:** Bấm nút **"Đăng xuất"** trên header ➔ LocalStorage bị xóa sạch token và user, trang quay về `/index.html`.

---

## 2. Kiểm thử Dữ liệu Căn tin, Thực đơn & Giỏ hàng

- [ ] **TC-MENU-01:** Danh sách Căn tin tự động nạp từ API `GET /api/canteens`.
- [ ] **TC-MENU-02:** Khi chọn 1 Căn tin, dropdown Danh mục và Lưới món ăn tự động cập nhật theo quán đó.
- [ ] **TC-MENU-03:** Nếu Căn tin có trạng thái `isOpen = false` ➔ Hiển thị banner cảnh báo quán đóng cửa, nút đặt hàng bị khóa.
- [ ] **TC-MENU-04:** Ô tìm kiếm: Nhập từ khóa tên món ➔ Danh sách món ăn tự động lọc ngay lập tức mà không reload trang.
- [ ] **TC-MENU-05:** Bấm **"Thêm vào giỏ"** ➔ Món ăn xuất hiện trong giỏ hàng mini, số lượng và tổng tiền nhảy chuẩn xác.
- [ ] **TC-MENU-06:** Tăng/giảm số lượng món (`+`, `-`) hoặc xóa món (`x`) ➔ Giỏ hàng và tổng tiền cập nhật tự động.
- [ ] **TC-MENU-07:** Khi giỏ hàng có món của Căn tin A nhưng bấm thêm món ở Căn tin B ➔ Hiển thị hộp thoại xác nhận đổi giỏ hàng.

---

## 3. Kiểm thử Validation Thông tin Giao hàng KTX (Backend & Frontend)

- [ ] **TC-VAL-01 (Tòa KTX):** 
  - Chọn tòa hợp lệ: `Khu A`, `Khu B`, `Khu K`, `Tòa A`, `Tòa B`, `Tòa K` ➔ Chấp nhận.
  - Gửi tòa không hợp lệ (vd: `Khu C`) qua Postman/API ➔ Backend trả lỗi 400: *"Tòa KTX không hợp lệ. Vui lòng chọn Khu A, Khu B hoặc Khu K."*
- [ ] **TC-VAL-02 (Số phòng KTX):**
  - Nhập định dạng hợp lệ (vd: `P.302`, `102`, `A204`) ➔ Chấp nhận.
  - Nhập rỗng hoặc vượt quá 20 ký tự ➔ Bị chặn ngay tại form.
  - Chèn mã script nguy hiểm `<script>` ➔ Backend chặn trả mã 400: *"Số phòng KTX chứa ký tự không hợp lệ!"*
- [ ] **TC-VAL-03 (Số điện thoại):**
  - Nhập 10 chữ số bắt đầu bằng 0 (vd: `0901234567`, `0381234567`) ➔ Chấp nhận.
  - Nhập 9 số, 11 số, chữ cái hoặc không bắt đầu bằng số 0 ➔ Bị chặn với thông báo yêu cầu nhập SĐT Việt Nam 10 số.
- [ ] **TC-VAL-04 (Món hết hàng):**
  - Món ăn có `isAvailable = false` ➔ Nút trên thẻ hiển thị disabled "Hết món".
  - Nếu cố tình gửi request đặt món hết hàng ➔ Backend trả lỗi 400: *"Món '<tên món>' hiện đã hết món."*

---

## 4. Kiểm thử Phân quyền Chi tiết Đơn hàng (RBAC)

- [ ] **TC-RBAC-01:** Sinh viên bấm **"Xem chi tiết"** đơn hàng của chính mình ➔ Modal mở lên, hiển thị đúng mã đơn, địa chỉ phòng KTX, danh sách món và tổng tiền (Kỳ vọng 200 OK).
- [ ] **TC-RBAC-02:** Sinh viên dùng token của mình gọi API xem ID đơn của một sinh viên khác (`GET /api/orders/<id_nguoi_khac>`) ➔ Backend chặn trả về mã **403 Forbidden**: *"Bạn không có quyền xem đơn hàng này."*
- [ ] **TC-RBAC-03:** Gọi chi tiết đơn với ID không tồn tại ➔ Backend trả về mã **404 Not Found**: *"Không tìm thấy đơn hàng."*

---

## 5. Kiểm thử Socket.io Real-time

- [ ] **TC-SOCK-01:** Mở trang `student.html`, kiểm tra Console trình duyệt ➔ Thấy log: `⚡ [Socket.io] Sinh viên đã kết nối` và `🎓 [Socket.io] Đã tham gia phòng: student_<id>`.
- [ ] **TC-SOCK-02:** Khi server hoặc mạng bị ngắt kết nối ➔ Hiển thị Toast cảnh báo: *"Mất kết nối thời gian thực."*
- [ ] **TC-SOCK-03:** Khi server online trở lại ➔ Socket tự động kết nối lại (reconnect) và tự động vào lại room `student_<id>`.

---

## 6. Kịch bản Kiểm thử Demo 3 Tab Trình duyệt (Chạy thử nghiệm toàn nhóm)

Mục đích: Chứng minh luồng dữ liệu 3 chặng khép kín giữa Sinh viên (Lệ), Căn tin (Huyền) và Shipper (Hạnh).

1. **Chuẩn bị 3 tab song song:**
   - **Tab 1:** Đăng nhập tài khoản Sinh viên (Lệ) tại `http://localhost:5000/student.html`.
   - **Tab 2:** Đăng nhập tài khoản Chủ Căn tin (Huyền) tại `http://localhost:5000/canteen.html`.
   - **Tab 3:** Đăng nhập tài khoản Shipper (Hạnh) tại `http://localhost:5000/admin-shipper.html`.

2. **Các bước thực hiện:**
   - **Bước 1:** Tại **Tab 1**, Lệ chọn món tại Căn tin, chọn tòa `Khu A`, phòng `P.302`, SĐT `0901234567` và bấm **"Đặt hàng ngay"**.
     * *Quan sát Tab 1:* Xuất hiện đơn mới trên bảng "Đơn hàng của tôi" với trạng thái `Chờ xác nhận`.
     * *Quan sát Tab 2:* Căn tin Huyền nhận được popup chuông báo đơn mới mà không cần F5.
   - **Bước 2:** Tại **Tab 2**, Căn tin bấm nút chuyển đơn sang **"Đang chế biến"** rồi bấm **"Sẵn sàng giao"**.
     * *Quan sát Tab 1:* Dòng trạng thái đơn của Lệ tự động nhảy sang màu xanh `Sẵn sàng giao`, đồng thời hiện popup Toast thông báo.
     * *Quan sát Tab 3:* Shipper Hạnh nhận được thông báo có đơn mới sẵn sàng giao từ Căn tin.
   - **Bước 3:** Tại **Tab 3**, Shipper Hạnh bấm **"Nhận đơn"** (chuyển sang `Đang giao`), sau khi giao xong bấm **"Hoàn tất giao"** (`Hoàn thành`).
     * *Quan sát Tab 1:* Dòng trạng thái của Sinh viên Lệ ngay lập tức đổi sang `Hoàn thành` (màu xanh lá) và nhận Toast thông báo đơn hàng đã giao thành công.
