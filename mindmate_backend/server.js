import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js'; 
import chatRoutes from './routes/chatRoutes.js';
import userRoutes from './routes/userRoutes.js'; // 👈 අපේ අලුත් userRoutes එක Import කළා මචං!

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes); // 👈 මෙතනට /api/users කියලා අලුත් පාර සෙට් කළා!

app.get('/', (req, res) => res.send('MindMate Backend API Running...'));

// MongoDB Local Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Database compiled successfully & Local MongoDB Connected! 🌍'))
    .catch((err) => console.log('Database Connection Error: ', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));