import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // 🔗 ප්‍රධාන Users කලෙක්ෂන් එකේ Patient ව ලින්ක් කළා
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // 🔗 ප්‍රධාන Users කලෙක්ෂන් එකේ Doctor ව ලින්ක් කළා
        required: true
    },
    date: {
        type: String, // 📅 උදා: "2026-06-15"
        required: true
    },
    timeSlot: {
        type: String, // ⏰ උදා: "Mon 4PM"
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Cancelled', 'Paid'],
        default: 'Pending'
    }
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', AppointmentSchema);
export default Appointment;