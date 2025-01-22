import SubscriptionPlan from "../models/subscriptionPlanModel.js";

export const getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ duration: 1 });
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch plans', error: error.message });
  }
};
