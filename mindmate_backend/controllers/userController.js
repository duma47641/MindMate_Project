import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import StaffProfile from '../models/StaffProfile.js';
import bcrypt from 'bcryptjs'; 

    //  1. Retrieving details of all doctors and staff members, including their profiles (Fetch All)
    export const getAllPractitioners = async (req, res) => {
     try {
        const users = await User.find({ role: { $in: ['Doctor', 'Staff'] } }).select('-password');

        const fullData = await Promise.all(users.map(async (user) => {
            const userData = user.toObject();

            if (user.role === 'Doctor') {
                const docProfile = await DoctorProfile.findOne({ userId: user._id });
                return { ...userData, ...docProfile?.toObject() }; 
            } else if (user.role === 'Staff') {
                const staffProfile = await StaffProfile.findOne({ userId: user._id });
                return { ...userData, ...staffProfile?.toObject() }; 
            }
            return userData;
        }));

        return res.status(200).json(fullData);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

//  2. Completely deleting a user and their profile from the database

export const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

       
        if (user.role === 'Doctor') {
            await DoctorProfile.findOneAndDelete({ userId: id });
        } else if (user.role === 'Staff') {
            await StaffProfile.findOneAndDelete({ userId: id });
        }

        await User.findByIdAndDelete(id);

        return res.status(200).json({ message: 'User and profile deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


 
    // 3. Updating doctor or staff details (Edit Profile)
    export const updateUser = async (req, res) => {
    const { id } = req.params; 
    const { name, phone, specialization, fee, bio, slots, address } = req.body;

    try {
        
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

       
        if (!user) return res.status(404).json({ message: 'User Account not found' });
        
        if (name) {
            user.name = name;
            await user.save();
        }

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

        return res.status(200).json({ message: `${user.role} updated successfully! ` });
    } catch (error) {
        return res.status(500).json({ message: "Update Error: " + error.message });
    }
};



        //  4. Retrieving details of all doctors, including their profiles, for the patient (Get Only Doctors)
    export const getAvailableDoctors = async (req, res) => {
    try {
        const doctors = await User.find({ role: 'Doctor' }).select('-password');

        const doctorProfiles = await Promise.all(doctors.map(async (doc) => {
            const docData = doc.toObject();
            const profile = await DoctorProfile.findOne({ userId: doc._id });
            
            return {
                ...docData,
                ...profile?.toObject() 
            };
        }));

        return res.status(200).json(doctorProfiles);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching doctors: " + error.message });
    }
};



    //  5. Logic for the doctor to change their password
    export const updateDoctorPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const doctorId = req.user.id; 

    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Both current and new passwords are required!" });
        }

        const user = await User.findById(doctorId);
        if (!user) return res.status(404).json({ message: "User not found!" });

    // 1. Check if the old password matches the one in the database.
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect! " });
        }

    // 2. Securely hash the new password.
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        await user.save();
        return res.status(200).json({ message: "Password updated successfully! 🔒🎉" });
    } catch (error) {
        return res.status(500).json({ message: "Server Error: " + error.message });
    }

    
};


//  6. Creating a new Doctor or Staff account by the Admin
export const registerUser = async (req, res) => {
    const { name, email, password, role, phone, specialization, fee, bio, slots, address } = req.body;

    try {
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required!" });
        }

        const normalizedEmail = email.toLowerCase().trim();

    // 1. Checking if the email already exists
        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: "Email already registered in system!" });
        }

    // 2. Creating the User Document
        const user = await User.create({
            name,
            email: normalizedEmail,
            password: password,
            role: role || 'Doctor'
        });

    // 3. Creating a DoctorProfile if the role is Doctor
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
    // 4. Creating a StaffProfile if the role is 'Staff'
        else if (user.role === 'Staff') {
            await StaffProfile.create({
                userId: user._id,
                name: user.name,
                phone: phone || '',
                address: address || 'Colombo, Sri Lanka'
            });
        }

        return res.status(201).json({ message: `${user.role} account created successfully! ` });
    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({ message: "Registration Failed: " + error.message });
    }
};