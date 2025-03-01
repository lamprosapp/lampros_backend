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
      "within_one_month",
      "one_to_three_months",
      "three_to_six_months",
      "within_one_year",
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
