import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import StaffProfile from '../models/StaffProfile.js';
import bcrypt from 'bcryptjs'; // පාස්වර්ඩ් එක encrypt කරන්න

// 🩺 1. සියලුම දොස්තරලා සහ ස්ටාෆ් මෙම්බර්ස්ලාගේ විස්තර ප්‍රොෆයිල් එකත් එක්කම එකතු කර ගැනීම (Fetch All)
export const getAllPractitioners = async (req, res) => {
    try {
        // ඩේටාබේස් එකේ ඉන්න ඔක්කොම යූසර්ස්ලා ගන්නවා (Patient හැර)
        const users = await User.find({ role: { $in: ['Doctor', 'Staff'] } }).select('-password');

        // හැම යූසර් කෙනෙකුටම අදාළ Profile ඩේටා එකත් එකතු කරලා (Map කරලා) Frontend එකට යැවීම
        const fullData = await Promise.all(users.map(async (user) => {
            const userData = user.toObject();

            if (user.role === 'Doctor') {
                const docProfile = await DoctorProfile.findOne({ userId: user._id });
                return { ...userData, ...docProfile?.toObject() }; // දොස්තරගේ විස්තර එකතු කිරීම
            } else if (user.role === 'Staff') {
                const staffProfile = await StaffProfile.findOne({ userId: user._id });
                return { ...userData, ...staffProfile?.toObject() }; // ස්ටාෆ් එකේ විස්තර එකතු කිරීම
            }
            return userData;
        }));

        return res.status(200).json(fullData);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// 🗑️ 2. යූසර් කෙනෙක්ව සහ ඔහුගේ ප්‍රොෆයිල් එක ඩේටාබේස් එකෙන් සම්පූර්ණයෙන්ම මැකීම (Delete)
export const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Role එක බලලා අදාළ ප්‍රොෆයිල් කලෙක්ෂන් එකෙන්ද දත්ත මකා දැමීම
        if (user.role === 'Doctor') {
            await DoctorProfile.findOneAndDelete({ userId: id });
        } else if (user.role === 'Staff') {
            await StaffProfile.findOneAndDelete({ userId: id });
        }

        // අවසානයේ ප්‍රධාන User එකවුන්ට් එක මැකීම
        await User.findByIdAndDelete(id);

        return res.status(200).json({ message: 'User and profile deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


 
        // 🔄 3. දොස්තර කෙනෙක්ගේ හෝ ස්ටාෆ් කෙනෙක්ගේ විස්තර Update කිරීම (Edit Profile)
export const updateUser = async (req, res) => {
    const { id } = req.params; // 💡 මෙතනට එන්නේ එක්කෝ userId, නැත්නම් profileId
    const { name, phone, specialization, fee, bio, slots, address } = req.body;

    try {
        // 1. 🟢 [Smart ID Check] - මුලින්ම ID එක කෙලින්ම User එකක්ද බලනවා. 
        // නැත්නම් DoctorProfile හෝ StaffProfile එකෙන් userId එක හොයාගන්නවා මචං!
        let user = await User.findById(id);
        let userId = id;

        if (!user) {
            const docProf = await DoctorProfile.findById(id);
            if (docProf) {
                userId = docProf.userId;
                user = await User.findById(userId);
            } else {
                const staffProf = await StaffProfile.findById(id);
                if (staffProf) {
                    userId = staffProf.userId;
                    user = await User.findById(userId);
                }
            }
        }

        // තවමත් යූසර් කෙනෙක් හමුනොවුණොත් විතරක් Error එක දෙනවා
        if (!user) return res.status(404).json({ message: 'User Account not found' });
        
        // 2. ප්‍රධාන යූසර්ගේ නම අප්ඩේට් කිරීම
        if (name) {
            user.name = name;
            await user.save();
        }

        // 3. Role එක අනුව අදාළ Profile එක අප්ඩේට් කිරීම (ප්‍රධාන userId එක පාවිච්චි කරලා)
        if (user.role === 'Doctor') {
            if (fee && Number(fee) < 0) {
                return res.status(400).json({ message: 'Fee cannot be negative!' });
            }

            await DoctorProfile.findOneAndUpdate(
                { userId: userId },
                { phone, specialization, fee: Number(fee), bio, slots },
                { new: true }
            );
        } else if (user.role === 'Staff') {
            await StaffProfile.findOneAndUpdate(
                { userId: userId },
                { phone, address },
                { new: true }
            );
        }

        return res.status(200).json({ message: `${user.role} updated successfully! 🎉` });
    } catch (error) {
        return res.status(500).json({ message: "Update Error: " + error.message });
    }
};



        // 🩺 4. Patient වෙනුවෙන් සියලුම දොස්තරලාගේ විස්තර ප්‍රොෆයිල් එකත් එක්කම එකතු කර ගැනීම (Get Only Doctors)
export const getAvailableDoctors = async (req, res) => {
    try {
        // ඩේටාබේස් එකෙන් role එක 'Doctor' විතරක් තියෙන අයව හොයනවා (Email, Password වගේ රහස්‍ය දේවල් අයින් කරලා)
        const doctors = await User.find({ role: 'Doctor' }).select('-password');

        // හැම දොස්තර කෙනෙකුගේම Profile විස්තර (Specialization, Fee, Slots) ටික එකතු කරනවා
        const doctorProfiles = await Promise.all(doctors.map(async (doc) => {
            const docData = doc.toObject();
            const profile = await DoctorProfile.findOne({ userId: doc._id });
            
            return {
                ...docData,
                ...profile?.toObject() // ප්‍රොෆයිල් එකේ විස්තර ටික මෙතනට එකතු කළා මචං
            };
        }));

        return res.status(200).json(doctorProfiles);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching doctors: " + error.message });
    }
};



            // 🔒 5. දොස්තරට තමන්ගේ පාස්වර්ඩ් එක වෙනස් කරගැනීමේ ලෝජික් එක
export const updateDoctorPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const doctorId = req.user.id; // ලොග් වෙලා ඉන්න එකාගේ ID එක

    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Both current and new passwords are required!" });
        }

        const user = await User.findById(doctorId);
        if (!user) return res.status(404).json({ message: "User not found!" });

        // 1. පරණ පාස්වර්ඩ් එක හරිද කියලා ඩේටාබේස් එකත් එක්ක මැච් කරනවා
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect! ❌" });
        }

        // 2. අලුත් පාස්වර්ඩ් එක සේෆ්ටි විදිහට Hash කරනවා
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        await user.save();
        return res.status(200).json({ message: "Password updated successfully! 🔒🎉" });
    } catch (error) {
        return res.status(500).json({ message: "Server Error: " + error.message });
    }

    
};


// ➕ 6. Admin මඟින් නව Doctor හෝ Staff Account එකක් සෑදීම
export const registerUser = async (req, res) => {
    const { name, email, password, role, phone, specialization, fee, bio, slots, address } = req.body;

    try {
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required!" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Email එක කලින් තියෙනවද බැලීම
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: "Email already registered in system!" });
        }

        // 2. User Document එක සෑදීම (Plain password එක දෙන්න - User model pre-save එකෙන් hash වේ)
        const user = await User.create({
            name,
            email: normalizedEmail,
            password: password,
            role: role || 'Doctor'
        });

        // 3. Role එක Doctor නම් DoctorProfile සෑදීම
        if (user.role === 'Doctor') {
            await DoctorProfile.create({
                userId: user._id,
                name: user.name,
                phone: phone || '',
                specialization: specialization || 'Mental Health Specialist',
                fee: fee ? Number(fee) : 2500,
                bio: bio || 'Dedicated mental health specialist.',
                slots: slots || 'Morning Slot (9:00 AM), Evening Slot (4:00 PM)'
            });
        } 
        // 4. Role එක Staff නම් StaffProfile සෑදීම
        else if (user.role === 'Staff') {
            await StaffProfile.create({
                userId: user._id,
                name: user.name,
                phone: phone || '',
                address: address || 'Colombo, Sri Lanka'
            });
        }

        return res.status(201).json({ message: `${user.role} account created successfully! 🎉` });
    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({ message: "Registration Failed: " + error.message });
    }
};