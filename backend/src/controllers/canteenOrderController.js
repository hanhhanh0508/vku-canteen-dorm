
const mongoose = require('mongoose');

const Order = require('../models/Order');
const Canteen = require('../models/Canteen');

// Dung chung trang thai voi Order.js va constants.js
const APP_CONSTANTS = require('../../public/js/constants');

const STATUS = Object.freeze({
  ...APP_CONSTANTS.ORDER_STATUS
});

// Quy trinh xu ly don hang cua chu canteen
const TRANSITIONS = Object.freeze({
  [STATUS.PENDING]: STATUS.PREPARING,
  [STATUS.PREPARING]: STATUS.READY
});

// Kiem tra ObjectId MongoDB
const validId = (id) =>
  typeof id === 'string' &&
  /^[a-f\d]{24}$/i.test(id);

// Tra ve thong bao loi
const fail = (res, code, message) =>
  res.status(code).json({
    success: false,
    message
  });

// GET /api/canteen-orders?canteenId=...&status=...
const getCanteenOrders = async (req, res) => {
  try {
    const filter = {};

    // Loc don theo canteen
    if (req.query.canteenId !== undefined) {
      if (!validId(req.query.canteenId)) {
        return fail(res, 400, 'Invalid canteen ID');
      }

      const canteen = await Canteen.findById(
        req.query.canteenId
      );

      if (!canteen) {
        return fail(res, 404, 'Canteen not found');
      }

      // Chi chu canteen moi duoc xem don cua quan
      if (
        String(canteen.owner) !== String(req.user._id)
      ) {
        return fail(
          res,
          403,
          'You do not own this canteen'
        );
      }

      filter.canteen = canteen._id;

    } else {
      // Neu khong truyen canteenId
      // chi lay don tu canteen ma user so huu
      const ownedIds = await Canteen.find({
        owner: req.user._id
      }).distinct('_id');

      filter.canteen = { $in: ownedIds };
    }

    // Loc theo trang thai don hang
    if (req.query.status !== undefined) {
      if (
        !Object.values(STATUS).includes(req.query.status)
      ) {
        return fail(
          res,
          400,
          'Invalid order status'
        );
      }

      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    console.error('getCanteenOrders:', error);

    return fail(
      res,
      500,
      'Unable to retrieve canteen orders'
    );
  }
};

// PATCH /api/canteen-orders/:id/status
const updateCanteenOrderStatus = async (req, res) => {
  try {
    // Kiem tra ID don hang
    if (!validId(req.params.id)) {
      return fail(res, 400, 'Invalid order ID');
    }

    const nextStatus = req.body?.status;

    // Chu canteen chi duoc chuyen sang 2 trang thai
    if (
      ![STATUS.PREPARING, STATUS.READY].includes(nextStatus)
    ) {
      return fail(
        res,
        400,
        'Canteen can only change orders to Preparing or Ready for Delivery'
      );
    }

    // Tim don hang
    const order = await Order.findById(req.params.id);

    if (!order) {
      return fail(res, 404, 'Order not found');
    }

    // Xac dinh canteen tu don hang
    const canteen = await Canteen.findById(
      order.canteen
    );

    if (!canteen) {
      return fail(res, 404, 'Canteen not found');
    }

    // Kiem tra quyen so huu canteen
    if (
      String(canteen.owner) !== String(req.user._id)
    ) {
      return fail(
        res,
        403,
        'You cannot manage orders from another canteen'
      );
    }

    // Kiem tra chuyen trang thai hop le
    if (TRANSITIONS[order.status] !== nextStatus) {
      return fail(
        res,
        409,
        'Invalid order status transition'
      );
    }

    // Cap nhat atomic de tranh xu ly trung don
    const updated = await Order.findOneAndUpdate(
      {
        _id: order._id,
        canteen: canteen._id,
        status: order.status
      },
      {
        $set: {
          status: nextStatus
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updated) {
      return fail(
        res,
        409,
        'Order was updated by another request. Please refresh.'
      );
    }

    // Realtime events se duoc dong bo voi Hưng
    // Backend la noi phat thong bao dang tin cay

    return res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updated
    });

  } catch (error) {
    if (
      error instanceof mongoose.Error.ValidationError
    ) {
      return fail(
        res,
        400,
        'Order status does not match the schema'
      );
    }

    console.error('updateCanteenOrderStatus:', error);

    return fail(
      res,
      500,
      'Unable to update order status'
    );
  }
};

module.exports = {
  getCanteenOrders,
  updateCanteenOrderStatus,
  STATUS
};
