import bcrypt from "bcrypt";
import User from "../../../models/user.js";
import {
  errorResponse,
  successResponse,
} from "../../../utils/responseHandler.js";
import { generateToken } from "../../../config/jwt.js";

export const Login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return errorResponse(res, 400, "Email, password, and role are required");
    }

    // Ensure the role is valid
    const validRoles = ["CRM", "super admin", "accountant"];
    if (!validRoles.includes(role)) {
      return errorResponse(res, 400, "Invalid role provided");
    }

    // Find the user by email and role
    const user = await User.findOne({ email, type: role });
    if (!user) {
      return errorResponse(res, 404, "Access denied: Insufficient permissions");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    // Check if user is active
    //   if (user.status === "inactive") {
    //     return errorResponse(res, 403, "User account is inactive. Contact admin.");
    //   }

    // Generate JWT token using the utility function
    const token = generateToken(user._id);

    return successResponse(res, `${role} Login successful.`, {
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        type: user.type,
        name: `${user.fname} ${user.lname}`,
        data: user,
      },
    });
  } catch (error) {
    next(error);
  }
};
