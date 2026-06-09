import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // .js කෑල්ල අනිවාර්යයි

// 🛡️ සාමාන්‍යයෙන් ලොග් වෙලා ඉන්න ඕනෑම යූසර් කෙනෙක්ව චෙක් කරන වැට
export const protect = async (req, res, next) => {
    let token;

    // HTTP Header එකේ Authorization: Bearer <token> තියෙනවද බලනවා
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Token කෑල්ල විතරක් කඩලා ගන්නවා
            token = req.headers.authorization.split(' ');
            
            // Token එක Verify (Decode) කිරීම
            const decoded = jwt.verify(token[1], process.env.JWT_SECRET);

            // Token එක ඇතුළේ තිබ්බ User ID එකෙන්, යූසර්ගේ විස්තර (Password එක නැතුව) Request එකට දානවා
            req.user = await User.findById(decoded.id).select('-password');

            next(); // 🟢 ඔක්කොම හරි නම් ඊළඟ ලොජික් එකට යන්න ඉඩ දෙනවා
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// 👑 Role එක අනුව Access පාලනය කරන Middleware එක (Admin, Doctor, Patient, Staff)
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        // req.user එකේ තියෙන role එක අපි අවසර දීපු ලැයිස්තුවේ තියෙනවද බලනවා
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Role (${req.user.role}) is not allowed to access this resource` });
        }
        next();
    };
};