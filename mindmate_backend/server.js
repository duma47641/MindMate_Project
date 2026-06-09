import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js'; // ⚠️ මතක ඇතුව අන්තිමට .js කෑල්ල දාන්න ඕනේ!
import chatRoutes from './routes/chatRoutes.js';

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => res.send('MindMate Backend API Running...'));

// MongoDB Local Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Database compiled successfully & Local MongoDB Connected! 🌍'))
    .catch((err) => console.log('Database Connection Error: ', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));