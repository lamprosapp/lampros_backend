import express from "express";
import { verifyToken } from "../config/jwt.js";
import User from "../models/user.js";
import { errorResponse } from "../utils/responseHandler.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = await verifyToken(token);
      req.user = decoded.id; // Add the decoded user ID to the request object
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed", error });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

export const adminProtect = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, "Not authorized, no user found");
    }

    const user = await User.findById(req.user);
    if (!user) {
      return errorResponse(res, 401, "User not found");
    }

    if (user.role !== "Admin") {
      return errorResponse(res, 403, "Access denied, Admins only");
    }

    next(); // User has access, proceed to the next middleware
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

export const superAdminProtect = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, "Not authorized, no user found");
    }

    const user = await User.findById(req.user);
    if (!user) {
      return errorResponse(res, 401, "User not found");
    }

    if (user.type !== "super admin") {
      return errorResponse(res, 403, "Access denied, Super Admins only");
    }

    next(); // Proceed to next middleware
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

export const crmProtect = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, "Not authorized, no user found");
    }

    const user = await User.findById(req.user);
    if (!user) {
      return errorResponse(res, 401, "User not found");
    }

    if (user.type !== "CRM" && user.type !== "super admin") {
      return errorResponse(res, 403, "Access denied, CRM users only");
    }

    next(); // Proceed to next middleware
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

export const accountantProtect = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, 401, "Not authorized, no user found");
    }

    const user = await User.findById(req.user);
    if (!user) {
      return errorResponse(res, 401, "User not found");
    }

    if (user.type !== "accountant" && user.type !== "super admin") {
      return errorResponse(res, 403, "Access denied, Accountants only");
    }

    next(); // Proceed to next middleware
  } catch (error) {
    return errorResponse(res, 500, "Internal server error", error.message);
  }
};

export default protect;
