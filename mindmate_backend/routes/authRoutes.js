import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js'; // ⚠️ .js කෑල්ල දාන්න

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

export default router; // export එක වෙනස් වුණා