import { InstantCategory, InstantService } from "../models/instantService.js";
import User from "../models/user.js";
import { errorResponse, successResponse } from "../utils/responseHandler.js";
import { sendNotificationToMultipleDevices } from "./notification.js";

export const orderInstantService = async (req, res) => {
  try {
    const {
      deliveryAddressId,
      categoryName,
      subcategoryName,
      serviceType,
      date,
      userDescription,
    } = req.body;
    const type = "Instant Service";
    const userId = req.user;

    if (
      !userId ||
      !deliveryAddressId ||
      !categoryName ||
      !subcategoryName ||
      !serviceType ||
      !date
    ) {
      return errorResponse(res, 400, "All fields are required");
    }

    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, 404, "User not found");
    }
    const deliveryAddress = user.deliveryAddresses.id(deliveryAddressId);
    if (!deliveryAddress) {
      return errorResponse(res, 404, "Delivery address not found");
    }

    // Find the category
    const category = await InstantCategory.findOne({ categoryName });
    if (!category) {
      return errorResponse(res, 404, "Category not found");
    }

    // Find the subcategory inside the category
    const subcategory = category.subcategories.find(
      (sub) => sub.title === subcategoryName
    );
    if (!subcategory) {
      return errorResponse(res, 404, "Subcategory not found");
    }

    // Validate service type
    if (!subcategory.serviceType.includes(serviceType)) {
      return errorResponse(
        res,
        400,
        "Invalid service type for this subcategory"
      );
    }

    // Get the price for the selected service type
    const price = subcategory.price.get(serviceType);
    if (!price) {
      return errorResponse(
        res,
        400,
        "Price not found for selected service type"
      );
    }

    const professionals = await User.find({
      "companyDetails.companyAddress.pincode": deliveryAddress.pincode,
      type: categoryName,
    });

    if (professionals.length === 0) {
      return res
        .status(200)
        .json({ message: "No professionals available for this service" });
    }
    // Create the instant service order
    const newService = new InstantService({
      user: userId,
      deliveryAddress: {
        fullName: deliveryAddress.fullName,
        mobile: deliveryAddress.mobile,
        altMobile: deliveryAddress.altMobile,
        pincode: deliveryAddress.pincode,
        district: deliveryAddress.district,
        city: deliveryAddress.city,
        address: deliveryAddress.address,
        landmark: deliveryAddress.landmark,
      },
      serviceDetails: {
        category: categoryName,
        title: subcategory.title,
        image: subcategory.image,
        description: subcategory.description,
        serviceType,
        price,
      },
      date,
      userDescription,
    });

    await newService.save();
    // console.log("professionals", professionals);
    // Send push notifications to professionals
    const professionalTokens = professionals
      .map((prof) => prof.token)
      .filter((tok) => tok); // Collect tokens of professionals
    // console.log("tokens", professionalTokens);
    if (professionalTokens.length > 0) {
      const title = "New Instant Service Order";
      const body = `A new service order has been placed. Click to view details.`;

      // Call the notification function to send to all professionals at once
      const response = await sendNotificationToMultipleDevices(
        professionalTokens,
        title,
        body,
        professionals.map((prof) => prof._id), // Passing userId for each professional
        type
      );
      console.log("Successfully Sent Notification ✅", response);
    }

    return successResponse(
      res,
      "Instant service ordered successfully",
      newService
    );
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export const getInstantServices = async (req, res) => {
  try {
    const { professionalType } = req.query;

    const filter = professionalType
      ? { "serviceDetails.category": professionalType }
      : {};
    const services = await InstantService.find(filter);

    if (!services.length) {
      return errorResponse(res, 404, "No instant services found");
    }

    return successResponse(res, "Instant services retrieved successfully", {
      total: services.length,
      services,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export const getSubcategoryDetails = async (req, res) => {
  try {
    const { subcategoryName } = req.query;

    if (!subcategoryName) {
      return errorResponse(res, 400, "Subcategory name is required");
    }

    // Find the category that contains the subcategory
    const category = await InstantCategory.findOne({
      "subcategories.title": subcategoryName,
    }).lean()

    if (!category) {
      return errorResponse(res, 404, "Subcategory not found");
    }

    // Extract the specific subcategory
    const subcategory = category.subcategories.find(
      (sub) => sub.title === subcategoryName
    );

    if (!subcategory) {
      return errorResponse(res, 404, "Subcategory not found");
    }

    return successResponse(
      res,
      "Subcategory fetched successfully",
      subcategory
    );
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
