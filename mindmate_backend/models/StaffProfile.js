import mongoose from 'mongoose';

const StaffProfileSchema = new mongoose.Schema({
    // 🔗 ප්‍රධාන User කලෙක්ෂන් එකට ලින්ක් කිරීම
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true 
    },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('StaffProfile', StaffProfileSchema);