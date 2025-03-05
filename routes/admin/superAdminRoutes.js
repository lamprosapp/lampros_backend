import express from "express";
import { generateEmployee } from "../../controllers/admin/super-admin/employee.js";
 
const superAdminRoutes = express.Router();

superAdminRoutes.post("/add-employee", generateEmployee);

export default superAdminRoutes;
