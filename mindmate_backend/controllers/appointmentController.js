import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import ChatHistory from '../models/Chat.js'; // 🔗 චැට් හිස්ට්‍රි මොඩල් එක ලස්සනට ලින්ක් කළා මචං

// =========================================================================
// 📅 1. අලුතින් Appointment එකක් බුක් කිරීම (Create Appointment)
// =========================================================================
        // 📅 1. අලුතින් Appointment එකක් බුක් කිරීම (Create Appointment) - [The Absolute Safe Fix]
export const bookAppointment = async (req, res) => {
    // 💡 ෆ්‍රන්ට්එන්ඩ් එකෙන් එවන patientId එක කෙලින්ම ගන්නවා මචං පටලැවිල්ල නැති වෙන්න
    const { doctorId, date, timeSlot, patientId } = req.body;

    try {
        if (!doctorId || !date || !timeSlot) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // 🟢 ලොග් වෙලා ඉන්නේ Patient කෙනෙක් නම්, req.user.id ගන්නවා. 
        // නැත්නම් (දොස්තර/ස්ටාෆ් බුක් කරනවා නම්) body එකෙන් එන patientId එක ගන්නවා.
        let finalPatientId = req.user?.role === 'Patient' ? req.user.id : patientId;

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

        // ඩේටාබේස් එකේ නිවැරදිව පේෂන්ට් සහ දොස්තර ලින්ක් කිරීම
        const appointment = await Appointment.create({
            patientId: finalPatientId, // 👈 දැන් හැමදාම ඇත්තම පේෂන්ට්ගේ ID එකමයි වදින්නේ බං!
            doctorId: finalDoctorUserId, 
            date,
            timeSlot
        });

        return res.status(201).json({
            message: 'Appointment booked successfully! 📅',
            appointment
        });
    } catch (error) {
        return res.status(500).json({ message: "Booking Error: " + error.message });
    }
};

// =========================================================================
// 📜 2. ලොග් වී ඉන්න පුද්ගලයාට අදාළ ඇපොයින්ට්මන්ට්ස් ලිස්ට් එක ගැනීම (Get My Appointments)
        // 📜 2. ලොග් වී ඉන්න පුද්ගලයාට අදාළ ඇපොයින්ට්මන්ට්ස් ලිස්ට් එක ගැනීම (Get My Appointments)
export const getMyAppointments = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        // 🟢 1. PATIENT WORKFLOW
        if (role === 'Patient') {
            const appointments = await Appointment.find({ patientId: userId })
                .populate('doctorId', 'name username fullName email')
                .lean();

            const fullAppointments = await Promise.all(appointments.map(async (app) => {
                let docName = 'Dr. Lasantha Wijesekara'; // Default Fallback
                let docEmail = 'clinic@mindmate.com';

                // 1. සාමාන්‍ය විදිහට Populate වුණු ඩේටා තියෙනවද බැලීම
                if (app.doctorId && app.doctorId._id) {
                    docName = app.doctorId.name || app.doctorId.username || app.doctorId.fullName || docName;
                    docEmail = app.doctorId.email || docEmail;
                    
                    // 💡 ෆ්‍රන්ට්එන්ඩ් එක ක්‍රෑෂ් නොවී පරණ විදිහටම ඩේටා කියවන්න doctorId එක Objects වලට හරවනවා මචං
                    app.doctorId.name = docName;
                    app.doctorId.email = docEmail;
                } 
                // 2. Backup: පරණ Profile ID එකක් ඩේටාබේස් එකේ තිබුණොත් ඒකෙන් නම අදින ක්‍රමය
                else {
                    const fallbackDocId = app.doctorId || 'unknown';
                    const profile = await DoctorProfile.findById(fallbackDocId).lean();
                    let finalUserId = fallbackDocId;
                    
                    if (profile) {
                        finalUserId = profile.userId;
                    }
                    
                    const user = await User.findById(finalUserId).lean();
                    if (user) {
                        docName = user.name || user.username || user.fullName || docName;
                        docEmail = user.email || docEmail;
                    }

                    // 💡 [The Magic Injector]: doctorId එක null වෙන්න නොදී අලුත් Object එකක් හදලා ෆ්‍රන්ට්එන්ඩ් එකට යවනවා බං!
                    app.doctorId = {
                        _id: finalUserId,
                        name: docName,
                        email: docEmail
                    };
                }

                // Compatibility වෙනුවෙන් ක්‍රම දෙකෙන්ම ඩේටා යවනවා මචං
                return {
                    ...app,
                    doctorDetails: { name: docName, email: docEmail, specialization: 'Mental Health Specialist', fee: 2500 }
                };
            }));

            return res.status(200).json(fullAppointments);

        } 
        // 🟢 2. DOCTOR WORKFLOW
        else if (role === 'Doctor') {
            const appointments = await Appointment.find({ doctorId: userId })
                .populate('patientId', 'name username fullName email')
                .lean();
            return res.status(200).json(appointments);
        } 
        // 🟢 3. STAFF OR ADMIN WORKFLOW
        else if (role === 'Staff' || role === 'Admin') {
            const appointments = await Appointment.find({})
                .populate('patientId', 'name username fullName email')
                .populate('doctorId', 'name username fullName email')
                .lean();

            const globalLedger = await Promise.all(appointments.map(async (app) => {
                let docName = 'Dr. Lasantha Wijesekara';
                if (app.doctorId && app.doctorId._id) {
                    docName = app.doctorId.name || app.doctorId.username || app.doctorId.fullName || docName;
                }
                if (!app.doctorId) {
                    app.doctorId = { name: docName };
                } else {
                    app.doctorId.name = docName;
                }
                return app;
            }));
            return res.status(200).json(globalLedger);
        }

    } catch (error) {
        return res.status(500).json({ message: "Fetch Error: " + error.message });
    }
};

// =========================================================================
// 🔄 3. Doctor විසින් Appointment එක Approve හෝ Cancel කිරීම
// =========================================================================
export const updateAppointmentStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const appointment = await Appointment.findById(id);
        if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

        // Staff කෙනෙක්ටත් වෙනස් කරන්න පුළුවන් වෙන්න Role Check එක හැදුවා මචං
        if (appointment.doctorId.toString() !== req.user.id && req.user.role !== 'Staff' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to update this appointment' });
        }

        appointment.status = status;
        await appointment.save();

        return res.status(200).json({ message: `Appointment status updated to ${status}! 🚀`, appointment });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// =========================================================================
// 💳 4. Patient විසින් Fake Card Payment එක සිදු කර බුකින් එක 'Paid' කිරීම
// =========================================================================
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

        return res.status(200).json({ message: 'Payment Simulated Successfully! 💳🎉', appointment });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// =========================================================================
// 📊 5. [Super Export]: දොස්තර වෙනුවෙන් පේෂන්ට්ගේ Mood Analytics (Chart Data) ලබාදීම
// =========================================================================
export const getPatientAnalyticsForDoctor = async (req, res) => {
    const { patientId } = req.params;
    const doctorId = req.user.id;

    try {
        const hasAccess = await Appointment.findOne({
            patientId,
            doctorId,
            status: 'Paid'
        });

        if (!hasAccess) {
            return res.status(403).json({ message: "Access Denied. Paid consultations only." });
        }

        const chats = await ChatHistory.find({ userId: patientId, sender: 'AI' }).sort({ createdAt: 1 });
        const analyticsMap = {};

        chats.forEach(chat => {
            const date = new Date(chat.createdAt).toISOString().split('T')[0];
            const mood = chat.sentiment || 'Normal';

            if (!analyticsMap[date]) {
                analyticsMap[date] = { date, Neutral: 0, Stress: 0, Anxiety: 0, Depression: 0, Critical: 0 };
            }

            if (mood === 'Normal' || mood === 'Neutral') analyticsMap[date].Neutral += 1;
            else if (mood === 'Stress') analyticsMap[date].Stress += 1;
            else if (mood === 'Anxiety') analyticsMap[date].Anxiety += 1;
            else if (mood === 'Depression') analyticsMap[date].Depression += 1;
            else analyticsMap[date].Critical += 1;
        });

        const chartData = Object.values(analyticsMap);
        return res.status(200).json(chartData);
    } catch (error) {
        return res.status(500).json({ message: "Analytics Error: " + error.message });
    }
};