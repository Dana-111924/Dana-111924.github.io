require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const querystring = require('querystring');
const rateLimit = require('express-rate-limit');

console.log('Starting server...');

const app = express();

// Configure CORS
const corsOptions = {
    origin: ['https://dana-111924.github.io', 'http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: true
};
app.use(cors(corsOptions));

// Pre-flight requests
app.options('*', cors(corsOptions));

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
    
    // Return cached token if still valid
    if (accessToken && tokenExpiry > now) {
        console.log('Using cached access token');
        return accessToken;
    }

    const apiKey = process.env.BAIDU_API_KEY;
    const secretKey = process.env.BAIDU_SECRET_KEY;
    
    try {
        console.log('Fetching new access token...');
        const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
        console.log('Token URL:', tokenUrl);
        
        const response = await fetch(tokenUrl);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Token response:', data);
        
        if (!data.access_token) {
            throw new Error('No access token in response');
        }
        
        accessToken = data.access_token;
        tokenExpiry = now + (29 * 24 * 60 * 60 * 1000); // 29 days
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

    // Convert text to UTF-8 encoded string
    const utf8Text = encodeURIComponent(text);
    console.log('Encoded text:', utf8Text);

    const params = {
        tok: token,
        tex: utf8Text,
        cuid: process.env.BAIDU_APP_ID,
        ctp: 1,
        lan: 'zh',
        spd: 5,
        pit: 5,
        vol: 15,
        per: 0,
        aue: 3
    };

    const url = `https://tsn.baidu.com/text2audio?${querystring.stringify(params)}`;
    console.log('Making TTS request to:', url);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'audio/mp3'
            }
        });
        
        // Check if response is audio
        const contentType = response.headers.get('content-type');
        console.log('Response content type:', contentType);

        if (!contentType) {
            throw new Error('No content type in response');
        }

        if (contentType.includes('audio/mp3') || contentType.includes('audio/mpeg')) {
            const buffer = await response.arrayBuffer();
            console.log('Received audio response, size:', buffer.byteLength);
            return buffer;
        }
        
        // If not audio, it's an error response
        const errorData = await response.json();
        console.error('TTS API error response:', errorData);
        throw new Error(JSON.stringify(errorData));
    } catch (error) {
        console.error('Error getting TTS audio:', error);
        throw error;
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        config: {
            hasAppId: !!process.env.BAIDU_APP_ID,
            hasApiKey: !!process.env.BAIDU_API_KEY,
            hasSecretKey: !!process.env.BAIDU_SECRET_KEY
        }
    });
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

        console.log('Got access token, requesting audio...');
        const audioBuffer = await textToSpeech(text, token);
        if (!audioBuffer) {
            throw new Error('No audio data received');
        }

        console.log('Sending audio response...');
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

// Check if port is in use before starting server
const net = require('net');
const server = net.createServer();

server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port or kill the existing process.`);
        process.exit(1);
    }
});

server.once('listening', () => {
    server.close(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            console.log('Ready to handle TTS requests');
        });
    });
});

server.listen(PORT); 