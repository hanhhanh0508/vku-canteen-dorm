
/*
 * VKU CANTEEN & DORM DELIVERY
 * Canteen Owner Dashboard
 * Menu Management + Order Management + Socket.io
 */

const API = APP_CONSTANTS.API_BASE_URL;
const STATUS = APP_CONSTANTS.ORDER_STATUS;

const $ = (id) => document.getElementById(id);

let canteenId = '';
let foods = [];
let orders = [];
let categories = [];
let canteenSocket = null;

const money = (value) =>
  Number(value || 0).toLocaleString('vi-VN') + ' VND';

const objectId = (value) => {
  if (value && typeof value === 'object') {
    return String(value._id || value.id || '');
  }
  return String(value || '');
};

const getToken = () =>
  localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.TOKEN);

// 1. DISPLAY NOTIFICATIONS
function notify(message, type = 'success') {
  const div = document.createElement('div');

  div.className =
    `alert alert-${type} alert-dismissible fade show`;

  div.setAttribute('role', 'alert');

  const content = document.createElement('span');
  content.textContent = message;

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'btn-close';
  close.setAttribute('aria-label', 'Close');

  close.onclick = () => div.remove();

  div.append(content, close);
  $('message').replaceChildren(div);
}

// 2. GENERAL API REQUEST
async function request(url, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (getToken()) {
    headers.Authorization = `Bearer ${getToken()}`;
  }

  const response = await fetch(API + url, {
    ...options,
    headers
  });

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
      `Request failed (HTTP ${response.status})`
    );
  }

  return result;
}

// 3. LOAD CANTEENS
async function loadCanteens() {
  const result = await request('/canteens');

  const select = $('canteenSelect');
  select.replaceChildren();

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Select Canteen --';
  select.appendChild(placeholder);

  for (const canteen of result.data || []) {
    const option = document.createElement('option');
    option.value = canteen._id;
    option.textContent = canteen.name;
    select.appendChild(option);
  }

  const saved = localStorage.getItem('selectedCanteenId');

  if ([...select.options].some(o => o.value === saved)) {
    select.value = saved;
  } else if (select.options.length === 2) {
    select.selectedIndex = 1;
  }

  canteenId = select.value;
}

// 4. LOAD CATEGORIES
async function loadCategories() {
  if (!canteenId) return;

  const result = await request(
    `/categories?canteen=${encodeURIComponent(canteenId)}`
  );

  categories = result.data || [];

  const select = $('foodCategory');
  select.replaceChildren();

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- Select Category --';
  select.appendChild(placeholder);

  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category._id;
    option.textContent = category.name;
    select.appendChild(option);
  }
}

// 5. LOAD MENU ITEMS
async function loadFoods() {
  if (!canteenId) return;

  const selectedCanteen = canteenId;

  const result = await request(
    `/foods?canteen=${encodeURIComponent(selectedCanteen)}`
  );

  if (selectedCanteen !== canteenId) return;

  foods = result.data || [];

  $('totalFoods').textContent = foods.length;

  $('availableFoods').textContent =
    foods.filter(food => food.isAvailable).length;

  renderFoods();
}

// 6. DISPLAY MENU ITEMS
function renderFoods() {
  const tbody = $('foodTable');
  tbody.replaceChildren();

  if (!foods.length) {
    tbody.innerHTML =
      '<tr><td colspan="5">No dishes found.</td></tr>';
    return;
  }

  foods.forEach(food => {
    const tr = document.createElement('tr');

    // IMAGE
    const imageCell = document.createElement('td');

    if (
      typeof food.image === 'string' &&
      food.image.startsWith('/uploads/')
    ) {
      const img = document.createElement('img');
      img.className = 'food-img';
      img.src = food.image;
      img.alt = food.name;
      imageCell.appendChild(img);
    } else {
      imageCell.textContent = 'No image';
    }

    // NAME
    const nameCell = document.createElement('td');
    nameCell.textContent = food.name;

    // PRICE
    const priceCell = document.createElement('td');
    priceCell.textContent = money(food.price);

    // STATUS
    const statusCell = document.createElement('td');

    statusCell.textContent = food.isAvailable
      ? 'Available'
      : 'Out of Stock';

    statusCell.className = food.isAvailable
      ? 'text-success fw-bold'
      : 'text-danger fw-bold';

    // ACTIONS
    const actionCell = document.createElement('td');

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-primary btn-sm me-1 mb-1';
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => editFood(food._id);

    const toggleBtn = document.createElement('button');

    toggleBtn.className = food.isAvailable
      ? 'btn btn-warning btn-sm me-1 mb-1'
      : 'btn btn-success btn-sm me-1 mb-1';

    toggleBtn.textContent = food.isAvailable
      ? 'Mark Out of Stock'
      : 'Mark Available';

    toggleBtn.onclick = () =>
      toggleFood(food._id, !food.isAvailable);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm mb-1';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteFood(food._id);

    actionCell.append(editBtn, toggleBtn, deleteBtn);

    tr.append(
      imageCell,
      nameCell,
      priceCell,
      statusCell,
      actionCell
    );

    tbody.appendChild(tr);
  });
}

// 7. ADD OR UPDATE DISH
async function saveFood(event) {
  event.preventDefault();

  if (!canteenId) {
    notify('Please select a canteen!', 'warning');
    return;
  }

  const editingId = $('editingFoodId').value;
  const formData = new FormData($('foodForm'));

  if (!editingId) {
    formData.set('canteen', canteenId);
  }

  const image = $('foodImage').files[0];

  if (image && image.size > 5 * 1024 * 1024) {
    notify(
      'The image must not exceed 5 MB!',
      'warning'
    );
    return;
  }

  const button = $('saveFoodBtn');
  button.disabled = true;

  try {
    await request(
      editingId ? `/foods/${editingId}` : '/foods',
      {
        method: editingId ? 'PUT' : 'POST',
        body: formData
      }
    );

    notify(
      editingId
        ? 'Dish updated successfully!'
        : 'Dish added successfully!'
    );

    cancelEdit();
    await loadFoods();

  } catch (error) {
    notify(error.message, 'danger');
  } finally {
    button.disabled = false;
  }
}

// 8. EDIT DISH
function editFood(id) {
  const food = foods.find(f => f._id === id);
  if (!food) return;

  $('editingFoodId').value = food._id;
  $('foodName').value = food.name;
  $('foodPrice').value = food.price;
  $('foodDescription').value = food.description || '';
  $('foodCategory').value = objectId(food.category);
  $('foodImage').value = '';

  $('fileName').textContent = 'No file selected';
  $('formTitle').textContent = 'Edit Dish';
  $('saveFoodBtn').textContent = 'Save Changes';

  $('foodForm').scrollIntoView({
    behavior: 'smooth'
  });
}

// 9. CANCEL EDIT
function cancelEdit() {
  $('foodForm').reset();
  $('editingFoodId').value = '';
  $('fileName').textContent = 'No file selected';

  $('formTitle').textContent = 'Add New Dish';
  $('saveFoodBtn').textContent = 'Save Dish';
}

// 10. UPDATE DISH AVAILABILITY
async function toggleFood(id, isAvailable) {
  try {
    await request(`/foods/${id}/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isAvailable })
    });

    notify(
      isAvailable
        ? 'Dish marked as Available!'
        : 'Dish marked as Out of Stock!'
    );

    await loadFoods();

  } catch (error) {
    notify(error.message, 'danger');
  }
}

// 11. DELETE DISH
async function deleteFood(id) {
  if (!confirm(
    'Are you sure you want to delete this dish?'
  )) {
    return;
  }

  try {
    await request(`/foods/${id}`, {
      method: 'DELETE'
    });

    notify('Dish deleted successfully!');
    await loadFoods();

  } catch (error) {
    notify(error.message, 'danger');
  }
}

// 12. LOAD CANTEEN ORDERS
async function loadOrders() {
  if (!canteenId) return;

  const selectedCanteen = canteenId;

  const result = await request(
    `/canteen-orders?canteenId=${encodeURIComponent(selectedCanteen)}`
  );

  if (selectedCanteen !== canteenId) return;

  orders = result.data || [];

  $('pendingOrders').textContent = orders.filter(
    order => [
      STATUS.PENDING,
      STATUS.PREPARING
    ].includes(order.status)
  ).length;

  renderOrders();
}

// 13. ENGLISH ORDER STATUS LABELS
const statusLabels = {
  [STATUS.PENDING]: 'Pending',
  [STATUS.PREPARING]: 'Preparing',
  [STATUS.READY]: 'Ready for Delivery',
  [STATUS.DELIVERING]: 'Delivering',
  [STATUS.COMPLETED]: 'Completed',
  [STATUS.CANCELLED]: 'Cancelled'
};

// 14. DISPLAY ORDERS
function renderOrders() {
  const tbody = $('orderTable');
  tbody.replaceChildren();

  if (!orders.length) {
    tbody.innerHTML =
      '<tr><td colspan="4">No orders found.</td></tr>';
    return;
  }

  orders.forEach(order => {
    const tr = document.createElement('tr');

    // ORDER ID
    const idCell = document.createElement('td');
    idCell.textContent =
      '#' + String(order._id).slice(-6);

    // DORMITORY ADDRESS
    const addressCell = document.createElement('td');

    addressCell.textContent = [
      order.dormBlock || order.dormBuilding,
      order.roomNumber
    ].filter(Boolean).join(' - ') || 'Address not available';

    // ORDER STATUS
    const statusCell = document.createElement('td');

    statusCell.textContent =
      statusLabels[order.status] || order.status;

    // ACTIONS
    const actionCell = document.createElement('td');

    let nextStatus = '';
    let buttonText = '';

    if (order.status === STATUS.PENDING) {
      nextStatus = STATUS.PREPARING;
      buttonText = 'Confirm / Prepare';
    }

    if (order.status === STATUS.PREPARING) {
      nextStatus = STATUS.READY;
      buttonText = 'Ready for Delivery';
    }

    if (nextStatus) {
      const btn = document.createElement('button');

      btn.className = 'btn btn-success btn-sm';
      btn.textContent = buttonText;

      btn.onclick = () =>
        updateOrderStatus(order, nextStatus);

      actionCell.appendChild(btn);
    } else {
      actionCell.textContent = 'No actions';
    }

    tr.append(
      idCell,
      addressCell,
      statusCell,
      actionCell
    );

    tbody.appendChild(tr);
  });
}

// 15. UPDATE ORDER STATUS
async function updateOrderStatus(order, status) {
  try {
    await request(
      `/canteen-orders/${order._id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      }
    );

    notify('Order status updated successfully!');

    // Backend is responsible for trusted
    // Socket.io status notifications.
    await loadOrders();

  } catch (error) {
    notify(error.message, 'danger');
  }
}

// 16. CHECK WHETHER AN EVENT IS FOR THIS CANTEEN
function isOrderForCurrentCanteen(payload) {
  if (!canteenId || !payload) return false;

  const order = payload.order || payload.data || payload;

  const eventCanteenId = objectId(
    order.canteenId || order.canteen
  );

  return eventCanteenId === canteenId;
}

// 17. PROCESS REAL-TIME NEW ORDERS
async function handleNewOrder(payload) {
  // Ignore events from other canteens
  if (!isOrderForCurrentCanteen(payload)) return;

  try {
    await loadOrders();
    notify('A new order has arrived!', 'info');
  } catch (error) {
    console.error('Real-time order error:', error);
  }
}

// 18. CONNECT SOCKET.IO
function connectSocket() {
  if (typeof io !== 'function') {
    console.error('Socket.io is unavailable');

    notify(
      'Real-time connection is unavailable.',
      'warning'
    );

    return;
  }

  if (canteenSocket) {
    canteenSocket.disconnect();
  }

  const socket = io({
    auth: {
      token: getToken()
    }
  });

  canteenSocket = socket;
  window.canteenSocket = socket;

  // CONNECTION SUCCESS
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);

    if (canteenId) {
      socket.emit('canteen:join', canteenId);
      console.log('Canteen room requested:', canteenId);
    }
  });

  // NEW ORDER FROM ORDER CONTROLLER
  socket.on('order:new', handleNewOrder);

  // COMPATIBILITY WITH OTHER GROUP EVENT NAMES
  socket.on('receive_new_order', handleNewOrder);

  if (APP_CONSTANTS.SOCKET_EVENTS?.ORDER_CREATED) {
    socket.on(
      APP_CONSTANTS.SOCKET_EVENTS.ORDER_CREATED,
      handleNewOrder
    );
  }

  // CANCELLED ORDER
  socket.on('order:cancelled', async (data) => {
    try {
      // Reload from the server to check
      // which orders are currently available.
      await loadOrders();
      console.log('Order cancellation event:', data);
    } catch (error) {
      console.error('Order refresh error:', error);
    }
  });

  // STATUS CHANGED
  if (APP_CONSTANTS.SOCKET_EVENTS?.ORDER_STATUS_UPDATED) {
    socket.on(
      APP_CONSTANTS.SOCKET_EVENTS.ORDER_STATUS_UPDATED,
      async () => {
        try {
          await loadOrders();
        } catch (error) {
          console.error('Status refresh error:', error);
        }
      }
    );
  }

  socket.on('connect_error', (error) => {
    console.error(
      'Socket connection error:',
      error.message
    );
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });
}

// 19. CHANGE CANTEEN SOCKET ROOM
function changeCanteenRoom(oldId, newId) {
  if (!canteenSocket?.connected) return;

  if (oldId) {
    canteenSocket.emit('canteen:leave', oldId);
  }

  if (newId) {
    canteenSocket.emit('canteen:join', newId);
    console.log('Canteen room requested:', newId);
  }
}

// 20. REFRESH DASHBOARD
async function refreshData() {
  if (!canteenId) {
    foods = [];
    orders = [];
    categories = [];

    $('foodTable').innerHTML =
      '<tr><td colspan="5">Please select a canteen.</td></tr>';

    $('orderTable').innerHTML =
      '<tr><td colspan="4">Please select a canteen.</td></tr>';

    $('totalFoods').textContent = '0';
    $('availableFoods').textContent = '0';
    $('pendingOrders').textContent = '0';

    $('foodCategory').innerHTML =
      '<option value="">-- Select Category --</option>';

    return;
  }

  const results = await Promise.allSettled([
    loadCategories(),
    loadFoods(),
    loadOrders()
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      notify(result.reason.message, 'danger');
      console.error(result.reason);
    }
  }
}

// 21. INITIALIZE DASHBOARD
document.addEventListener('DOMContentLoaded', async () => {

  // IMAGE UPLOAD FILE NAME
  $('foodImage').addEventListener('change', function () {
    const file = this.files[0];

    $('fileName').textContent = file
      ? file.name
      : 'No file selected';
  });

  // ADD / UPDATE DISH
  $('foodForm').addEventListener('submit', saveFood);

  // CANCEL EDIT
  $('cancelEditBtn').addEventListener(
    'click',
    cancelEdit
  );

  // REFRESH
  $('refreshBtn').addEventListener(
    'click',
    refreshData
  );

  // CHANGE SELECTED CANTEEN
  $('canteenSelect').addEventListener(
    'change',
    async (event) => {
      const previousId = canteenId;
      const selectedId = event.target.value;

      canteenId = selectedId;

      localStorage.setItem(
        'selectedCanteenId',
        selectedId
      );

      changeCanteenRoom(previousId, selectedId);

      cancelEdit();
      await refreshData();
    }
  );

  // CHECK LOGIN
  if (!getToken()) {
    notify(
      'Please log in with a Canteen Owner account!',
      'warning'
    );
    return;
  }

  try {
    await loadCanteens();
    await refreshData();
    connectSocket();

  } catch (error) {
    notify(error.message, 'danger');
    console.error(error);
  }
});
