import Order from "../models/order.js";
import User from "../models/user.js";
import Product from "../models/pro-products.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import SubscriptionPlan from "../models/subscriptionPlanModel.js";

// Middleware to ensure user is authenticated
// Assume `protect` middleware sets `req.user` to the logged-in user's ID
// Example: req.user = logged-in user's ObjectId;

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create an order
export const createOrder = async (req, res) => {
  try {
    const { productId, deliveryAddressId, quantity } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    // Validate the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find the user's delivery address
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const deliveryAddress = user.deliveryAddresses.id(deliveryAddressId);
    if (!deliveryAddress) {
      return res.status(404).json({ message: "Delivery address not found" });
    }

    // Calculate total amount
    const totalAmount = product.price * quantity * 100;

    // Create the new order
    const newOrder = new Order({
      user: req.user,
      deliveryAddress: deliveryAddressId,
      product: {
        productId,
        price: product.price,
        quantity,
      },
      totalAmount: totalAmount / 100, // Store amount in rupees for consistency
      orderStatus: "pending",
      paymentMethod: "Online Payment", // Default to Razorpay online payment
    });

    await newOrder.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export const createSubscriptionOrder = async (amount, currency = "INR") => {
  try {
    const options = {
      amount: amount * 100,
      currency,
      receipt: `order_rcptid_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
      error: error.message,
    });
  }
};

export const createSubscription = async (req, res) => {
  try {
    const { duration } = req.body;

    // Validate request
    if (!duration) {
      return res.status(400).json({ message: "Invalid subscription details" });
    }

    const plan = await SubscriptionPlan.findOne({ duration, isActive: true });

    if (!plan) {
      return res.status(404).json({ message: "Subscription plan not found" });
    }

    const { price } = plan;

    // Create an order using Razorpay
    const order = await createSubscriptionOrder(price);

    // Respond with the order details
    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifySubscription = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      duration,
    } = req.body;

    // Validate Razorpay signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    // Fetch the subscription plan from the database
    const plan = await SubscriptionPlan.findOne({ duration, isActive: true });
    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription plan not found" });
    }

    // Calculate expiration date based on the plan duration
    const now = new Date();
    const expiresAt = new Date(now);

    if (duration.includes("Month"))
      expiresAt.setMonth(expiresAt.getMonth() + parseInt(duration));
    if (duration.includes("Year"))
      expiresAt.setFullYear(expiresAt.getFullYear() + parseInt(duration));

    // Update user's premium status
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        premium: {
          isPremium: true,
          category: plan.type,
          duration: plan.duration,
          startedAt: now,
          expiresAt,
        },
      },
      { new: true }
    );

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Generate the expected signature
    const expectedSignature = crypto
      .createHmac("sha256", "YOUR_RAZORPAY_SECRET")
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    // Verify the signature
    if (expectedSignature !== razorpaySignature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    // Update the order status in the database
    const order = await Order.findOneAndUpdate(
      { razorpayOrderId },
      { orderStatus: "paid", razorpayPaymentId },
      { new: true }
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Payment verified successfully", order });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Get all orders with populated product and brand details
export const getOrders = async (req, res) => {
  try {
    // Validate and parse query parameters
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    // Default values for page and limit
    page = isNaN(page) || page < 1 ? 1 : page; // Default page is 1
    limit = isNaN(limit) || limit <= 0 ? 10 : limit; // Default limit is 10

    // Calculate skip value
    const skip = (page - 1) * limit;

    const { orderStatus, user, createdBy } = req.query;

    // Build the initial query object
    const query = {};
    if (orderStatus) {
      query.orderStatus = orderStatus; // Filter by orderStatus if provided
    }
    if (user === "true") {
      query.user = req.user; // Filter by user if user=true
    }

    // If createdBy=true, filter orders by products created by the logged-in user
    if (createdBy === "true") {
      const products = await Product.find({ createdBy: req.user }).select(
        "_id"
      );
      const productIds = products.map((product) => product._id);
      query["product.productId"] = { $in: productIds }; // Filter orders by these product IDs
    }

    const removeOrderStatusFromQuery = (query) => {
      const modifiedQuery = { ...query }; // Create a shallow copy of the query
      delete modifiedQuery.orderStatus; // Remove orderStatus
      return modifiedQuery;
    };

    // Get total count for the current query
    const totalOrderCount = await Order.countDocuments(
      removeOrderStatusFromQuery(query)
    );

    // Fetch paginated orders based on the query
    const orders = await Order.find(query)
      .skip(skip)
      .limit(limit)
      .populate({
        path: "product.productId",
        populate: {
          path: "brand", // Populate brand field
        },
      });

    // Aggregate counts for each orderStatus within the current query
    const orderStatusCounts = await Order.aggregate([
      {
        $match: (() => {
          const matchQuery = { ...query }; // Copy query
          delete matchQuery.orderStatus; // Remove orderStatus
          return matchQuery;
        })(),
      },
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]).then((results) =>
      results.reduce((acc, { _id, count }) => {
        acc[_id] = count;
        return acc;
      }, {})
    );

    // Manually populate the delivery address
    const populatedOrders = await Promise.all(
      orders.map(async (order) => {
        const user = await User.findById(order.user);
        const deliveryAddress = user?.deliveryAddresses.id(
          order.deliveryAddress
        );
        return {
          ...order._doc,
          deliveryAddress,
        };
      })
    );

    // Calculate pagination details
    const totalPages = Math.ceil(totalOrderCount / limit);

    // Prepare the response
    res.status(200).json({
      success: true,
      counts: {
        total: totalOrderCount, // Total orders matching the query
        byStatus: orderStatusCounts, // Counts by orderStatus within the query
      },
      pagination: {
        page,
        limit,
        currentPage: page,
        totalPages,
      },
      data: populatedOrders, // Paginated list of orders
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Get a single order by ID with populated details
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate({
        path: "product.productId",
        populate: {
          path: "brandId", // Populate brandId inside Product
        },
      })
      .populate("deliveryAddress");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Update order details (quantity or status)
export const updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { quantity, orderStatus, reasonToCancel } = req.body;

    const order = await Order.findById(orderId).populate("product.productId");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (quantity) {
      if (quantity <= 0) {
        return res
          .status(400)
          .json({ message: "Quantity must be greater than zero" });
      }
      order.product.quantity = quantity;
      order.totalAmount = order.product.productId.price * quantity;
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;
    }
    if (reasonToCancel) {
      order.reasonToCancel = reasonToCancel;
    }

    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete an order
export const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndDelete(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
