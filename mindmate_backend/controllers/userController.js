import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import StaffProfile from '../models/StaffProfile.js';

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