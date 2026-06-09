import Chat from '../models/Chat.js';
import axios from 'axios';

// @desc    Send a message to AI, analyze sentiment, and save to history
// @route   POST /api/chat/message
export const sendMessage = async (req, res) => {
    const { message } = req.body;
    const patientId = req.user.id; // අර protect middleware එකෙන් අපිට හම්බෙන ලොග් වෙච්ච User ID එක

    if (!message) {
        return res.status(400).json({ message: 'Message cannot be empty' });
    }

    try {
        // 1. යූසර්ගේ මැසේජ් එක ඩේටාබේස් එකේ සේව් කිරීම
        const userChatLog = await Chat.create({
            patientId,
            message,
            sender: 'User'
        });

        // 2. Python AI Server එකට මැසේජ් එක HTTP Request එකක් හරහා යැවීම
        // (මතක ඇතුව ඔයාගේ Python app.py එක පසුබිමෙන් රන් වෙලා තියෙන්න ඕනේ!)
        const aiServiceUrl = 'http://localhost:8000/chat';
        const aiResponse = await axios.post(aiServiceUrl, { message });
        
        const { bot_reply, sentiment, confidence_score } = aiResponse.data;

        // 3. AI එකෙන් ආපු Sentiment එක කලින් සේව් කරපු යූසර්ගේ මැසේජ් එකට අප්ඩේට් කිරීම
        userChatLog.sentiment = sentiment;
        userChatLog.confidenceScore = confidence_score;
        await userChatLog.save();

        // 4. AI එක දුන්න පිළිතුර (Bot Reply) අලුත් ඩොකියුමන්ට් එකක් විදිහට ඩේටාබේස් එකේ සේව් කිරීම
        const aiChatLog = await Chat.create({
            patientId,
            message: bot_reply,
            sender: 'AI',
            sentiment,
            confidenceScore: confidence_score
        });

        // 5. Frontend එකට පිළිතුර සහ ඇනලිටික්ස් විස්තර යැවීම
        return res.status(200).json({
            user_message: message,
            bot_reply,
            sentiment,
            confidence_score
        });

    } catch (error) {
        console.error('Chat Error:', error.message);
        return res.status(500).json({ message: 'AI Service is offline or Server Error' });
    }
};

// @desc    Get complete chat history for a specific patient
// @route   GET /api/chat/history
export const getChatHistory = async (req, res) => {
    try {
        // ලොග් වෙලා ඉන්න Patient ට අදාළ සියලුම චැට් මැසේජ් පැරණි ඒවයේ සිට අලුත් ඒවට (Ascending) පිළිවෙලට ගැනීම
        const history = await Chat.find({ patientId: req.user.id }).sort({ createdAt: 1 });
        return res.json(history);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};