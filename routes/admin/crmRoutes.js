import express from "express";
import { AddConsultation } from "../../controllers/admin/crm/consultation.js";

const crmRoutes = express.Router();

crmRoutes.post("/add-consultation", AddConsultation);

export default crmRoutes;
