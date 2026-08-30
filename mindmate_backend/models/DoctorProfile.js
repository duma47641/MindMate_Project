import mongoose from 'mongoose';

const DoctorProfileSchema = new mongoose.Schema({
    
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true 
    },
    phone: { type: String, required: true },
    specialization: { type: String, required: true },
    fee: { type: Number, required: true, min: [0, 'Fee cannot be negative'], default: 0 },
    bio: { type: String, default: '' },
    slots: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('DoctorProfile', DoctorProfileSchema);