import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js'; 
import chatRoutes from './routes/chatRoutes.js';
import userRoutes from './routes/userRoutes.js'; 
import appointmentRoutes from './routes/appointmentRoutes.js'; 
import messageRoutes from './routes/messageRoutes.js';
import articleRoutes from './routes/articles.js';
dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/appointments', appointmentRoutes); 
app.get('/', (req, res) => res.send('MindMate Backend API Running...'));
app.use('/api/messages', messageRoutes);
app.use('/api/articles', articleRoutes);
// MongoDB Local Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Database compiled successfully & Local MongoDB Connected! '))
    .catch((err) => console.log('Database Connection Error: ', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} `));