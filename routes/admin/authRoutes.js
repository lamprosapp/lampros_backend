import express from "express";
import { Login } from "../../controllers/admin/base/loginController.js";
 
const adminAuthRoutes = express.Router();

adminAuthRoutes.post("/login", Login);

export default adminAuthRoutes;
