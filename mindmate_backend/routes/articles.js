import express from 'express';
import Article from '../models/Article.js';

const router = express.Router();

// GET all articles
router.get('/', async (req, res) => {
    try {
        const articles = await Article.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching articles' });
    }
});

// POST create article
router.post('/', async (req, res) => {
    try {
        const newArticle = new Article(req.body);
        const saved = await newArticle.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: 'Error creating article', error: err.message });
    }
});

// PUT update article
router.put('/:id', async (req, res) => {
    try {
        const updated = await Article.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: 'Error updating article' });
    }
});

// DELETE article
router.delete('/:id', async (req, res) => {
    try {
        await Article.findByIdAndDelete(req.params.id);
        res.json({ message: 'Article deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting article' });
    }
});

export default router;