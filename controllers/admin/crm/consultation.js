import Consultation from "../../../models/Consultation.js";
import {
  errorResponse,
  successResponse,
} from "../../../utils/responseHandler.js";

export const AddConsultation = async (req, res, next) => {
  try {
    const {
      customerName,
      place,
      phoneNumber,
      email,
      specifications,
      expectedStartDate,
    } = req.body;

    if (
      !customerName ||
      !place ||
      !phoneNumber ||
      !email ||
      !expectedStartDate
    ) {
      return errorResponse(res, 400, "All required fields must be filled.");
    }

    // Validate email format
    if (!/.+\@.+\..+/.test(email)) {
      return errorResponse(res, 400, "Invalid email format.");
    }

    // Check if expectedStartDate is valid
    const validStartDates = [
      "immediately",
      "within 1 month",
      "1-3 months",
      "3-6 months",
      "within 1 year",
    ];

    if (!validStartDates.includes(expectedStartDate)) {
      return errorResponse(res, 400, "Invalid expected start date.");
    }

    // Create new consultation record
    const newConsultation = new Consultation({
      customerName,
      place,
      phoneNumber,
      email,
      specifications,
      expectedStartDate,
    });

    // Save to database
    await newConsultation.save();

    return successResponse(
      res,
      "Consultation added successfully",
      newConsultation.toObject()
    );
  } catch (error) {
    next(error); // Pass error to global error handler
  }
};

export const getAllConsultations = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;

    const query = search
      ? {
          $or: [
            { customerName: { $regex: search, $options: "i" } },
            { place: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const totalConsultations = await Consultation.countDocuments(query);
    const consultations = await Consultation.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    if (!consultations.length) {
      return errorResponse(res, 404, "No consultations found");
    }

    return successResponse(res, "Consultations fetched successfully", {
      consultations,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalConsultations / limit),
      totalConsultations,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
