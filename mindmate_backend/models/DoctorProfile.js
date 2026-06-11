import mongoose from 'mongoose';

const DoctorProfileSchema = new mongoose.Schema({
    // 🔗 ප්‍රධාන User කලෙක්ෂන් එකට ලින්ක් කරන අඩිතාලම (Foreign Key/Ref)
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true // එක දොස්තර කෙනෙකුට තිබිය හැක්කේ එක ප්‍රොෆයිලයක් පමණි
    },
    phone: { type: String, required: true },
    specialization: { type: String, required: true },
    fee: { type: Number, required: true, min: [0, 'Fee cannot be negative'], default: 0 },
    bio: { type: String, default: '' },
    slots: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('DoctorProfile', DoctorProfileSchema);