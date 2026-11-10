const mongoose = require('mongoose');
const Order = require('../models/Order');
const Canteen = require('../models/Canteen');

// CAN DONG BO VOI LE (Order.js): ten field 'status', 'canteen', va 3 gia tri nay.
const STATUS = Object.freeze({
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready_for_delivery'
});
const TRANSITIONS = Object.freeze({
  [STATUS.PENDING]: STATUS.PREPARING,
  [STATUS.PREPARING]: STATUS.READY
});

const validId = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
const fail = (res, code, message) => res.status(code).json({ success: false, message });

// GET /api/canteen-orders?canteenId=...&status=...
const getCanteenOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.canteenId !== undefined) {
      if (!validId(req.query.canteenId)) return fail(res, 400, 'ID canteen khong hop le');
      const canteen = await Canteen.findById(req.query.canteenId);
      if (!canteen) return fail(res, 404, 'Khong tim thay canteen');
      if (String(canteen.owner) !== String(req.user._id)) {
        return fail(res, 403, 'Ban khong so huu canteen nay');
      }
      filter.canteen = canteen._id;
    } else {
      const ownedIds = await Canteen.find({ owner: req.user._id }).distinct('_id');
      filter.canteen = { $in: ownedIds };
    }
    if (req.query.status !== undefined) {
      if (!Object.values(STATUS).includes(req.query.status)) {
        return fail(res, 400, 'Trang thai loc khong hop le');
      }
      filter.status = req.query.status;
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    console.error('getCanteenOrders:', err);
    return fail(res, 500, 'Khong the lay danh sach don hang');
  }
};

// PATCH /api/canteen-orders/:id/status   { "status": "preparing" }
const updateCanteenOrderStatus = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'ID don hang khong hop le');
    const nextStatus = req.body && req.body.status;
    if (![STATUS.PREPARING, STATUS.READY].includes(nextStatus)) {
      return fail(res, 400, 'Canteen chi duoc chuyen sang preparing hoac ready_for_delivery');
    }
    const order = await Order.findById(req.params.id);
    if (!order) return fail(res, 404, 'Khong tim thay don hang');

    // Khong tin canteenId client truyen len: lay tu don da luu.
    const canteen = await Canteen.findById(order.canteen);
    if (!canteen) return fail(res, 404, 'Canteen cua don hang khong ton tai');
    if (String(canteen.owner) !== String(req.user._id)) {
      return fail(res, 403, 'Ban khong duoc xu ly don hang cua canteen khac');
    }

    if (TRANSITIONS[order.status] !== nextStatus) {
      return fail(res, 409, 'Chuyen trang thai khong hop le hoac don da xu ly');
    }

    // Atomic condition tranh 2 request duyet dong thoi.
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, canteen: canteen._id, status: order.status },
      { $set: { status: nextStatus } },
      { new: true, runValidators: true }
    );
    if (!updated) return fail(res, 409, 'Don hang vua duoc thay doi, vui long tai lai');

    // HUNG se gan Socket.IO event sau khi API duoc merge.
    return res.status(200).json({ success: true, message: 'Cap nhat trang thai thanh cong', data: updated });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) return fail(res, 400, 'Trang thai khong hop le voi Order schema');
    console.error('updateCanteenOrderStatus:', err);
    return fail(res, 500, 'Khong the cap nhat trang thai don hang');
  }
};

module.exports = { getCanteenOrders, updateCanteenOrderStatus, STATUS };
