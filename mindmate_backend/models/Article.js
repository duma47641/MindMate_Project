import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
    tag: { type: String, required: true },
    title: { type: String, required: true },
    author: { type: String, required: true },
    readTime: { type: String, default: '5 min read' },
    summary: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Article', articleSchema);