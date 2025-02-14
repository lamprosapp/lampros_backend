import express from "express";
import {
  getInstantServices,
  getSubcategoryDetails,
  orderInstantService,
} from "../controllers/instantServiceController.js";

const router = express.Router();

router.get("/", getInstantServices);
router.post("/order", orderInstantService);
router.get("/subcategory", getSubcategoryDetails);

export default router;
