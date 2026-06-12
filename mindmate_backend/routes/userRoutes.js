import express from 'express';
import { getAllPractitioners, deleteUser, updateUser, getAvailableDoctors, updateDoctorPassword} from '../controllers/userController.js'; // 👈 getAvailableDoctors එක ඇතුළත් කළා
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/', getAllPractitioners);
router.get('/doctors', getAvailableDoctors); // 👈 🟢 PATIENT API: GET /api/users/doctors
router.delete('/:id', deleteUser);
router.put('/:id', updateUser);
router.put('/update-password', protect, updateDoctorPassword);

export default router;