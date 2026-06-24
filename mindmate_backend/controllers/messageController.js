import Message from '../models/Message.js';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js'; // 💡 ඩොක්ටර් ප්‍රොෆයිල් මොඩල් එක ලින්ක් කළා මචං

// =========================================================================
// 💬 1. අලුතින් මැසේජ් එකක් යැවීම (Send Message)
// =========================================================================
export const sendMessage = async (req, res) => {
    const { receiverId, message } = req.body;
    const senderId = req.user.id; // ලොග් වෙලා ඉන්න කෙනාගේ ID එක මචං

    try {
        if (!receiverId || !message) {
            return res.status(400).json({ message: 'Receiver and message content are required!' });
        }

        // 💡 [Smart ID Resolver]: receiverId එක DoctorProfile ID එකක් නම්, ඒක ඔටෝම දොස්තරගේ User ID එකට හරවා ගන්නවා බං!
        let finalReceiverId = receiverId;
        const profileCheck = await DoctorProfile.findById(receiverId);
        if (profileCheck && profileCheck.userId) {
            finalReceiverId = profileCheck.userId;
        }

        const newMessage = await Message.create({
            senderId,
            receiverId: finalReceiverId,
            message
        });

        return res.status(201).json(newMessage);
    } catch (error) {
        return res.status(500).json({ message: "Sending Error: " + error.message });
    }
};

// =========================================================================
// 📜 2. පුද්ගලයන් දෙදෙනෙකු අතර මුළු චැට් හිස්ට්‍රි එකම ඇදීම (Get Chat History)
// =========================================================================
export const getChatHistory = async (req, res) => {
    const { otherUserId } = req.params;
    const myId = req.user.id;

    try {
        // 💡 [Smart ID Resolver]: otherUserId එක DoctorProfile ID එකක් නම්, ඒකත් User ID එකට හරවා ගන්නවා මචං
        let finalOtherUserId = otherUserId;
        const profileCheck = await DoctorProfile.findById(otherUserId);
        if (profileCheck && profileCheck.userId) {
            finalOtherUserId = profileCheck.userId;
        }

        // මම යවපු ඒවා සහ මට එවපු ඒවා ඔක්කොම කාලาනුක්‍රමිකව (sort) කරලා ඇදලා ගන්නවා බං
        const chat = await Message.find({
            $or: [
                { senderId: myId, receiverId: finalOtherUserId },
                { senderId: finalOtherUserId, receiverId: myId }
            ]
        }).sort({ createdAt: 1 });

        // කියවපු නැති මැසේජ් තියෙනවා නම් ඒවා Read විදිහට මාක් කරනවා මචං
        await Message.updateMany(
            { senderId: finalOtherUserId, receiverId: myId, read: false },
            { $set: { read: true } }
        );

        return res.status(200).json(chat);
    } catch (error) {
        return res.status(500).json({ message: "Fetch Chat Error: " + error.message });
    }
};

// =========================================================================
// 👥 3. චැට් කරපු ලයිස්තුව ලබාගැනීම (Get Active Contacts)
// =========================================================================
export const getActiveContacts = async (req, res) => {
    const myId = req.user.id;
    const myRole = req.user.role;

    try {
        // මම මැසේජ් කරපු හෝ මට මැසේජ් එවපු හැමෝගෙම Unique IDs ටික ගන්නවා
        const messages = await Message.find({
            $or: [{ senderId: myId }, { receiverId: myId }]
        });

        const contactIds = new Set();
        messages.forEach(msg => {
            if (msg.senderId.toString() !== myId.toString()) contactIds.add(msg.senderId.toString());
            if (msg.receiverId.toString() !== myId.toString()) contactIds.add(msg.receiverId.toString());
        });

        // 💡 ඩේටාබේස් එකේ වැරදිලා හෝ Profile ID එකකින් සේව් වුණු ඒවා තිබුණොත්, ඒවා ඔක්කොම User IDs වලට හරවනවා
        const resolvedContactIds = [];
        for (const id of Array.from(contactIds)) {
            const profile = await DoctorProfile.findById(id);
            if (profile && profile.userId) {
                resolvedContactIds.push(profile.userId.toString());
            } else {
                resolvedContactIds.push(id);
            }
        }

        // ඒ හැම යූසර් කෙනෙක්ගේම නම සහ ඊමේල් විතරක් ලස්සනට ඩේටาබේස් එකෙන් ඇදලා ගන්නවා බං
        const contacts = await User.find({ _id: { $in: resolvedContactIds } })
            .select('name email role')
            .lean();

        return res.status(200).json(contacts);
    } catch (error) {
        return res.status(500).json({ message: "Fetch Contacts Error: " + error.message });
    }
};