import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
    {
        duration: {
            type: String,
            required: true,
            enum: ['1 Month', '6 Months', '12 Months'], // Valid durations for premium plans
            unique: true
        },
        price: {
            type: Number,
            required: true,
            min: 0, // Ensures non-negative price
        },
        description: {
            type: String,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true, // Indicates whether the plan is currently active
        },
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Compile the schema into a model
const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
