const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const authMiddleware = require('../middleware/auth');
const supabase = require('../services/supabaseClient');
const { getLocalAIResponse } = require('../services/aiService');

// In-memory fallback (used when Supabase tables don't exist yet)
const inMemorySessions = {};

// Multer setup for in-chat file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/pdf',
            'text/plain',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
        ];
        if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Please upload PDF, text, or image files.'));
        }
    }
});

/**
 * Extract text from an uploaded file buffer
 */
async function extractTextFromFile(buffer, mimetype, originalname) {
    try {
        if (mimetype === 'application/pdf') {
            const pdfData = await pdfParse(buffer);
            return pdfData.text || '';
        }

        if (mimetype === 'text/plain') {
            return buffer.toString('utf-8');
        }

        if (mimetype.startsWith('image/')) {
            // Use tesseract.js for OCR on images
            try {
                const Tesseract = require('tesseract.js');
                const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
                return text || '';
            } catch (ocrErr) {
                console.warn('OCR failed, sending image description request:', ocrErr.message);
                return `[Image file uploaded: ${originalname}. OCR extraction failed. Please describe the image contents.]`;
            }
        }

        return `[File uploaded: ${originalname}]`;
    } catch (err) {
        console.error('Text extraction error:', err.message);
        return `[Could not extract text from: ${originalname}]`;
    }
}

async function getOrCreateSession(userId, sessionId) {
    // Try Supabase first
    try {
        if (sessionId) {
            const { data } = await supabase
                .from('chat_sessions')
                .select('*')
                .eq('id', sessionId)
                .eq('user_id', userId)
                .single();
            if (data) return { session: data, useSupabase: true };
        }

        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({ user_id: userId, title: 'New Legal Query', category: 'Other', messages: [] })
            .select()
            .single();

        if (error) throw error;
        return { session: data, useSupabase: true };
    } catch (err) {
        console.warn('Supabase unavailable, using in-memory session:', err.message);
        const sid = sessionId || `mem_${userId}_${Date.now()}`;
        if (!inMemorySessions[sid]) {
            inMemorySessions[sid] = { id: sid, user_id: userId, title: 'New Legal Query', category: 'Other', messages: [] };
        }
        return { session: inMemorySessions[sid], useSupabase: false };
    }
}

async function saveSession(session, messages, title, category, useSupabase) {
    if (useSupabase) {
        await supabase
            .from('chat_sessions')
            .update({ messages, title, category, updated_at: new Date().toISOString() })
            .eq('id', session.id);
    } else {
        inMemorySessions[session.id] = { ...session, messages, title, category };
    }
}

// POST /api/chat/message — supports optional file attachment
router.post('/message', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const userId = req.userId;
        if (!message && !req.file) return res.status(400).json({ error: 'Message or file is required.' });

        const { session, useSupabase } = await getOrCreateSession(userId, sessionId);
        const messages = session.messages || [];

        // Extract text from file if uploaded
        let documentContext = '';
        let userContent = message || '';
        if (req.file) {
            documentContext = await extractTextFromFile(req.file.buffer, req.file.mimetype, req.file.originalname);
            if (!userContent) {
                userContent = `Please analyze this document: ${req.file.originalname}`;
            }
            userContent += `\n\n[Attached file: ${req.file.originalname}]`;
        }

        // Add user message
        const userMsg = { role: 'user', content: userContent, timestamp: new Date().toISOString() };
        messages.push(userMsg);

        // Get AI response from local model
        let aiText;
        try {
            const result = await getLocalAIResponse(message || `Analyze this document: ${req.file.originalname}`, documentContext);
            aiText = result.answer;
        } catch (aiErr) {
            console.error('AI Server error:', aiErr.message);
            return res.status(500).json({ error: `AI service error: ${aiErr.message}` });
        }

        const aiMsg = { role: 'ai', content: aiText, timestamp: new Date().toISOString() };
        messages.push(aiMsg);

        const displayMessage = message || `Document: ${req.file?.originalname || 'Unknown'}`;
        const title = session.title === 'New Legal Query'
            ? displayMessage.substring(0, 60) + (displayMessage.length > 60 ? '...' : '')
            : session.title;

        await saveSession(session, messages, title, 'Legal', useSupabase);

        res.json({ sessionId: session.id, message: aiMsg, category: 'Legal', title });
    } catch (err) {
        console.error('Chat error:', err.message || err);
        res.status(500).json({ error: `Server error: ${err.message || 'Unknown error'}` });
    }
});

// GET /api/chat/sessions
router.get('/sessions', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('id, title, category, updated_at, created_at, messages')
            .eq('user_id', req.userId)
            .order('updated_at', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        const userSessions = Object.values(inMemorySessions)
            .filter(s => s.user_id === req.userId)
            .map(s => ({ id: s.id, title: s.title, category: s.category, messages: s.messages }));
        res.json(userSessions);
    }
});

// GET /api/chat/session/:id
router.get('/session/:id', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .single();
        if (error || !data) throw new Error('Not found');
        res.json(data);
    } catch (err) {
        const s = inMemorySessions[req.params.id];
        if (s && s.user_id === req.userId) return res.json(s);
        res.status(404).json({ error: 'Session not found.' });
    }
});

// DELETE /api/chat/session/:id
router.delete('/session/:id', authMiddleware, async (req, res) => {
    try {
        await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.userId);
        delete inMemorySessions[req.params.id];
        res.json({ message: 'Session deleted.' });
    } catch (err) {
        delete inMemorySessions[req.params.id];
        res.json({ message: 'Session deleted.' });
    }
});

module.exports = router;
