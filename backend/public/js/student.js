/**
 * backend/public/js/student.js
 * VKU Canteen & Dorm Delivery - Student Portal Client Script
 * Real API Integration, In-Page Auth States & English UI
 */

// ==========================================
// 1. GLOBAL STATE & CONFIGURATION
// ==========================================
const API_BASE = (typeof APP_CONSTANTS !== 'undefined' && APP_CONSTANTS.API_BASE_URL)
  ? APP_CONSTANTS.API_BASE_URL
  : '/api';

let currentUser = null;
let currentCanteenId = '';
let canteensList = [];
let allFoods = [];
let cart = []; // [{ foodId, name, price, image, quantity, canteenId }]
let studentSocket = null; // Socket.io Client instance
let authSessionEpoch = 0; // Epoch counter to prevent race conditions from in-flight requests
let isSubmittingOrder = false; // Submission flag to prevent duplicate order placements

// Fixed Badge and English Display mapping based on project Design Tokens
const ORDER_STATUS_MAP = Object.freeze({
  'Chờ xác nhận': { label: 'Pending confirmation', badgeClass: 'badge bg-warning text-dark' },
  'Đang chế biến': { label: 'Preparing', badgeClass: 'badge bg-warning text-dark' },
  'Sẵn sàng giao': { label: 'Ready for delivery', badgeClass: 'badge bg-info text-dark' },
  'Đang giao': { label: 'Out for delivery', badgeClass: 'badge bg-info text-dark' },
  'Hoàn thành': { label: 'Completed', badgeClass: 'badge bg-success' },
  'Đã hủy': { label: 'Cancelled', badgeClass: 'badge bg-danger' }
});

const STATUS_BADGE_MAP = {
  'Chờ xác nhận': 'badge bg-warning text-dark',
  'Đang chế biến': 'badge bg-warning text-dark',
  'Sẵn sàng giao': 'badge bg-info text-dark',
  'Đang giao': 'badge bg-info text-dark',
  'Hoàn thành': 'badge bg-success',
  'Đã hủy': 'badge bg-danger'
};

// ==========================================
// 2. INITIALIZATION FLOW
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Setup all UI interactive listeners
  setupEventListeners();

  // 2. Check current account status without redirecting
  const authStatus = getAuthStatus();
  updateAuthUI(authStatus);

  // 3. Always load public canteen data
  loadCanteens();

  // 4. If authenticated student, connect socket and load protected orders
  if (authStatus === 'student') {
    initSocket();
    loadMyOrders();
  } else {
    renderGuestOrdersState();
  }
});

// ==========================================
// 3. AUTHENTICATION HELPERS (NO REDIRECTS)
// ==========================================

function getTokenKey() {
  return (typeof APP_CONSTANTS !== 'undefined' && APP_CONSTANTS.STORAGE_KEYS)
    ? APP_CONSTANTS.STORAGE_KEYS.TOKEN
    : 'token';
}

function getUserKey() {
  return (typeof APP_CONSTANTS !== 'undefined' && APP_CONSTANTS.STORAGE_KEYS)
    ? APP_CONSTANTS.STORAGE_KEYS.USER
    : 'user';
}

function getToken() {
  const tokenKey = getTokenKey();
  return localStorage.getItem(tokenKey) || localStorage.getItem('token') || '';
}

/**
 * Determine authentication and authorization state
 * Returns: 'student' | 'unauthenticated' | 'other_role'
 */
function getAuthStatus() {
  const token = getToken();
  if (!token) {
    currentUser = null;
    return 'unauthenticated';
  }

  const userKey = getUserKey();
  try {
    const userRaw = localStorage.getItem(userKey) || localStorage.getItem('user');
    currentUser = userRaw ? JSON.parse(userRaw) : null;
  } catch (err) {
    currentUser = null;
  }

  if (!currentUser) {
    return 'unauthenticated';
  }

  if (currentUser.role && currentUser.role !== 'student') {
    return 'other_role';
  }

  return 'student';
}

/**
 * Update Navbar and form fields based on Auth state without redirecting
 */
function updateAuthUI(status) {
  const currentStatus = status || getAuthStatus();
  const userNameEl = document.getElementById('userName');
  const dormBlockEl = document.getElementById('dormBlock');
  const roomNumberEl = document.getElementById('roomNumber');
  const phoneEl = document.getElementById('phone');

  if (currentStatus === 'student' && currentUser) {
    if (userNameEl) userNameEl.textContent = currentUser.name || 'Student';

    if (dormBlockEl && currentUser.dormBlock && typeof currentUser.dormBlock === 'string') {
      dormBlockEl.value = currentUser.dormBlock.trim();
    }
    if (roomNumberEl && currentUser.roomNumber && typeof currentUser.roomNumber === 'string') {
      roomNumberEl.value = currentUser.roomNumber.trim();
    }
    if (phoneEl && currentUser.phone && typeof currentUser.phone === 'string') {
      phoneEl.value = currentUser.phone.trim();
    }
  } else if (currentStatus === 'other_role' && currentUser) {
    if (userNameEl) userNameEl.textContent = currentUser.name ? `${currentUser.name} (${currentUser.role})` : 'User';
    showToast(`You are logged in as "${currentUser.role}". The Student Portal requires a student account to order.`, 'warning');
  } else {
    // Unauthenticated (Guest)
    if (userNameEl) userNameEl.textContent = 'Guest';
    if (dormBlockEl) dormBlockEl.value = '';
    if (roomNumberEl) roomNumberEl.value = '';
    if (phoneEl) phoneEl.value = '';
  }
}

/**
 * Handle manual Sign out: clean up session in-place, do NOT redirect or reload
 */
function handleSignOut() {
  authSessionEpoch++;

  if (studentSocket) {
    studentSocket.disconnect();
    studentSocket = null;
  }

  localStorage.removeItem(getTokenKey());
  localStorage.removeItem('token');
  localStorage.removeItem(getUserKey());
  localStorage.removeItem('user');

  currentUser = null;
  cart = [];
  allFoods = [];

  closeOrderDetailModal();
  updateAuthUI('unauthenticated');
  updateCartUI();
  renderGuestFoodState();
  renderGuestOrdersState();

  showToast('Signed out successfully.', 'info');
}

/**
 * Handle 401 Unauthorized API response: clean up in-place, do NOT redirect or reload
 */
function handleUnauthorized() {
  authSessionEpoch++;

  if (studentSocket) {
    studentSocket.disconnect();
    studentSocket = null;
  }

  localStorage.removeItem(getTokenKey());
  localStorage.removeItem('token');
  localStorage.removeItem(getUserKey());
  localStorage.removeItem('user');

  currentUser = null;
  cart = [];
  allFoods = [];

  closeOrderDetailModal();
  updateAuthUI('unauthenticated');
  updateCartUI();
  renderGuestFoodState();
  renderGuestOrdersState();

  showToast('Your session has expired. Please sign in again.', 'warning');
}

/**
 * Close order details modal safely if currently open
 */
function closeOrderDetailModal() {
  const modalEl = document.getElementById('orderDetailModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
      modal.hide();
    }
  }
}

/**
 * Render unauthorized / guest prompt in food container
 */
function renderGuestFoodState() {
  const container = document.getElementById('foodListContainer');
  const countText = document.getElementById('foodCountText');
  if (!container) return;

  container.innerHTML = `
    <div class="col-12 empty-state-wrap">
      <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="12" cy="7" r="4"></circle>
        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>
      </svg>
      <div class="empty-state-title">Sign in required</div>
      <div class="empty-state-desc">Please sign in to view menu items.</div>
    </div>
  `;
  if (countText) countText.textContent = '0 items';
}

/**
 * Render unauthorized / guest prompt in orders table
 */
function renderGuestOrdersState() {
  const tbody = document.getElementById('myOrdersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Please sign in to view your order history.</td></tr>';
}

// ==========================================
// 4. GENERAL UI & LOCALIZATION HELPERS
// ==========================================

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN').format(Number(amount) || 0) + ' ₫';
}

function getStatusInfo(rawStatus) {
  return ORDER_STATUS_MAP[rawStatus] || {
    label: rawStatus || 'Unknown',
    badgeClass: STATUS_BADGE_MAP[rawStatus] || 'badge bg-secondary'
  };
}

function showToast(message, type = 'info') {
  const toastEl = document.getElementById('liveToast');
  const toastMsg = document.getElementById('toastMessage');
  if (!toastEl || !toastMsg) return;

  toastMsg.textContent = message;

  toastEl.className = 'toast align-items-center border-0';
  if (type === 'success') {
    toastEl.classList.add('text-bg-success');
  } else if (type === 'danger') {
    toastEl.classList.add('text-bg-danger');
  } else if (type === 'warning') {
    toastEl.classList.add('text-bg-warning', 'text-dark');
  } else {
    toastEl.classList.add('text-bg-info', 'text-dark');
  }

  const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3600 });
  toast.show();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Image rendering synced with student.css styles
 */
function renderFoodImage(imageUrl, name) {
  const safeName = escapeHtml(name);
  if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
    return getPlaceholderImg();
  }
  return `
    <div class="food-card-img-wrap">
      <img src="${escapeHtml(imageUrl)}" class="food-card-img" alt="${safeName}" loading="lazy" onerror="handleImageFallback(this)">
    </div>
  `;
}

function getPlaceholderImg() {
  return `
    <div class="food-card-img-placeholder" aria-label="No image available">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
        <line x1="6" y1="1" x2="6" y2="4"></line>
        <line x1="10" y1="1" x2="10" y2="4"></line>
        <line x1="14" y1="1" x2="14" y2="4"></line>
      </svg>
      <span class="mt-1">No image</span>
    </div>
  `;
}

window.handleImageFallback = function(img) {
  if (!img) return;
  img.onerror = null;
  const parent = img.parentElement;
  if (parent) {
    parent.outerHTML = getPlaceholderImg();
  }
};

/**
 * Translate backend Vietnamese validation messages to English
 */
function translateBackendMessage(msg) {
  if (!msg || typeof msg !== 'string') return 'An error occurred. Please try again.';
  const lower = msg.toLowerCase();

  if (lower.includes('đóng cửa')) {
    return 'This canteen is currently closed. Please check back later.';
  }
  if (lower.includes('tòa ktx không hợp lệ')) {
    return 'Invalid dorm building. Please select Zone A, Zone B, or Zone K.';
  }
  if (lower.includes('danh sách món đặt không được để trống')) {
    return 'Your cart is empty. Please select at least one item.';
  }
  if (lower.includes('số điện thoại không hợp lệ')) {
    return 'Invalid phone number. Please enter a 10-digit Vietnamese mobile number starting with 0 (e.g. 0901234567).';
  }
  if (lower.includes('số phòng ktx phải có độ dài')) {
    return 'Room number must be between 1 and 20 characters.';
  }
  if (lower.includes('số phòng ktx chứa ký tự không hợp lệ')) {
    return 'Room number contains invalid characters.';
  }
  if (lower.includes('ghi chú không được vượt quá')) {
    return 'Order notes cannot exceed 200 characters.';
  }
  if (lower.includes('hết món')) {
    const match = msg.match(/Món '([^']+)'/i) || msg.match(/Món "([^"]+)"/i);
    if (match && match[1]) {
      return `"${match[1]}" is currently sold out.`;
    }
    return 'One or more items in your order are currently sold out.';
  }
  if (lower.includes('không có quyền xem')) {
    return 'You do not have permission to view this order.';
  }
  if (lower.includes('không tìm thấy đơn hàng')) {
    return 'Order not found.';
  }
  if (lower.includes('đặt đơn hàng ktx thành công')) {
    return 'Order placed successfully! Waiting for canteen confirmation.';
  }
  if (lower.includes('hủy đơn hàng thành công')) {
    return 'Order cancelled successfully.';
  }

  return msg;
}

// ==========================================
// 5. REAL-TIME SOCKET.IO (STUDENT ROOM)
// ==========================================

function initSocket() {
  if (typeof io === 'undefined') {
    console.warn('⚠️ Socket.io Client not loaded, skipping Real-time.');
    return;
  }

  if (studentSocket) {
    studentSocket.disconnect();
    studentSocket = null;
  }

  const token = getToken();
  if (!token) return;

  studentSocket = io({
    auth: {
      token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
  });

  const studentId = currentUser?._id || currentUser?.id;

  studentSocket.on('connect', () => {
    console.log('⚡ [Socket.io] Student connected:', studentSocket.id);
    if (studentId) {
      studentSocket.emit('join_student_room', studentId);
      console.log(`🎓 [Socket.io] Joined room: student_${studentId}`);
    }
  });

  studentSocket.on('disconnect', (reason) => {
    console.warn('⚠️ [Socket.io] Real-time connection lost:', reason);
  });

  studentSocket.on('connect_error', (error) => {
    console.warn('⚠️ [Socket.io] Connection error:', error.message);
  });

  listenOrderEvents(studentSocket);
}

function listenOrderEvents(socket) {
  if (!socket) return;

  socket.on('order_status_changed', (payload) => {
    console.log('🔔 [Socket.io] Received order status update:', payload);
    if (!payload || !payload.orderId) return;

    const { orderId, status, message } = payload;
    const statusInfo = getStatusInfo(status);

    const row = document.getElementById(`order-row-${orderId}`) ||
      document.querySelector(`[data-order-id="${orderId}"]`);

    if (row) {
      const statusCell = row.querySelector('.order-status-cell');
      if (statusCell && status) {
        statusCell.innerHTML = `<span class="${statusInfo.badgeClass}">${escapeHtml(statusInfo.label)}</span>`;
      }

      // Preserve original 'Placed at' time (do NOT overwrite with status update timestamp)

      const detailShortEl = document.getElementById('detailOrderIdShort');
      if (detailShortEl && detailShortEl.dataset.fullId === orderId) {
        const detailBadge = document.getElementById('detailStatusBadge');
        if (detailBadge && status) {
          detailBadge.innerHTML = `<span class="${statusInfo.badgeClass} fs-6">${escapeHtml(statusInfo.label)}</span>`;
        }
      }
    } else {
      loadMyOrders();
    }

    const shortId = orderId ? orderId.slice(-6).toUpperCase() : '';
    const toastMsg = message || `Order #${shortId} status updated to: ${statusInfo.label}.`;

    let toastType = 'info';
    if (status === 'Hoàn thành') {
      toastType = 'success';
    } else if (status === 'Đã hủy') {
      toastType = 'danger';
    } else if (status === 'Chờ xác nhận' || status === 'Đang chế biến') {
      toastType = 'warning';
    }

    showToast(toastMsg, toastType);
  });
}

// ==========================================
// 6. EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Sign out (In-page cleanup without redirect or reload)
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleSignOut);
  }

  // Select Canteen
  const canteenSelect = document.getElementById('canteenSelect');
  if (canteenSelect) {
    canteenSelect.addEventListener('change', (e) => {
      currentCanteenId = e.target.value;
      handleCanteenChange(currentCanteenId);
    });
  }

  // Select Category
  const categorySelect = document.getElementById('categorySelect');
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      const categoryId = e.target.value;
      loadFoods(currentCanteenId, categoryId);
    });
  }

  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterFoodsLocally();
    });
  }

  // Order submission
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', placeOrder);
  }

  // Refresh orders button
  const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');
  if (refreshOrdersBtn) {
    refreshOrdersBtn.addEventListener('click', async () => {
      const authStatus = getAuthStatus();
      if (authStatus !== 'student') {
        showToast('Please sign in with a student account to view your orders.', 'warning');
        return;
      }
      await loadMyOrders(true);
    });
  }
}

function handleCanteenChange(canteenId) {
  const statusAlert = document.getElementById('canteenStatusAlert');
  const selected = canteensList.find(c => c._id === canteenId);

  if (selected && selected.isOpen === false) {
    if (statusAlert) statusAlert.classList.remove('d-none');
  } else {
    if (statusAlert) statusAlert.classList.add('d-none');
  }

  if (canteenId) {
    loadCategories(canteenId);
    loadFoods(canteenId);
  } else {
    renderFoodList([]);
  }

  updateCartUI();
}

// ==========================================
// 7. API REQUESTS & UI RENDERING
// ==========================================

/**
 * Load Canteens List (Public API)
 * GET /api/canteens
 */
async function loadCanteens() {
  const canteenSelect = document.getElementById('canteenSelect');
  if (!canteenSelect) return;

  canteenSelect.innerHTML = '<option value="">-- Loading canteens... --</option>';

  try {
    const res = await fetch(`${API_BASE}/canteens`);
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }

    const data = await res.json();
    if (!res.ok || !data.success || !Array.isArray(data.data) || data.data.length === 0) {
      canteenSelect.innerHTML = '<option value="">-- No canteens available --</option>';
      currentCanteenId = '';
      canteensList = [];
      renderFoodList([]);
      return;
    }

    canteensList = data.data;
    canteenSelect.innerHTML = canteensList.map(c => {
      const closedTag = (c.isOpen === false) ? ' (Closed)' : '';
      return `<option value="${c._id}">${escapeHtml(c.name)} - ${escapeHtml(c.location || 'VKU')}${closedTag}</option>`;
    }).join('');

    const defaultCanteen = canteensList.find(c => c.isOpen !== false) || canteensList[0];
    canteenSelect.value = defaultCanteen._id;
    currentCanteenId = defaultCanteen._id;

    handleCanteenChange(currentCanteenId);

  } catch (error) {
    console.error('loadCanteens error:', error);
    canteenSelect.innerHTML = '<option value="">-- Failed to load canteens --</option>';
    currentCanteenId = '';
    renderFoodList([]);
  }
}

/**
 * Load Categories for Canteen (Public API)
 * GET /api/categories?canteen=...
 */
async function loadCategories(canteenId) {
  const categorySelect = document.getElementById('categorySelect');
  if (!categorySelect) return;

  if (!canteenId) {
    categorySelect.innerHTML = '<option value="">-- All categories --</option>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/categories?canteen=${encodeURIComponent(canteenId)}`);
    if (res.status === 401) {
      handleUnauthorized();
      return;
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      categorySelect.innerHTML = '<option value="">-- All categories --</option>';
      return;
    }

    const categories = data.data || [];
    categorySelect.innerHTML = '<option value="">-- All categories --</option>' +
      categories.map(cat => `<option value="${cat._id}">${escapeHtml(cat.name)}</option>`).join('');

  } catch (error) {
    console.error('loadCategories error:', error);
    categorySelect.innerHTML = '<option value="">-- All categories --</option>';
  }
}

/**
 * Load Food Items for Canteen (Protected API)
 * GET /api/foods?canteen=...&category=...
 */
async function loadFoods(canteenId, categoryId = '') {
  const container = document.getElementById('foodListContainer');
  const countText = document.getElementById('foodCountText');
  if (!container) return;

  if (!canteenId) {
    renderFoodList([]);
    return;
  }

  // Check auth before calling protected API
  const authStatus = getAuthStatus();
  if (authStatus !== 'student') {
    renderGuestFoodState();
    return;
  }

  const token = getToken();
  const sessionCheck = authSessionEpoch;

  container.innerHTML = '<div class="col-12 text-center text-muted py-5" id="foodLoadingPlaceholder">Loading menu items...</div>';

  try {
    let url = `${API_BASE}/foods?canteen=${encodeURIComponent(canteenId)}`;
    if (categoryId) url += `&category=${encodeURIComponent(categoryId)}`;

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Check if session changed while in-flight
    if (sessionCheck !== authSessionEpoch || !getToken()) {
      return;
    }

    if (res.status === 401) {
      handleUnauthorized();
      return;
    }

    if (res.status === 403) {
      container.innerHTML = `
        <div class="col-12 empty-state-wrap">
          <div class="empty-state-title text-danger">Access denied</div>
          <div class="empty-state-desc">You do not have permission to view menu items.</div>
        </div>
      `;
      if (countText) countText.textContent = '0 items';
      allFoods = [];
      return;
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      container.innerHTML = `
        <div class="col-12 empty-state-wrap">
          <svg class="empty-state-icon text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div class="empty-state-title text-danger">Failed to load menu</div>
          <div class="empty-state-desc">${escapeHtml(data.message || 'Unable to load dishes from server.')}</div>
        </div>
      `;
      if (countText) countText.textContent = '0 items';
      allFoods = [];
      return;
    }

    allFoods = data.data || [];
    filterFoodsLocally();

  } catch (error) {
    if (sessionCheck !== authSessionEpoch || !getToken()) return;
    console.error('loadFoods error:', error);
    container.innerHTML = `
      <div class="col-12 empty-state-wrap">
        <svg class="empty-state-icon text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div class="empty-state-title text-danger">Connection error</div>
        <div class="empty-state-desc">Unable to connect to the server. Please check your connection.</div>
      </div>
    `;
    if (countText) countText.textContent = '0 items';
    allFoods = [];
  }
}

function filterFoodsLocally() {
  const searchInput = document.getElementById('searchInput');
  const keyword = (searchInput ? searchInput.value : '').trim().toLowerCase();

  let filtered = allFoods;
  if (keyword) {
    filtered = allFoods.filter(f =>
      (f.name && f.name.toLowerCase().includes(keyword)) ||
      (f.description && f.description.toLowerCase().includes(keyword))
    );
  }

  renderFoodList(filtered);
}

function renderFoodList(foods) {
  const container = document.getElementById('foodListContainer');
  const countText = document.getElementById('foodCountText');
  const menuTitle = document.getElementById('menuTitle');
  if (!container) return;

  if (menuTitle) {
    menuTitle.textContent = 'Explore the menu';
  }

  if (countText) {
    countText.textContent = `${foods.length} ${foods.length === 1 ? 'item' : 'items'}`;
  }

  if (foods.length === 0) {
    const searchInput = document.getElementById('searchInput');
    const hasSearch = searchInput && searchInput.value.trim().length > 0;

    let emptyTitle = 'No dishes available';
    let emptyDesc = 'This canteen has not listed any dishes in this category yet.';

    if (!currentCanteenId) {
      emptyTitle = 'No canteens available';
      emptyDesc = 'Select an active canteen or check back later.';
    } else if (hasSearch) {
      emptyTitle = 'No dishes found';
      emptyDesc = 'Try another keyword or clear your filters.';
    }

    container.innerHTML = `
      <div class="col-12 empty-state-wrap">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <div class="empty-state-title">${emptyTitle}</div>
        <div class="empty-state-desc">${emptyDesc}</div>
      </div>
    `;
    return;
  }

  const selectedCanteen = canteensList.find(c => c._id === currentCanteenId);
  const isCanteenClosed = selectedCanteen && selectedCanteen.isOpen === false;

  container.innerHTML = foods.map(food => {
    const isAvail = food.isAvailable !== false;
    let badgeHtml = '';
    if (isCanteenClosed) {
      badgeHtml = '<span class="badge bg-secondary">Canteen closed</span>';
    } else if (isAvail) {
      badgeHtml = '<span class="badge bg-success">Available</span>';
    } else {
      badgeHtml = '<span class="badge bg-danger">Sold out</span>';
    }

    const imgMarkup = renderFoodImage(food.image, food.name);

    let actionButtonHtml = '';
    if (isCanteenClosed) {
      actionButtonHtml = `<button type="button" class="btn btn-sm btn-secondary w-100 fw-semibold" disabled aria-disabled="true">Canteen closed</button>`;
    } else if (isAvail) {
      actionButtonHtml = `<button type="button" class="btn btn-sm vk-btn-primary w-100 fw-semibold" onclick="addToCart('${food._id}')">Add to cart</button>`;
    } else {
      actionButtonHtml = `<button type="button" class="btn btn-sm btn-secondary w-100 fw-semibold" disabled aria-disabled="true">Sold out</button>`;
    }

    return `
      <div class="col-md-6 col-12">
        <div class="vk-card food-card">
          ${imgMarkup}
          <div class="p-3 d-flex flex-column flex-grow-1 justify-content-between">
            <div>
              <div class="d-flex justify-content-between align-items-start mb-1">
                <h6 class="fw-bold mb-1 text-truncate" title="${escapeHtml(food.name)}">${escapeHtml(food.name)}</h6>
                <div>${badgeHtml}</div>
              </div>
              <p class="text-muted small mb-2 text-truncate" title="${escapeHtml(food.description || '')}">
                ${escapeHtml(food.description || 'Delicious meal freshly prepared for dorm delivery.')}
              </p>
            </div>
            <div>
              <div class="food-price mb-2">${formatVND(food.price)}</div>
              ${actionButtonHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 8. CART MANAGEMENT
// ==========================================

function addToCart(foodId) {
  const authStatus = getAuthStatus();
  if (authStatus !== 'student') {
    showToast('Please sign in with a student account to add items to cart.', 'warning');
    return;
  }

  const selectedCanteen = canteensList.find(c => c._id === currentCanteenId);
  if (selectedCanteen && selectedCanteen.isOpen === false) {
    showToast('This canteen is currently closed. Ordering is unavailable.', 'warning');
    return;
  }

  const food = allFoods.find(f => f._id === foodId);
  if (!food) return;

  if (food.isAvailable === false) {
    showToast(`"${food.name}" is currently sold out.`, 'warning');
    return;
  }

  // Single canteen restriction
  if (cart.length > 0 && cart[0].canteenId !== currentCanteenId) {
    const confirmChange = confirm('Your cart contains items from another canteen. Clear your cart and start a new order from this canteen?');
    if (!confirmChange) return;
    cart = [];
  }

  const existingItem = cart.find(item => item.foodId === foodId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      foodId: food._id,
      name: food.name,
      price: food.price,
      image: food.image,
      quantity: 1,
      canteenId: currentCanteenId
    });
  }

  updateCartUI();
  showToast(`Added "${food.name}" to cart.`, 'success');
}

function updateItemQuantity(foodId, change) {
  const itemIndex = cart.findIndex(i => i.foodId === foodId);
  if (itemIndex === -1) return;

  cart[itemIndex].quantity += change;
  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
  }

  updateCartUI();
}

function removeFromCart(foodId) {
  cart = cart.filter(i => i.foodId !== foodId);
  updateCartUI();
}

function calculateTotal() {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Retrieve the Canteen ID that all items in the cart belong to
 */
function getCartCanteenId() {
  if (!cart || cart.length === 0) return '';
  return cart[0].canteenId || '';
}

/**
 * Validate that all items currently in cart belong to the same valid canteen
 */
function validateCartConsistency() {
  if (!cart || cart.length === 0) {
    return { valid: false, message: 'Your cart is empty. Please select at least one item.' };
  }
  const primaryCanteenId = cart[0].canteenId;
  if (!primaryCanteenId) {
    return { valid: false, message: 'Invalid canteen information in cart.' };
  }
  const isUniform = cart.every(item => item.canteenId === primaryCanteenId);
  if (!isUniform) {
    return { valid: false, message: 'Cart items belong to multiple canteens. Please clear your cart and order from one canteen only.' };
  }
  return { valid: true, canteenId: primaryCanteenId };
}

function updateCartUI() {
  const cartList = document.getElementById('cartList');
  const cartBadge = document.getElementById('cartBadge');
  const cartTotalText = document.getElementById('cartTotalText');
  const placeOrderBtn = document.getElementById('placeOrderBtn');

  if (!cartList || !cartTotalText) return;

  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = calculateTotal();

  if (cartBadge) {
    cartBadge.textContent = `${totalQuantity} ${totalQuantity === 1 ? 'item' : 'items'}`;
  }
  cartTotalText.textContent = formatVND(totalAmount);

  const authStatus = getAuthStatus();
  const cartCanteenId = getCartCanteenId();
  const cartCanteen = cartCanteenId ? canteensList.find(c => c._id === cartCanteenId) : null;
  const isCartCanteenClosed = cartCanteen ? (cartCanteen.isOpen === false) : false;

  if (cart.length === 0) {
    cartList.innerHTML = `
      <div class="empty-state-wrap" id="emptyCartMsg">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <div class="empty-state-title">Your cart is empty</div>
        <div class="empty-state-desc">Add something delicious from the menu to get started.</div>
      </div>
    `;
    if (placeOrderBtn) placeOrderBtn.disabled = true;
    return;
  }

  // Only enable button if authenticated student, not currently submitting, and cart canteen is open
  if (placeOrderBtn) {
    placeOrderBtn.disabled = isSubmittingOrder || (authStatus !== 'student') || isCartCanteenClosed;
  }

  cartList.innerHTML = cart.map(item => `
    <div class="cart-item-row" data-cart-food="${item.foodId}">
      <div style="max-width: 55%;">
        <div class="cart-item-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">${formatVND(item.price)}</div>
      </div>
      <div class="d-flex align-items-center gap-1">
        <div class="qty-control-group">
          <button type="button" class="btn-qty" onclick="updateItemQuantity('${item.foodId}', -1)" aria-label="Decrease quantity">-</button>
          <span class="qty-display">${item.quantity}</span>
          <button type="button" class="btn-qty" onclick="updateItemQuantity('${item.foodId}', 1)" aria-label="Increase quantity">+</button>
        </div>
        <button type="button" class="btn-remove-item" title="Remove item" onclick="removeFromCart('${item.foodId}')" aria-label="Remove item">
          &times;
        </button>
      </div>
    </div>
  `).join('');
}

// ==========================================
// 9. ORDER PLACEMENT
// ==========================================

async function placeOrder(e) {
  if (e) e.preventDefault();

  // Guard against duplicate submission while in flight
  if (isSubmittingOrder) {
    return;
  }

  const authStatus = getAuthStatus();
  if (authStatus !== 'student') {
    showToast('Please sign in with a student account to place orders.', 'warning');
    return;
  }

  if (cart.length === 0) {
    showToast('Your cart is empty. Please select at least one item.', 'warning');
    return;
  }

  // Validate that all items belong to a single valid canteen
  const cartCheck = validateCartConsistency();
  if (!cartCheck.valid) {
    showToast(cartCheck.message, 'warning');
    return;
  }
  const orderCanteenId = cartCheck.canteenId;

  // Verify that the canteen belonging to the items in cart is open
  const orderCanteen = canteensList.find(c => c._id === orderCanteenId);
  if (orderCanteen && orderCanteen.isOpen === false) {
    showToast('The canteen for items in your cart is currently closed. Ordering is unavailable.', 'warning');
    return;
  }

  const dormBlock = document.getElementById('dormBlock')?.value?.trim();
  const roomNumber = document.getElementById('roomNumber')?.value?.trim();
  const phone = document.getElementById('phone')?.value?.trim();
  const note = document.getElementById('note')?.value?.trim() || '';

  if (!dormBlock) {
    showToast('Please select your dorm building.', 'warning');
    return;
  }
  if (!roomNumber) {
    showToast('Please provide your room number.', 'warning');
    return;
  }
  if (!phone || !/^0[35789]\d{8}$/.test(phone)) {
    showToast('Please enter a valid 10-digit Vietnamese mobile number (e.g. 0901234567).', 'warning');
    return;
  }

  const token = getToken();
  if (!token) {
    handleUnauthorized();
    return;
  }

  const placeOrderBtn = document.getElementById('placeOrderBtn');
  isSubmittingOrder = true;
  if (placeOrderBtn) {
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Placing order...';
  }

  const payload = {
    canteenId: orderCanteenId,
    items: cart.map(item => ({
      foodId: item.foodId,
      quantity: item.quantity
    })),
    dormBlock,
    roomNumber,
    phone,
    note
  };

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    if (res.status === 403) {
      showToast('You do not have permission to place orders.', 'danger');
      return;
    }
    if (res.status === 400) {
      const errorMsg = translateBackendMessage(data.message || 'Invalid order data.');
      showToast(errorMsg, 'warning');
      return;
    }
    if (res.status === 500) {
      showToast('System error. Please try again later.', 'danger');
      return;
    }

    if (!res.ok || !data.success) {
      showToast(translateBackendMessage(data.message || 'Failed to place order.'), 'danger');
      return;
    }

    // Order placed successfully
    showToast(translateBackendMessage(data.message || 'Order placed successfully! Waiting for canteen confirmation.'), 'success');
    cart = [];
    updateCartUI();
    loadMyOrders();

  } catch (error) {
    console.error('placeOrder error:', error);
    showToast('Unable to connect to the server.', 'danger');
  } finally {
    isSubmittingOrder = false;
    if (placeOrderBtn) {
      const finalCartCanteenId = getCartCanteenId();
      const finalCartCanteen = finalCartCanteenId ? canteensList.find(c => c._id === finalCartCanteenId) : null;
      const isFinalCanteenClosed = finalCartCanteen ? (finalCartCanteen.isOpen === false) : false;
      const currentAuthStatus = getAuthStatus();
      placeOrderBtn.disabled = (currentAuthStatus !== 'student') || (cart.length === 0) || isFinalCanteenClosed;
      placeOrderBtn.textContent = 'Place order';
    }
  }
}

// ==========================================
// 10. MY ORDERS & DETAILS
// ==========================================

async function loadMyOrders(isManualRefresh = false) {
  const tbody = document.getElementById('myOrdersTableBody');
  if (!tbody) return;

  const authStatus = getAuthStatus();
  if (authStatus !== 'student') {
    renderGuestOrdersState();
    return;
  }

  const token = getToken();
  const sessionCheck = authSessionEpoch;

  tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Loading order history...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/orders/my-orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (sessionCheck !== authSessionEpoch || !getToken()) return;

    if (res.status === 401) {
      handleUnauthorized();
      return;
    }

    if (res.status === 403) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Access denied. Orders are only visible to students.</td></tr>';
      return;
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${escapeHtml(data.message || 'Failed to load order history.')}</td></tr>`;
      showToast('Failed to load order history.', 'danger');
      return;
    }

    const orders = data.orders || data.data || [];
    renderOrdersTable(orders);

    if (isManualRefresh) {
      showToast('Order history refreshed.', 'info');
    }

  } catch (error) {
    if (sessionCheck !== authSessionEpoch || !getToken()) return;
    console.error('loadMyOrders error:', error);
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">Unable to connect to server. Please try refreshing.</td></tr>';
    showToast('Unable to connect to the server.', 'danger');
  }
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('myOrdersTableBody');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">You haven’t placed any orders yet.</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => {
    const shortId = order._id ? order._id.slice(-6).toUpperCase() : 'N/A';
    const canteenName = order.canteen?.name || 'VKU Canteen';
    const total = formatVND(order.totalAmount);
    const createdAt = order.createdAt
      ? new Date(order.createdAt).toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          day: 'numeric'
        })
      : '--';

    const statusInfo = getStatusInfo(order.status);

    return `
      <tr id="order-row-${order._id}" data-order-id="${order._id}">
        <td><strong class="text-primary">#${shortId}</strong></td>
        <td>${escapeHtml(canteenName)}</td>
        <td class="fw-bold">${total}</td>
        <td class="small text-muted order-time">${createdAt}</td>
        <td class="order-status-cell"><span class="${statusInfo.badgeClass}">${escapeHtml(statusInfo.label)}</span></td>
        <td class="text-center">
          <button type="button" class="btn btn-sm vk-btn-outline" onclick="viewOrderDetail('${order._id}')">
            View details
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function viewOrderDetail(orderId) {
  const authStatus = getAuthStatus();
  if (authStatus !== 'student') {
    showToast('Please sign in with a student account to view order details.', 'warning');
    return;
  }

  const token = getToken();
  if (!token) {
    handleUnauthorized();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      handleUnauthorized();
      return;
    }
    if (res.status === 403) {
      showToast('You do not have permission to view this order.', 'danger');
      return;
    }

    const data = await res.json();
    if (!res.ok || !data.success || (!data.order && !data.data)) {
      showToast(translateBackendMessage(data.message || 'Order not found.'), 'danger');
      return;
    }

    const order = data.order || data.data;
    populateOrderDetailModal(order);

  } catch (error) {
    console.error('viewOrderDetail error:', error);
    showToast('Unable to connect to the server.', 'danger');
  }
}

function populateOrderDetailModal(order) {
  const shortId = order._id ? order._id.slice(-6).toUpperCase() : '';

  const shortIdEl = document.getElementById('detailOrderIdShort');
  if (shortIdEl) {
    shortIdEl.textContent = shortId;
    shortIdEl.dataset.fullId = order._id;
  }

  const canteenEl = document.getElementById('detailCanteenName');
  if (canteenEl) canteenEl.textContent = order.canteen?.name || '--';

  const addressEl = document.getElementById('detailAddress');
  if (addressEl) {
    const block = order.dormBlock || '';
    const room = order.roomNumber ? `Room ${order.roomNumber}` : '';
    addressEl.textContent = [block, room].filter(Boolean).join(' - ') || '--';
  }

  const phoneEl = document.getElementById('detailPhone');
  if (phoneEl) phoneEl.textContent = order.phone || '--';

  const statusInfo = getStatusInfo(order.status);
  const statusBadgeEl = document.getElementById('detailStatusBadge');
  if (statusBadgeEl) {
    statusBadgeEl.innerHTML = `<span class="${statusInfo.badgeClass} fs-6">${escapeHtml(statusInfo.label)}</span>`;
  }

  const noteEl = document.getElementById('detailNote');
  if (noteEl) noteEl.textContent = order.note || 'None';

  const totalEl = document.getElementById('detailTotalAmount');
  if (totalEl) totalEl.textContent = formatVND(order.totalAmount);

  const itemsTbody = document.getElementById('detailItemsTableBody');
  if (itemsTbody && Array.isArray(order.items)) {
    itemsTbody.innerHTML = order.items.map(item => {
      const foodName = item.food?.name || 'Meal item';
      const price = item.price || 0;
      const qty = item.quantity || 1;
      const subtotal = price * qty;

      return `
        <tr>
          <td>${escapeHtml(foodName)}</td>
          <td class="text-end">${formatVND(price)}</td>
          <td class="text-center">${qty}</td>
          <td class="text-end fw-semibold">${formatVND(subtotal)}</td>
        </tr>
      `;
    }).join('');
  }

  const modalEl = document.getElementById('orderDetailModal');
  if (modalEl) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}
