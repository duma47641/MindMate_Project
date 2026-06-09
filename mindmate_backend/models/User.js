import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['Patient', 'Doctor', 'Admin', 'Staff'], 
        default: 'Patient' 
    },
    createdAt: { type: Date, default: Date.now }
});

// 🔒 modern Mongoose වල next() නැතුව කෙලින්ම async/await වලින් පමණක් ලියන ක්‍රමය:
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', UserSchema);