import express from "express";
import {
  getInstantServiceById,
  getInstantServices,
  getSubcategoryDetails,
  orderInstantService,
} from "../controllers/instantServiceController.js";

const router = express.Router();

router.get("/", getInstantServices);
router.get("/:id", getInstantServiceById);
router.post("/order", orderInstantService);
router.get("/subcategory", getSubcategoryDetails);

export default router;
