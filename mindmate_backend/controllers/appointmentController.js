import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import ChatHistory from '../models/Chat.js';
import { sendAppointmentEmail } from '../utils/emailHelper.js';

// =========================================================================
//  1. Channeling & Appointment Reservation

export const bookAppointment = async (req, res) => {
    const { doctorId, date, timeSlot, patientId } = req.body;

    try {
        if (!doctorId || !date || !timeSlot) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const userRole = (req.user?.role || '').toLowerCase();
        let finalPatientId = userRole === 'patient' ? (req.user.id || req.user._id) : (patientId || req.user.id || req.user._id);

        if (!finalPatientId) {
            return res.status(400).json({ message: 'Patient ID is required to anchor consultation record!' });
        }

        // Doctor ID Validation
        let finalDoctorUserId = doctorId;
        const profileCheck = await DoctorProfile.findById(doctorId);
        if (profileCheck) {
            finalDoctorUserId = profileCheck.userId;
        } else {
            const userCheck = await User.findById(doctorId);
            if (!userCheck) {
                const profileByUserId = await DoctorProfile.findOne({ userId: doctorId });
                if (profileByUserId) {
                    finalDoctorUserId = doctorId;
                }
            }
        }

        const appointment = await Appointment.create({
            patientId: finalPatientId,
            doctorId: finalDoctorUserId,
            date,
            timeSlot
        });

        return res.status(201).json({
            message: 'Appointment booked successfully! ',
            appointment
        });
    } catch (error) {
        return res.status(500).json({ message: "Booking Error: " + error.message });
    }
};

    // =========================================================================
    //  2.Get My Appointments

    export const getMyAppointments = async (req, res) => {
    const userId = req.user.id || req.user._id;
    const userRole = (req.user?.role || '').toLowerCase();

    try {
        //  1. PATIENT WORKFLOW
        if (userRole === 'patient' || !userRole) {
            const appointments = await Appointment.find({ patientId: userId })
                .populate('doctorId', 'name username fullName email')
                .lean();

            const fullAppointments = await Promise.all(appointments.map(async (app) => {
                let docName = 'Dr. Arshad Rahman';
                let docEmail = 'clinic@mindmate.com';
                let docSpecialization = 'Mental Health Specialist';
                let docFee = 2500;

                const docUserId = app.doctorId?._id || app.doctorId;

                if (docUserId) {
                    // Retrieving the correct fee and specialization from the DoctorProfile

                    const profile = await DoctorProfile.findOne({
                        $or: [{ userId: docUserId }, { _id: docUserId }]
                    }).lean();

                    if (profile) {
                        docName = profile.name || app.doctorId?.name || docName;
                        docSpecialization = profile.specialization || docSpecialization;
                        docFee = profile.fee !== undefined ? Number(profile.fee) : docFee;
                    } else if (app.doctorId && typeof app.doctorId === 'object') {
                        docName = app.doctorId.name || app.doctorId.username || docName;
                        docEmail = app.doctorId.email || docEmail;
                    }
                }

                return {
                    ...app,
                    doctorId: {
                        _id: docUserId,
                        name: docName,
                        email: docEmail
                    },
                    doctorDetails: {
                        name: docName,
                        email: docEmail,
                        specialization: docSpecialization,
                        fee: docFee
                    }
                };
            }));

            return res.status(200).json(fullAppointments);
        } 
        //  2. DOCTOR WORKFLOW
        else if (userRole === 'doctor') {
            const appointments = await Appointment.find({ doctorId: userId })
                .populate('patientId', 'name username fullName email')
                .lean();
            return res.status(200).json(appointments);
        } 
        //  3. STAFF OR ADMIN WORKFLOW
        else if (userRole === 'staff' || userRole === 'admin') {
            const appointments = await Appointment.find({})
                .populate('patientId', 'name username fullName email')
                .populate('doctorId', 'name username fullName email')
                .lean();

            const globalLedger = await Promise.all(appointments.map(async (app) => {
                let docName = app.doctorId?.name || 'Dr. Arshad Rahman';
                let docSpecialization = 'Mental Health Specialist';
                let docFee = 2500;

                const docUserId = app.doctorId?._id || app.doctorId;
                if (docUserId) {
                    const profile = await DoctorProfile.findOne({
                        $or: [{ userId: docUserId }, { _id: docUserId }]
                    }).lean();
                    if (profile) {
                        docName = profile.name || docName;
                        docSpecialization = profile.specialization || docSpecialization;
                        docFee = profile.fee !== undefined ? Number(profile.fee) : docFee;
                    }
                }

                return {
                    ...app,
                    doctorId: { ...app.doctorId, name: docName },
                    doctorDetails: {
                        name: docName,
                        email: app.doctorId?.email || 'clinic@mindmate.com',
                        specialization: docSpecialization,
                        fee: docFee
                    }
                };
            }));

            return res.status(200).json(globalLedger);
        }

    } catch (error) {
        return res.status(500).json({ message: "Fetch Error: " + error.message });
    }
};

// =========================================================================
//  3. Approval or cancellation of the appointment by the doctor

export const updateAppointmentStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = (req.user?.role || '').toLowerCase();
    const userId = req.user.id || req.user._id;

    try {
        const appointment = await Appointment.findById(id)
            .populate('patientId', 'name username email')
            .populate('doctorId', 'name email');

        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        if (appointment.doctorId?._id?.toString() !== userId.toString() && userRole !== 'staff' && userRole !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this appointment' });
        }

        appointment.status = status;
        await appointment.save();

        //  Automated Email Notification
        if (status === 'Approved' || status === 'Cancelled') {
            const patientEmail = appointment.patientId?.email;
            const patientName = appointment.patientId?.name || appointment.patientId?.username || 'Valued Patient';
            const doctorName = appointment.doctorId?.name || 'Clinical Practitioner';

            if (patientEmail) {
                sendAppointmentEmail(
                    patientEmail,
                    patientName,
                    doctorName,
                    appointment.date,
                    appointment.timeSlot,
                    status
                );
            }
        }

        return res.status(200).json({ message: `Appointment status updated to ${status}! `, appointment });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// =========================================================================
//  4. Patient Make  Payment

export const processAppointmentPayment = async (req, res) => {
    const { id } = req.params;
    const { cardNumber, expiry, cvv } = req.body;

    try {
        if (!cardNumber || !expiry || !cvv) {
            return res.status(400).json({ message: 'All card details are required for simulation!' });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        if (appointment.status !== 'Approved') {
            return res.status(400).json({ message: 'Appointment must be Approved before payment!' });
        }

        appointment.status = 'Paid';
        await appointment.save();

        return res.status(200).json({ message: 'Payment Simulated Successfully! 💳', appointment });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// =========================================================================
//  5. Mood Analytics Chart Data

export const getPatientAnalyticsForDoctor = async (req, res) => {
    const { patientId } = req.params;
    const doctorId = req.user.id || req.user._id;

    try {
        const hasAccess = await Appointment.findOne({
            patientId,
            doctorId,
            status: 'Paid'
        });

        if (!hasAccess && (req.user?.role || '').toLowerCase() !== 'admin') {
            return res.status(403).json({ message: "Access Denied. Paid consultations only." });
        }

        const chats = await ChatHistory.find({
            $or: [{ userId: patientId }, { patientId: patientId }]
        }).sort({ createdAt: 1 });

        const analyticsMap = {};

        chats.forEach(chat => {
            const date = new Date(chat.createdAt).toISOString().split('T')[0];
            let mood = chat.sentiment || 'Neutral';

            if (mood.includes('Normal') || mood.includes('Stable')) mood = 'Neutral';
            if (mood.includes('Crisis') || mood.includes('Suicidal')) mood = 'Critical';

            if (!analyticsMap[date]) {
                analyticsMap[date] = { date, Neutral: 0, Stress: 0, Anxiety: 0, Depression: 0, Critical: 0 };
            }

            if (analyticsMap[date][mood] !== undefined) {
                analyticsMap[date][mood] += 1;
            } else {
                analyticsMap[date]['Neutral'] += 1;
            }
        });

        const chartData = Object.values(analyticsMap);
        return res.status(200).json(chartData);
    } catch (error) {
        return res.status(500).json({ message: "Analytics Error: " + error.message });
    }
};