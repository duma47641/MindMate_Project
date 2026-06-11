import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();

// 👤 සාමාන්‍ය Patient කෙනෙක් Sign Up වෙන පාර
router.post('/register', registerUser);

// 🩺👑 Admin Dashboard එකෙන් Doctor/Staff Register කරන පාර (Frontend එකෙන් ඉල්ලන එක මචං!)
router.post('/register-practitioner', registerUser);

// 🔐 හැමෝටම ලොග් වෙන්න තියෙන පොදු පාර
router.post('/login', loginUser);

export default router;