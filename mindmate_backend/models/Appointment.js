import mongoose from 'mongoose';

const AppointmentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    date: {
        type: String, 
        required: true
    },
    timeSlot: {
        type: String, 
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