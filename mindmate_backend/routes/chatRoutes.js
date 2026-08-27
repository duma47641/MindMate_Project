import express from 'express';
import { sendMessage, getChatHistory, getPatientMoodHistory } from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js'; // අපේ ආරක්ෂක වැට

const router = express.Router();

// මේ එන්ඩ්පොයින්ට්ස් දෙකටම ඇතුල් වෙන්න නම් අනිවාර්යයෙන්ම ලොග් වෙලා (protect) ඉන්න ඕනේ!
router.post('/message', protect, sendMessage);
router.get('/history', protect, getChatHistory);
router.get('/patient-history/:patientId', protect, getPatientMoodHistory);




export default router;