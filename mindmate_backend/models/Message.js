import mongoose from 'mongoose';

// 💬 Doctor <-> Patient මානුෂීය චැට් එක සේව් කරගන්නා ඩේටාබේස් ස්කීමා එක බෝක්කා
const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true }); // මෙතනින් මැසේජ් එක ලොග් වුණු වෙලාව ඔටෝම සේව් වෙයි

export default mongoose.model('Message', messageSchema);