import mongoose from 'mongoose';

const DeletionLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true },
    userDetails: {
        phoneNumber: { type: String, required: true },
        email: { type: String, required: true },
        createdAt: { type: Date, required: true },
    },
    deletedAt: { type: Date, default: Date.now },
});

const DeletionLog = mongoose.model('DeletionLog', DeletionLogSchema);

export default DeletionLog;
