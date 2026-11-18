const { API_BASE_URL, STORAGE_KEYS, ROLES, PAGES, ORDER_STATUS, SOCKET_EVENTS } = APP_CONSTANTS;
const API_SHIPPER = `${API_BASE_URL}/shipper`;

const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');

// 1. Check Auth & Role Access
if (!token || ![ROLES.ADMIN, ROLES.SHIPPER].includes(user.role)) {
  alert('Access denied! Please log in as Admin or Shipper.');
  window.location.href = PAGES.LOGIN;
  throw new Error('Unauthorized'); // stop the rest of the script
}

// ==================== HELPERS ====================
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function stateBox(emoji, text, colspan) {
  return `<tr><td colspan="${colspan}"><div class="state-box"><span class="emoji">${emoji}</span>${text}</div></td></tr>`;
}

function showToast(msg, type = 'success', duration = 4000) {
  const box = document.getElementById('toastBox');
  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// Keep old name so existing calls still work
function showAlert(msg) {
  showToast(msg, 'info', 6000);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  return res.json();
}

// ==================== HEADER ====================
const displayName = user.name || 'User';
setText('userInfo', `${displayName} · ${user.role}`);
setText('userAvatar', displayName.trim().charAt(0).toUpperCase() || 'U');

// Toggle Tabs by Role
if (user.role === ROLES.SHIPPER) {
  document.getElementById('navAdminTab').classList.add('d-none');
  document.getElementById('tabAdmin').classList.remove('show', 'active');
  loadShipperOrders();
} else if (user.role === ROLES.ADMIN) {
  document.getElementById('navShipperTab').classList.add('d-none');
  document.getElementById('tabShipper').classList.remove('show', 'active');
  document.getElementById('tabAdmin').classList.add('show', 'active');
  loadUsers();
}

// 2. Socket.io Real-time Notifications
const socket = io('http://localhost:5000');

socket.on(SOCKET_EVENTS.ORDER_READY, () => {
  showAlert('🔔 A new order is ready for delivery!');
  if (user.role === ROLES.SHIPPER) loadShipperOrders();
});

socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, (data) => {
  if (data.status === ORDER_STATUS.READY && user.role === ROLES.SHIPPER) {
    showAlert('🔔 A new order is ready for delivery!');
    loadShipperOrders();
  }
});

// Map DB Vietnamese status strings to English UI labels
function formatOrderStatus(status) {
  const map = {
    [ORDER_STATUS.PENDING]: 'Pending',
    [ORDER_STATUS.PREPARING]: 'Preparing',
    [ORDER_STATUS.READY]: 'Ready for pickup',
    [ORDER_STATUS.DELIVERING]: 'Delivering',
    [ORDER_STATUS.COMPLETED]: 'Completed',
    [ORDER_STATUS.CANCELLED]: 'Cancelled'
  };
  return map[status] || status;
}

function orderPillClass(status) {
  const map = {
    [ORDER_STATUS.READY]: 'pill-ready',
    [ORDER_STATUS.DELIVERING]: 'pill-delivering',
    [ORDER_STATUS.COMPLETED]: 'pill-done',
    [ORDER_STATUS.CANCELLED]: 'pill-cancelled'
  };
  return map[status] || 'pill-default';
}

// ==================== SHIPPER LOGIC ====================
async function loadShipperOrders() {
  const tbody = document.getElementById('shipperOrdersBody');
  const btn = document.getElementById('btnRefreshOrders');
  if (btn) btn.disabled = true;

  try {
    const result = await request(`${API_SHIPPER}/orders`);

    if (!result.success || !result.data.length) {
      setText('statReady', 0);
      setText('statDelivering', 0);
      tbody.innerHTML = stateBox('📭', 'No orders available for delivery right now.', 7);
      return;
    }

    const orders = result.data;
    setText('statReady', orders.filter(o => o.status === ORDER_STATUS.READY).length);
    setText('statDelivering', orders.filter(o => o.status === ORDER_STATUS.DELIVERING).length);

    tbody.innerHTML = orders.map(order => {
      const id = escapeHtml(order._id);
      const isReady = order.status === ORDER_STATUS.READY;
      return `
        <tr>
          <td data-label="Order ID"><span class="order-id">#${id.slice(-6)}</span></td>
          <td data-label="Canteen">${escapeHtml(order.canteen?.name || 'VKU Canteen')}</td>
          <td data-label="Student & phone">
            <div class="fw-semibold">${escapeHtml(order.student?.name || 'Student')}</div>
            <small class="text-muted">${escapeHtml(order.phone)}</small>
          </td>
          <td data-label="Dorm address">
            <span class="dorm-chip">${escapeHtml(order.dormBlock)}</span>
            <span class="ms-1">Room ${escapeHtml(order.roomNumber)}</span>
          </td>
          <td data-label="Total" class="price">${Number(order.totalAmount || 0).toLocaleString()}đ</td>
          <td data-label="Status">
            <span class="pill ${orderPillClass(order.status)}">${escapeHtml(formatOrderStatus(order.status))}</span>
          </td>
          <td class="text-md-end">
            ${isReady
              ? `<button class="btn btn-sm btn-brand" onclick="acceptOrder('${id}', this)">Accept order</button>`
              : `<button class="btn btn-sm btn-success" onclick="completeOrder('${id}', this)">Complete delivery</button>`
            }
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = stateBox('⚠️', 'Could not load orders. Check your connection and refresh.', 7);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function orderAction(orderId, action, successMsg, btn) {
  if (btn) btn.disabled = true;
  try {
    const data = await request(`${API_SHIPPER}/orders/${orderId}/${action}`, { method: 'PATCH' });
    showToast(data.success ? successMsg : (data.message || 'Something went wrong'), data.success ? 'success' : 'error');
  } catch (err) {
    console.error(err);
    showToast('Network error. Please try again.', 'error');
  }
  loadShipperOrders();
}

function acceptOrder(orderId, btn) {
  return orderAction(orderId, 'accept', 'Order accepted!', btn);
}

function completeOrder(orderId, btn) {
  return orderAction(orderId, 'complete', 'Delivery completed!', btn);
}

// ==================== ADMIN LOGIC ====================
async function loadUsers() {
  const tbody = document.getElementById('adminUsersBody');

  try {
    const result = await request(`${API_SHIPPER}/admin/users`);

    if (!result.success) {
      tbody.innerHTML = stateBox('⚠️', escapeHtml(result.message || 'Could not load users.'), 6);
      return;
    }

    const users = result.data;
    setText('statUsers', users.length);
    setText('statLocked', users.filter(u => u.status === 'locked').length);

    if (!users.length) {
      tbody.innerHTML = stateBox('👤', 'No accounts yet.', 6);
      return;
    }

    tbody.innerHTML = users.map(u => {
      const id = escapeHtml(u._id);
      const locked = u.status === 'locked';
      const active = u.status === 'active';
      return `
        <tr>
          <td data-label="Full name">
            <div class="d-flex align-items-center gap-2">
              <div class="avatar" style="background:var(--brand-soft);color:var(--brand-dark)">
                ${escapeHtml((u.name || '?').trim().charAt(0).toUpperCase())}
              </div>
              <span class="fw-semibold">${escapeHtml(u.name)}</span>
            </div>
          </td>
          <td data-label="Email">${escapeHtml(u.email)}</td>
          <td data-label="Role"><span class="role-tag">${escapeHtml(u.role)}</span></td>
          <td data-label="Phone">${escapeHtml(u.phone || '-')}</td>
          <td data-label="Status">
            <span class="pill ${locked ? 'pill-locked' : 'pill-active'}">${locked ? 'Locked' : 'Active'}</span>
          </td>
          <td class="text-md-end">
            ${u.role === ROLES.ADMIN
              ? '<small class="text-muted">Administrator</small>'
              : `
                ${!active ? `<button class="btn btn-sm btn-success me-1" onclick="changeUserStatus('${id}', 'active', this)">Approve</button>` : ''}
                ${!locked ? `<button class="btn btn-sm btn-outline-danger" onclick="changeUserStatus('${id}', 'locked', this)">Lock</button>` : ''}
              `}
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = stateBox('⚠️', 'Could not load users. Check your connection and refresh.', 6);
  }
}

async function changeUserStatus(userId, status, btn) {
  if (status === 'locked' && !confirm('Lock this account? The user will no longer be able to log in.')) return;
  if (btn) btn.disabled = true;

  try {
    const data = await request(`${API_SHIPPER}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    showToast(
      data.success ? `Account ${status === 'active' ? 'approved' : 'locked'}!` : (data.message || 'Something went wrong'),
      data.success ? 'success' : 'error'
    );
  } catch (err) {
    console.error(err);
    showToast('Network error. Please try again.', 'error');
  }
  loadUsers();
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  window.location.href = PAGES.LOGIN;
}