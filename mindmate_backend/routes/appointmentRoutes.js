import express from 'express';
import { bookAppointment, getMyAppointments, updateAppointmentStatus, processAppointmentPayment, getPatientAnalyticsForDoctor } from '../controllers/appointmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, bookAppointment);
router.get('/my', protect, getMyAppointments);
router.get('/analytics/:patientId', protect, getPatientAnalyticsForDoctor);

// PUT /api/appointments/:id/status
router.put('/:id/status', protect, updateAppointmentStatus);

//  PUT /api/appointments/:id/pay
router.put('/:id/pay', protect, processAppointmentPayment);

export default router;