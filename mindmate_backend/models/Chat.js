import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    sender: {
        type: String,
        enum: ['User', 'AI'],
        required: true
    },
    sentiment: {
        type: String,
        default: 'Neutral'
    },
    confidenceScore: {
        type: Number,
        default: 0.0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Chat', ChatSchema);