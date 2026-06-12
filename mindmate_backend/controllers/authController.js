import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import StaffProfile from '../models/StaffProfile.js';
import jwt from 'jsonwebtoken';

// 🟢 [The Ultimate Token Generator Fix]: ටෝකන් එක ජෙනරේට් කරන කොටසටම මුළු යූසර් ඔබ්ජෙක්ට් එකම පැක් කළා මචං!
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user._id, 
            name: user.name || user.username || user.fullName, // 💡 නම මොන කී එකෙන් තිබ්බත් dynamic අල්ලනවා බං
            email: user.email,
            role: user.role 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '30d' }
    );
};

// =========================================================================
// 🚀 1. REGISTRATION CONTROLLER (Handles Patient, Doctor, and Staff)
// =========================================================================
export const registerUser = async (req, res) => {
    const { name, email, password, role, phone, specialization, fee, bio, slots, address } = req.body;
    
    try {
        // 1. ඊමේල් එක දැනටමත් ඩේටාබේස් එකේ තියෙනවද බැලීම
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        // 2. ප්‍රධාන User කලෙක්ෂන් එකේ එකවුන්ට් එක සේව් කිරීම
        const user = await User.create({ name, email, password, role: role || 'Patient' });

        // 3. Role එක අනුව අදාළ කලෙක්ෂන් එකට දත්ත බෙදා හැරීම
        if (user.role === 'Doctor') {
            await DoctorProfile.create({
                userId: user._id, // 🔗 ලින්ක් එක සෙට් කළා මචං
                phone,
                specialization,
                fee: Number(fee) || 0,
                bio: bio || '',
                slots: slots || ''
            });
        } else if (user.role === 'Staff') {
            await StaffProfile.create({
                userId: user._id, // 🔗 ලින්ක් එක සෙට් කළා
                phone,
                address
            });
        }

        // 💡 [The Token Fix Applied]: රෙජිස්ටර් වෙන වෙලාවෙත් ටෝකන් එක සුපිරියටම පැක් වෙලා යනවා බං
        const token = generateToken(user);

        return res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: token, // 👈 පර්ෆෙක්ට් පැකේජ් එක
            message: `${user.role} registered successfully! 🎉`
        });

    } catch (error) {
        return res.status(500).json({ message: "Register Error: " + error.message });
    }
};

// =========================================================================
// 🔐 2. UNIVERSAL LOGIN CONTROLLER
// =========================================================================
export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        
        // 🟢 [Safe Check] - යූසර් කෙනෙක් හමුවුණොත් විතරක් පැස්වර්ඩ් චෙක් කරනවා මචං!
        if (user) {
            const isMatch = (user.password && user.password.startsWith('$2b$')) 
                ? await user.matchPassword(password) 
                : user.password === password;

            if (isMatch) {
                // 💡 [The Token Fix Applied]: ලොගින් වෙන වෙලාවේ අලුත්ම පැක් වෙච්ච සුපිරි ටෝකන් එක හැදෙනවා
                const token = generateToken(user);

                return res.status(200).json({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    token: token // 👈 මේ ටෝකන් එක දැන් ෆ්‍රන්ට්එන්ඩ් එකට සටස් ගාලා ඩේටා ටික දෙනවා මචං
                });
            }
        }
        
        return res.status(401).json({ message: 'Invalid email or password' });
    } catch (error) {
        return res.status(500).json({ message: "Login Error: " + error.message });
    }
};