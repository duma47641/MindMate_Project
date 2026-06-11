import express from 'express';
import { getAllPractitioners, deleteUser, updateUser } from '../controllers/userController.js'; // 👈 updateUser එක Import කළා

const router = express.Router();

router.get('/', getAllPractitioners);
router.delete('/:id', deleteUser);
router.put('/:id', updateUser); // 👈 🟢 UPDATE API: PUT /api/users/:id

export default router;