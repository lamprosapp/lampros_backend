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
        "within_one_month",
        "one_to_three_months",
        "three_to_six_months",
        "within_one_year",
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
