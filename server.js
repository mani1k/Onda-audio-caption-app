require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Groq = require('groq-sdk');
const path = require('path');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir, { extensions: ['html'] }));

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
    '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm',
    '.flac', '.ogg', '.oga', '.aac', '.aif', '.aiff'
]);

// Files stay in memory for the duration of the request only.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const mime = (file.mimetype || '').toLowerCase();
        const allowedMime = mime.startsWith('audio/') || mime === 'video/webm' || mime === 'application/ogg';
        if (ALLOWED_EXTENSIONS.has(ext) || allowedMime) {
            return cb(null, true);
        }
        const error = new Error('Unsupported audio format.');
        error.code = 'UNSUPPORTED_FORMAT';
        cb(error);
    }
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const LANGUAGES = new Set([
    'en', 'hi', 'es', 'fr', 'de', 'pt', 'it', 'ja', 'ko', 'zh', 'ar', 'ru', 'id', 'tr', 'nl', 'pl'
]);

app.get('/api/health', (req, res) => {
    res.json({ ok: true, configured: Boolean(process.env.GROQ_API_KEY) });
});

app.post('/api/transcribe', (req, res, next) => {
    upload.single('audio')(req, res, (error) => {
        if (!error) return next();
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'That file is larger than 25 MB. Try a shorter clip or a compressed copy.' });
        }
        if (error.code === 'UNSUPPORTED_FORMAT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(415).json({ error: 'That format is not supported. Use MP3, WAV, M4A, FLAC, OGG or WEBM.' });
        }
        console.error('Upload error:', error);
        return res.status(400).json({ error: 'The upload could not be read. Please try another file.' });
    });
}, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Choose an audio file to transcribe.' });
    }

    if (!process.env.GROQ_API_KEY) {
        return res.status(503).json({ error: 'The studio is not configured. Add GROQ_API_KEY to the server environment and restart.' });
    }

    const requestedLanguage = String(req.body.language || 'auto').toLowerCase();
    const language = LANGUAGES.has(requestedLanguage) ? requestedLanguage : undefined;

    try {
        const transcription = await groq.audio.transcriptions.create({
            file: await Groq.toFile(req.file.buffer, req.file.originalname || 'audio.mp3'),
            model: 'whisper-large-v3',
            response_format: 'verbose_json',
            timestamp_granularities: ['segment'],
            ...(language ? { language } : {})
        });

        const segments = (transcription.segments || [])
            .map((segment, index) => ({
                id: index + 1,
                start: Number(segment.start) || 0,
                end: Number(segment.end) || 0,
                text: String(segment.text || '').trim()
            }))
            .filter((segment) => segment.text.length > 0);

        if (segments.length === 0) {
            return res.status(422).json({ error: 'No speech was detected in that recording. Try a clearer or longer clip.' });
        }

        res.json({
            success: true,
            language: transcription.language || language || null,
            duration: Number(transcription.duration) || segments[segments.length - 1].end,
            segments
        });
    } catch (error) {
        console.error('Transcription error:', error?.message || error);

        if (error?.status === 401) {
            return res.status(502).json({ error: 'The transcription service rejected the API key. Check the server configuration.' });
        }
        if (error?.status === 429) {
            return res.status(429).json({ error: 'The studio is receiving too many requests right now. Wait a moment and try again.' });
        }

        res.status(502).json({ error: 'Transcription failed. Check your connection and try again.' });
    }
});

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'That endpoint does not exist.' });
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(publicDir, 'index.html'));
});

const PORT = Number(process.env.PORT) || 5055;
app.listen(PORT, () => console.log(`Onda studio running on http://localhost:${PORT}`));
