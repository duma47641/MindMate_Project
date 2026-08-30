import Message from '../models/Message.js';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js'; 

// =========================================================================
//  1. Send New  Message

export const sendMessage = async (req, res) => {
    const { receiverId, message } = req.body;
    const senderId = req.user.id; 

    try {
        if (!receiverId || !message) {
            return res.status(400).json({ message: 'Receiver and message content are required!' });
        }

        // Smart ID Resolver
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
//  2. Get Chat History

export const getChatHistory = async (req, res) => {
    const { otherUserId } = req.params;
    const myId = req.user.id;

    try {
        // Smart ID Resolver
        let finalOtherUserId = otherUserId;
        const profileCheck = await DoctorProfile.findById(otherUserId);
        if (profileCheck && profileCheck.userId) {
            finalOtherUserId = profileCheck.userId;
        }

        const chat = await Message.find({
            $or: [
                { senderId: myId, receiverId: finalOtherUserId },
                { senderId: finalOtherUserId, receiverId: myId }
            ]
        }).sort({ createdAt: 1 });

        //If there are any unread messages, I'll mark them as read, mate.
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
//  3. Get Active Contacts (Chats)

export const getActiveContacts = async (req, res) => {
    const myId = req.user.id;
    const myRole = req.user.role;

    try {
        const messages = await Message.find({
            $or: [{ senderId: myId }, { receiverId: myId }]
        });

        const contactIds = new Set();
        messages.forEach(msg => {
            if (msg.senderId.toString() !== myId.toString()) contactIds.add(msg.senderId.toString());
            if (msg.receiverId.toString() !== myId.toString()) contactIds.add(msg.receiverId.toString());
        });

        const resolvedContactIds = [];
        for (const id of Array.from(contactIds)) {
            const profile = await DoctorProfile.findById(id);
            if (profile && profile.userId) {
                resolvedContactIds.push(profile.userId.toString());
            } else {
                resolvedContactIds.push(id);
            }
        }

        const contacts = await User.find({ _id: { $in: resolvedContactIds } })
            .select('name email role')
            .lean();

        return res.status(200).json(contacts);
    } catch (error) {
        return res.status(500).json({ message: "Fetch Contacts Error: " + error.message });
    }
};