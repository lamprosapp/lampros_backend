import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
    },

    bhkCount: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    areaSqFt: {
      type: String,
    },

    budgetINR: {
      type: String,
    },

    lookingFor: {
      type: String,
    },

    serviceLookingFor: [
      {
        type: String,
      },
    ],

    timelineMonths: {
      type: String,
    },

    pincode: {
      type: String,
      required: true,
    },

    interested: {
      type: String,
    },

    moreDetails: {
      type: String,
      default: "",
    },

    scopes: [
      {
        type: String,
      },
    ],

    quantity: {
      type: String,
    },

    doorsType: [
      {
        type: String,
      },
    ],

    type: {
      type: [String],
      required: true,
    },

    materials: [
      {
        type: String,
      },
    ],

    planToBuyInMonths: {
      type: String,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }, // Added timestamp
  },
  { timestamps: true }
);

const Enquiry = mongoose.model("Enquiry", enquirySchema);

export default Enquiry;
