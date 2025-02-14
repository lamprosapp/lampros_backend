import User from "../models/user.js";
import Enquiry from "../models/enq.js";
import axios from "axios";
import { errorResponse, successResponse } from "../utils/responseHandler.js";

const createEnquiry = async (req, res) => {
  try {
    const {
      type,
      category,
      bhkCount,
      areaSqFt,
      budgetINR,
      lookingFor,
      timelineMonths,
      pincode,
      interested,
      moreDetails,
      scopes,
      quantity,
      doorsType,
      materials,
      planToBuyInMonths,
      serviceLookingFor,
    } = req.body;

    const userId = req.user;

    if (!type || type.length === 0 || !category.trim() || !pincode.trim()) {
      return errorResponse(
        res,
        400,
        "Type, category, and pincode are required and cannot be empty."
      );
    }

    // Create a new enquiry with the data from the request
    const newEnquiry = new Enquiry({
      userId,
      type,
      category,
      bhkCount,
      areaSqFt,
      budgetINR,
      lookingFor,
      timelineMonths,
      pincode,
      interested,
      moreDetails,
      scopes,
      quantity,
      doorsType,
      materials,
      planToBuyInMonths,
      serviceLookingFor,
      createdBy: req.user, // Set the user ID as the creator
      createdAt: new Date(), // Store enquiry creation timestamp
    });

    // Save the enquiry to the database
    await newEnquiry.save();

    return successResponse(res, "Enquiry created successfully", {
      enquiry: newEnquiry,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server Error", error);
  }
};

const getEnquiriesByType = async (req, res) => {
  try {
    const { type } = req.query; // Get type from query parameters (optional)

    // Get page and limit from query parameters, with default values
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userFilter = req.query.user === "true"; // Check if 'user=true' is passed in the query
    const userId = req.user; // Correct way to access pincode
    const user = await User.findById(userId);
    const userPincode = user.address.pincode;
    console.log(user);
    // Build the query filter
    let filter = {};
    if (type) {
      filter.type = { $in: [type] }; // Check if the single type exists in the array
    }

    if (userFilter) {
      filter.createdBy = req.user;
    }
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter based on enquiry age and pincode
    filter.$or = [
      { createdAt: { $gte: oneDayAgo }, pincode: userPincode }, // Enquiries <24h only for same pincode professionals
      { createdAt: { $lt: oneDayAgo } }, // Older enquiries visible to all
    ];

    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Fetch paginated enquiries with the filter applied
    const enquiries = await Enquiry.find(filter)
      .populate("createdBy", "-deliveryAddresses")
      .skip(skip)
      .limit(limit);

    // Fetch pincode details dynamically for each enquiry
    const enhancedEnquiries = await Promise.all(
      enquiries.map(async (enquiry) => {
        try {
          const response = await axios.get(
            `https://pincode.vercel.app/${enquiry.pincode}`
          );
          const { taluk, districtName, stateName, officeNames } = response.data;

          return {
            ...enquiry.toObject(),
            pincodeDetails: {
              taluk,
              district: districtName,
              state: stateName,
              officeNames,
            },
          };
        } catch (error) {
          console.error(
            `Error fetching pincode details for ${enquiry.pincode}:`,
            error.message
          );
          return {
            ...enquiry.toObject(),
            pincodeDetails: null, // Default value if the API call fails
          };
        }
      })
    );

    // Get the total count of documents based on the filter
    const totalEnquiries = await Enquiry.countDocuments(filter);

    res.status(200).json({
      message: "Enquiries fetched successfully",
      currentPage: page,
      totalPages: Math.ceil(totalEnquiries / limit),
      totalEnquiries,
      enquiries: enhancedEnquiries,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server Error", error);
  }
};

const getEnquiriesById = async (req, res) => {
  try {
    const userId = req.user;

    if (!userId) {
      return errorResponse(res, 400, "User ID not found");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const enquiries = await Enquiry.find({ userId })
      .populate("createdBy", "-deliveryAddresses")
      .skip(skip)
      .limit(limit)
      .lean();

    const totalEnquiries = await Enquiry.countDocuments({ userId });

    return res.status(200).json({
      message: "User enquiries fetched successfully",
      currentPage: page,
      totalPages: Math.ceil(totalEnquiries / limit),
      totalEnquiries,
      enquiries,
    });
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server Error", error);
  }
};

export { createEnquiry, getEnquiriesByType, getEnquiriesById };
