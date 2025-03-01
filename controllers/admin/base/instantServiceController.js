import axios from "axios";
import { InstantService } from "../../../models/instantService.js";
import { errorResponse, successResponse } from "../../../utils/responseHandler.js";
    
export const getAllInstantServices = async (req, res) => {
    try {
      const { professionalType } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      let filter = {};
      if (professionalType) {
        filter["serviceDetails.category"] = professionalType;
      }
  
      const totalServices = await InstantService.countDocuments(filter);
      const services = await InstantService.find(filter)
        .populate({ path: "user", select: "-password" }) // Ensure correct population
        .skip(skip)
        .limit(limit);
  
      if (!services.length) {
        return errorResponse(res, 404, "No instant services found");
      }
  
      const enhancedServices = await Promise.all(
        services.map(async (service) => {
          try {
            const response = await axios.get(
              `https://pincode.vercel.app/${service.deliveryAddress.pincode}`
            );
            const { taluk, districtName, stateName, officeNames } = response.data;
  
            return {
              ...service.toObject(),
              pincodeDetails: {
                taluk,
                district: districtName,
                state: stateName,
                officeNames,
              },
            };
          } catch (error) {
            console.error(
              `Error fetching pincode details for ${service.deliveryAddress.pincode}:`,
              error.message
            );
            return { ...service.toObject(), pincodeDetails: null };
          }
        })
      );
  
      return successResponse(res, "Instant services retrieved successfully", {
        enhancedServices,
        currentPage: page,
        totalPages: Math.ceil(totalServices / limit),
        totalServices,
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Server error", error: error.message });
    }
  };