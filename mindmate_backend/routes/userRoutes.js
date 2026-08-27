import express from 'express';
import { getAllPractitioners, deleteUser, updateUser, getAvailableDoctors, updateDoctorPassword,registerUser} from '../controllers/userController.js'; // 👈 getAvailableDoctors එක ඇතුළත් කළා
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/', getAllPractitioners);
router.get('/doctors', getAvailableDoctors); // 👈 🟢 PATIENT API: GET /api/users/doctors
router.delete('/:id', deleteUser);
router.put('/:id', updateUser);
router.put('/update-password', protect, updateDoctorPassword);


// 🟢 Register Endpoint (Admin Creation)
router.post('/register', protect, registerUser);

// 🩺 Doctors & Staff Fetching
router.get('/doctors', getAvailableDoctors);
router.get('/staff', protect, getAllPractitioners); // Staff endpoint fallback
router.get('/', protect, getAllPractitioners);

// ✏️ Update & Delete
router.put('/update-password', protect, updateDoctorPassword);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

export default router;