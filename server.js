const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const querystring = require('querystring');
const rateLimit = require('express-rate-limit');

console.log('Starting server...');

try {
    console.log('Loading config...');
    const config = require('./config.cjs');
    console.log('Config loaded:', {
        hasAppId: !!config.baiduTTS.appId,
        hasApiKey: !!config.baiduTTS.apiKey,
        hasSecretKey: !!config.baiduTTS.secretKey
    });

    const app = express();

    // Configure CORS
    const corsOptions = {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type']
    };
    app.use(cors(corsOptions));

    // Configure rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    });
    app.use('/api/', limiter);

    app.use(express.json());
    app.use(express.static('.'));

    let accessToken = null;
    let tokenExpiry = 0;

    // Function to get access token
    async function getAccessToken() {
        const now = Date.now();
        
        // Return cached token if still valid (expires in 30 days, we'll refresh after 29 days)
        if (accessToken && tokenExpiry > now) {
            return accessToken;
        }

        const apiKey = config.baiduTTS.apiKey;
        const secretKey = config.baiduTTS.secretKey;
        const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to get access token: ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.access_token) {
                throw new Error('No access token in response');
            }
            
            accessToken = data.access_token;
            // Set expiry to 29 days from now (token actually lasts 30 days)
            tokenExpiry = now + (29 * 24 * 60 * 60 * 1000);
            console.log('Successfully obtained new access token');
            return accessToken;
        } catch (error) {
            console.error('Error getting access token:', error);
            throw error;
        }
    }

    // Function to get TTS audio
    async function textToSpeech(text, token) {
        if (!text || !token) {
            throw new Error('Text and token are required');
        }

        const params = querystring.stringify({
            tex: text,
            tok: token,
            cuid: config.baiduTTS.appId,
            ctp: 1,
            lan: 'zh',
            spd: 5,
            pit: 5,
            vol: 15,
            per: 0,
            aue: 3
        });

        const url = `https://tsn.baidu.com/text2audio?${params}`;
        
        try {
            const response = await fetch(url);
            
            // Check if response is audio
            const contentType = response.headers.get('content-type');
            if (!contentType) {
                throw new Error('No content type in response');
            }

            if (contentType.includes('audio/mp3')) {
                return await response.arrayBuffer();
            }
            
            // If not audio, it's an error response
            const errorData = await response.json();
            console.error('TTS API error:', errorData);
            throw new Error(JSON.stringify(errorData));
        } catch (error) {
            console.error('Error getting TTS audio:', error);
            throw error;
        }
    }

    // Add a test endpoint
    app.get('/test', (req, res) => {
        res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
    });

    // TTS endpoint
    app.post('/api/tts', async (req, res) => {
        try {
            const { text } = req.body;
            if (!text) {
                return res.status(400).json({ error: 'Text is required' });
            }
            
            console.log('Received TTS request for text:', text);
            
            // Get access token
            const token = await getAccessToken();
            if (!token) {
                return res.status(500).json({ error: 'Failed to get access token' });
            }

            const audioBuffer = await textToSpeech(text, token);
            if (!audioBuffer) {
                throw new Error('No audio data received');
            }

            res.setHeader('Content-Type', 'audio/mp3');
            res.send(Buffer.from(audioBuffer));
            console.log('TTS response sent successfully for text:', text);
        } catch (error) {
            console.error('TTS Error:', error);
            res.status(500).json({ 
                error: 'Failed to generate speech',
                details: error.message
            });
        }
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error('Unhandled error:', err);
        res.status(500).json({ 
            error: 'Internal server error',
            details: err.message
        });
    });

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log('Ready to handle TTS requests');
    });
} catch (error) {
    console.error('Startup Error:', error);
    process.exit(1);
} 