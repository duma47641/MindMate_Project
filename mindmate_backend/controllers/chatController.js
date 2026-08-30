import Chat from '../models/Chat.js';
import axios from 'axios';

//  Send a message to AI, analyze sentiment, and save to history

export const sendMessage = async (req, res) => {
    const { message } = req.body;
    const patientId = req.user.id || req.user._id; 

    if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message cannot be empty' });
    }

    try {
    // 1. Saving the user's message to the database
        const userChatLog = await Chat.create({
            patientId,
            message: message.trim(),
            sender: 'User'
        });

    // 2. Sending the message to the Python AI server via an HTTP request
        const aiServiceUrl = 'http://127.0.0.1:8000/chat';
        let bot_reply = "I hear you, and I am here to support you.";
        let sentiment = "Normal / Stable";
        let confidence_score = 0.95;

        try {
            const aiResponse = await axios.post(aiServiceUrl, { message: message.trim() });
            bot_reply = aiResponse.data.bot_reply || bot_reply;
            sentiment = aiResponse.data.sentiment || sentiment;
            confidence_score = aiResponse.data.confidence_score !== undefined ? aiResponse.data.confidence_score : confidence_score;
        } catch (aiErr) {
            console.error('FastAPI Microservice Connection Error:', aiErr.message);
            return res.status(503).json({ 
                bot_reply: 'AI Clinical Assistant is temporarily offline. Please try again shortly.',
                sentiment: 'Normal / Stable',
                confidence_score: 0.0
            });
        }

    // 3. Updating the previously saved user message with the sentiment derived from the AI
        userChatLog.sentiment = sentiment;
        userChatLog.confidenceScore = confidence_score;
        await userChatLog.save();

    // 4. Saving the AI's response (Bot Reply) to the database as a new document
        await Chat.create({
            patientId,
            message: bot_reply,
            sender: 'AI',
            sentiment,
            confidenceScore: confidence_score
        });

    // 5. Sending the response and analytics details to the frontend
        return res.status(200).json({
            user_message: message,
            bot_reply,
            sentiment,
            confidence_score
        });

    } catch (error) {
        console.error('Chat Error:', error.message);
        return res.status(500).json({ 
            message: 'Internal Server Error',
            bot_reply: 'An unexpected internal error occurred.',
            sentiment: 'Normal / Stable'
        });
    }
};

//     Get complete chat history for a specific patient

export const getChatHistory = async (req, res) => {
    try {
        const patientId = req.user.id || req.user._id;
    // Retrieving all chat messages related to the logged-in patient in ascending order (from oldest to newest)
        const history = await Chat.find({ patientId }).sort({ createdAt: 1 });
        return res.status(200).json(history);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

//  Get patient chat/mood history for Doctor Dashboard
//  GET /api/chat/patient-history/ patientId

export const getPatientMoodHistory = async (req, res) => {
    try {
        const { patientId } = req.params;

        
        const history = await Chat.find({
            $or: [{ patientId: patientId }, { userId: patientId }]
        }).sort({ createdAt: 1 });

        if (!history || history.length === 0) {
            return res.status(200).json([]);
        }

        const formattedData = history.map((item, index) => {
            let moodLabel = item.sentiment || "Neutral";
            
            // Label Normalization 
            if (moodLabel.includes("Normal") || moodLabel.includes("Stable")) moodLabel = "Neutral";
            if (moodLabel.includes("Crisis") || moodLabel.includes("Suicidal")) moodLabel = "Critical";

            return {
                session: `Log ${index + 1}`,
                sentiment: moodLabel,
                confidence: item.confidenceScore || 0.9,
                date: new Date(item.createdAt).toLocaleDateString(),
                message: item.message,
                sender: item.sender
            };
        });

        return res.status(200).json(formattedData);
    } catch (error) {
        console.error("Error fetching patient mood history:", error.message);
        return res.status(500).json({ message: "Failed to fetch mood history" });
    }
};