import mongoose from "mongoose";

const InstantSubCatSchema = new mongoose.Schema(
  {
    title: { type: String },
    image: { type: String },
    services: [{ type: String }],
    price: {
      type: Map,
      of: String,
    },
    serviceType: {
      type: [String],
      enum: ["Repair and Service", "Installation", "Uninstallation"],
    },
    description: { type: String },
  },
  { timestamps: true }
);

const InstantCatSchema = new mongoose.Schema(
  {
    categoryName: { type: String },
    subcategories: [InstantSubCatSchema],
  },
  { timestamps: true }
);

const InstantServiceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deliveryAddress: {
      fullName: String,
      mobile: String,
      altMobile: String,
      pincode: Number,
      district: String,
      city: String,
      address: String,
      landmark: String,
    },
    serviceDetails: {
      category: { type: String, required: true },
      title: { type: String, required: true },
      image: { type: String, required: true },
      description: { type: String, required: true },
      serviceType: { type: String, required: true },
      price: { type: String, required: true },
    },
    date: { type: Date, required: true },
    userDescription: { type: String },
  },
  { timestamps: true }
);

export const InstantCategory = mongoose.model(
  "InstantCategory",
  InstantCatSchema
);
export const InstantService = mongoose.model(
  "InstantService",
  InstantServiceSchema
);
