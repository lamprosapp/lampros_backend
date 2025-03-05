import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
    },
    place: {
      type: String,
      required: [true, "Place is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      match: [/.+\@.+\..+/, "Invalid email address"], // Basic email validation
    },
    specifications: {
      type: String,
    },
    expectedStartDate: {
      type: String,
      required: [true, "Expected start date is required"],
      enum: [
        "immediately",
        "within 1 month",
        "1-3 months",
        "3-6 months",
        "within 1 year",
      ],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Consultation = mongoose.model("Consultation", consultationSchema);

export default Consultation;
