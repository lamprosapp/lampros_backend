import express from "express";
import { createEnquiry, getEnquiriesById, getEnquiriesByType } from "../controllers/enq.js";

const router = express.Router();

// POST route to create an enquiry
router.route("/enquiries").post(createEnquiry).get(getEnquiriesByType);
router.get("/myEnquiries",getEnquiriesById)
export default router;
