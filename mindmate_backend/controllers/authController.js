import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import StaffProfile from '../models/StaffProfile.js';
import jwt from 'jsonwebtoken';

//  The Ultimate Token Generator Fix
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user._id, 
            name: user.name || user.username || user.fullName, 
            email: user.email,
            role: user.role 
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '30d' }
    );
};

// =========================================================================
//  1. REGISTRATION CONTROLLER (Handles Patient, Doctor, and Staff)
export const registerUser = async (req, res) => {
    const { name, email, password, role, phone, specialization, fee, bio, slots, address } = req.body;
    
    try {
        // 1. Check if the email already exists in the database.
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        // 2. Saving the account in the main User collection

        const user = await User.create({ name, email, password, role: role || 'Patient' });

        // 3. Distributing data to the relevant collection based on the role

        if (user.role === 'Doctor') {
            await DoctorProfile.create({
                userId: user._id, 
                phone,
                specialization,
                fee: Number(fee) || 0,
                bio: bio || '',
                slots: slots || ''
            });
        } else if (user.role === 'Staff') {
            await StaffProfile.create({
                userId: user._id, 
                phone,
                address
            });
        }

        const token = generateToken(user);

        return res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: token, 
            message: `${user.role} registered successfully! `
        });

    } catch (error) {
        return res.status(500).json({ message: "Register Error: " + error.message });
    }
};

// =========================================================================
//  2.  LOGIN CONTROLLER

export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        
        
        if (user) {
            const isMatch = (user.password && user.password.startsWith('$2b$')) 
                ? await user.matchPassword(password) 
                : user.password === password;

            if (isMatch) {

                const token = generateToken(user);

                return res.status(200).json({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    token: token 
                });
            }
        }
        
        return res.status(401).json({ message: 'Invalid email or password' });
    } catch (error) {
        return res.status(500).json({ message: "Login Error: " + error.message });
    }
};


        //   ACCOUNTS UPDATE CONTROLLER (For Admin/Users)
export const updateUserProfile = async (req, res) => {
    const { name, email, phone, role, specialization, fee, address } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User profile not found' });

    // 1. Updating data in the main User model
        user.name = name || user.name;
        user.email = email || user.email;
        if (role) user.role = role;
        await user.save();

    // 2. Updating data in the relevant Profile collection based on the role
        if (user.role === 'Doctor') {
            await DoctorProfile.findOneAndUpdate(
                { userId: user._id },
                { phone, specialization, fee: Number(fee) || 0 },
                { upsert: true }
            );
        } else if (user.role === 'Staff') {
            await StaffProfile.findOneAndUpdate(
                { userId: user._id },
                { phone, address },
                { upsert: true }
            );
        }

        return res.status(200).json({ message: `${user.role} account updated successfully! 🎉` });
    } catch (error) {
        return res.status(500).json({ message: "Update Error: " + error.message });
    }
};