import express from "express";
import {
  getAllInstantServices,
  getInstantServiceById,
  getInstantServices,
  getSubcategoryDetails,
  orderInstantService,
} from "../controllers/instantServiceController.js";

const router = express.Router();

router.get("/", getInstantServices);
router.get("/all", getAllInstantServices);
router.get("/:id", getInstantServiceById);
router.post("/order", orderInstantService);
router.get("/subcategory", getSubcategoryDetails);

export default router;
