import express from "express";
import { AddConsultation, getAllConsultations } from "../../controllers/admin/crm/consultation.js";

const crmRoutes = express.Router();

crmRoutes.post("/add-consultation", AddConsultation);
crmRoutes.get("/consultations", getAllConsultations);

export default crmRoutes;
