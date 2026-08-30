import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();

//  Patient Sign Up
router.post('/register', registerUser);

//  Admin Dashboard  Doctor/Staff Register 
router.post('/register-practitioner', registerUser);

// Login all
router.post('/login', loginUser);

export default router;