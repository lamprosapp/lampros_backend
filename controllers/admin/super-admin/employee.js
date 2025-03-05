import {
  errorResponse,
  successResponse,
} from "../../../utils/responseHandler.js";
import User from "../../../models/user.js";

export const generateEmployee = async (req, res, next) => {
  try {
    const { user } = req;
    const {
      username,
      fname,
      lname,
      email,
      password,
      phoneNumber,
      age,
      gender,
      type,
      status,
      address,
    } = req.body;

    const currentUser = await User.findById(user);

    // Check if the user making the request is a super admin
    if (
      !currentUser ||
      currentUser.role !== "Admin" ||
      currentUser.type !== "super admin"
    ) {
      return errorResponse(
        res,
        403,
        "Unauthorized! Only Super Admins can create employees."
      );
    }

    // Validate role type
    const allowedRoles = ["super admin", "CRM", "accountant"];
    if (!allowedRoles.includes(type)) {
      return errorResponse(res, 400, "Invalid role type.");
    }

    // Check if phone number already exists
    const existingUser = await User.findOne({
      $or: [{ phoneNumber }],
    });
    if (existingUser) {
      return errorResponse(res, 401, "Email or phone number already exists.");
    }

    // Create new employee
    const newEmployee = new User({
      fname,
      lname,
      email,
      password,
      phoneNumber,
      age,
      gender,
      role: "Admin",
      type,
      status,
      address,
      adminDetails: {
        status: status || "active",
        username,
      },
    });

    await newEmployee.save();

    return successResponse(
      res,
      "Employee created successfully.",
      newEmployee.toObject()
    );
  } catch (error) {
    next(error);
  }
};
