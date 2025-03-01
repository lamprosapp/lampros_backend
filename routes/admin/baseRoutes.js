import express from "express";
import { getAllInstantServices } from "../../controllers/admin/base/instantServiceController.js";

const adminBaseRoutes = express.Router();

adminBaseRoutes.get("/instantService", getAllInstantServices);

export default adminBaseRoutes;
