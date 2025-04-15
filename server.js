require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const querystring = require('querystring');
const rateLimit = require('express-rate-limit');
const config = require('./config.cjs');

console.log('Starting server...');

const app = express();
const port = process.env.PORT || 3001;

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

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve files from the pages directory
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Configure rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

app.use(express.json());

let accessToken = null;
let tokenExpiry = 0;

// Pinyin to Chinese character mapping for better pronunciation
const pinyinToCharMap = {
    // Simple finals
    'pi1': '批', 'pi2': '皮', 'pi3': '匹', 'pi4': '屁',
    'pa1': '趴', 'pa2': '爬', 'pa3': '怕', 'pa4': '帕',
    'po1': '坡', 'po2': '婆', 'po3': '破', 'po4': '泼',
    'pu1': '铺', 'pu2': '普', 'pu3': '普', 'pu4': '谱',
    
    'bi1': '逼', 'bi2': '鼻', 'bi3': '比', 'bi4': '必',
    'ba1': '八', 'ba2': '拔', 'ba3': '把', 'ba4': '爸',
    'bo1': '波', 'bo2': '伯', 'bo3': '播', 'bo4': '博',
    'bu1': '补', 'bu2': '不', 'bu3': '步', 'bu4': '布',
    
    'mi1': '咪', 'mi2': '迷', 'mi3': '米', 'mi4': '密',
    'ma1': '妈', 'ma2': '麻', 'ma3': '马', 'ma4': '骂',
    'mo1': '摸', 'mo2': '模', 'mo3': '抹', 'mo4': '末',
    'mu1': '模', 'mu2': '木', 'mu3': '母', 'mu4': '目',
    
    'di1': '低', 'di2': '敌', 'di3': '底', 'di4': '地',
    'da1': '搭', 'da2': '达', 'da3': '打', 'da4': '大',
    'de1': '德', 'de2': '得', 'de3': '得', 'de4': '得',
    'du1': '都', 'du2': '读', 'du3': '赌', 'du4': '度',
    
    'ti1': '梯', 'ti2': '题', 'ti3': '体', 'ti4': '替',
    'ta1': '他', 'ta2': '塔', 'ta3': '踏', 'ta4': '塌',
    'te1': '特', 'te2': '特', 'te3': '特', 'te4': '特',
    'tu1': '图', 'tu2': '土', 'tu3': '兔', 'tu4': '吐',
    
    'ni1': '尼', 'ni2': '你', 'ni3': '你', 'ni4': '逆',
    'na1': '拿', 'na2': '那', 'na3': '哪', 'na4': '纳',
    'ne1': '呢', 'ne2': '呢', 'ne3': '呢', 'ne4': '呢',
    'nu1': '奴', 'nu2': '努', 'nu3': '怒', 'nu4': '暖',
    
    'li1': '离', 'li2': '黎', 'li3': '里', 'li4': '力',
    'la1': '拉', 'la2': '啦', 'la3': '拉', 'la4': '辣',
    'le1': '乐', 'le2': '了', 'le3': '了', 'le4': '勒',
    'lu1': '录', 'lu2': '路', 'lu3': '鹿', 'lu4': '露',

    // Compound finals with i
    'miao1': '苗', 'miao2': '描', 'miao3': '秒', 'miao4': '妙',
    'piao1': '飘', 'piao2': '票', 'piao3': '漂', 'piao4': '骠',
    'biao1': '标', 'biao2': '表', 'biao3': '表', 'biao4': '镖',
    'diao1': '雕', 'diao2': '钓', 'diao3': '吊', 'diao4': '调',
    'tiao1': '挑', 'tiao2': '条', 'tiao3': '跳', 'tiao4': '调',
    'niao1': '鸟', 'niao2': '尿', 'niao3': '袅', 'niao4': '尿',
    'liao1': '辽', 'liao2': '了', 'liao3': '了', 'liao4': '料',

    'mian1': '棉', 'mian2': '面', 'mian3': '免', 'mian4': '面',
    'pian1': '篇', 'pian2': '便', 'pian3': '片', 'pian4': '骗',
    'bian1': '边', 'bian2': '变', 'bian3': '扁', 'bian4': '便',
    'dian1': '颠', 'dian2': '点', 'dian3': '点', 'dian4': '电',
    'tian1': '天', 'tian2': '田', 'tian3': '舔', 'tian4': '典',
    'nian1': '年', 'nian2': '念', 'nian3': '捻', 'nian4': '念',
    'lian1': '连', 'lian2': '连', 'lian3': '脸', 'lian4': '练',

    'mie1': '咩', 'mie2': '灭', 'mie3': '蔑', 'mie4': '蔑',
    'pie1': '撇', 'pie2': '瞥', 'pie3': '撇', 'pie4': '撇',
    'bie1': '别', 'bie2': '别', 'bie3': '别', 'bie4': '别',
    'die1': '爹', 'die2': '叠', 'die3': '叠', 'die4': '碟',
    'tie1': '贴', 'tie2': '铁', 'tie3': '帖', 'tie4': '贴',
    'nie1': '捏', 'nie2': '捏', 'nie3': '捏', 'nie4': '聂',
    'lie1': '列', 'lie2': '烈', 'lie3': '裂', 'lie4': '劣',

    // Compound finals with u
    'miu1': '谬', 'miu2': '谬', 'miu3': '谬', 'miu4': '谬',
    'diu1': '丢', 'diu2': '丢', 'diu3': '丢', 'diu4': '丢',
    'niu1': '牛', 'niu2': '纽', 'niu3': '扭', 'niu4': '牛',
    'liu1': '溜', 'liu2': '流', 'liu3': '柳', 'liu4': '六',

    // Special combinations
    'jiao1': '交', 'jiao2': '教', 'jiao3': '叫', 'jiao4': '觉',
    'qiao1': '敲', 'qiao2': '桥', 'qiao3': '巧', 'qiao4': '俏',
    'xiao1': '消', 'xiao2': '小', 'xiao3': '笑', 'xiao4': '效',

    'jian1': '尖', 'jian2': '间', 'jian3': '简', 'jian4': '见',
    'qian1': '千', 'qian2': '前', 'qian3': '浅', 'qian4': '欠',
    'xian1': '先', 'xian2': '闲', 'xian3': '显', 'xian4': '现',

    'jie1': '街', 'jie2': '接', 'jie3': '姐', 'jie4': '界',
    'qie1': '切', 'qie2': '茄', 'qie3': '且', 'qie4': '切',
    'xie1': '斜', 'xie2': '写', 'xie3': '写', 'xie4': '谢',

    'jiu1': '揪', 'jiu2': '久', 'jiu3': '旧', 'jiu4': '就',
    'qiu1': '秋', 'qiu2': '球', 'qiu3': '求', 'qiu4': '秋',
    'xiu1': '修', 'xiu2': '休', 'xiu3': '宿', 'xiu4': '秀',

    // zh, ch, sh, r combinations
    'zhi1': '知', 'zhi2': '直', 'zhi3': '指', 'zhi4': '至',
    'chi1': '吃', 'chi2': '持', 'chi3': '尺', 'chi4': '赤',
    'shi1': '诗', 'shi2': '十', 'shi3': '使', 'shi4': '是',
    'ri4': '日'
};

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
        const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token`;
        const params = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: apiKey,
            client_secret: secretKey
        });
        
        const response = await fetch(`${tokenUrl}?${params}`);
        
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
        tokenExpiry = now + ((data.expires_in || 2592000) * 1000); // Use token expiry from response or default to 30 days
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

    // Try to get the Chinese character equivalent
    const pinyinKey = text.toLowerCase();
    const chineseChar = pinyinToCharMap[pinyinKey];

    // If we have a mapping, use the Chinese character, otherwise use original text
    const textToSpeak = chineseChar || text;

    const params = new URLSearchParams({
        tok: token,
        tex: textToSpeak,
        cuid: 'nodejs_tts_client',
        ctp: '1',
        lan: 'zh',
        spd: '3',  // Slower speed for clearer pronunciation
        pit: '5',
        vol: '15',
        per: '0',  // Standard female voice
        aue: '3'
    });

    const url = `https://tsn.baidu.com/text2audio`;
    console.log('Making TTS request for:', textToSpeak);
    
    try {
        const response = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: {
                'Accept': '*/*'
            }
        });
        
        // Check if response is audio
        const contentType = response.headers.get('content-type');
        console.log('Response content type:', contentType);

        if (!contentType) {
            throw new Error('No content type in response');
        }

        if (contentType.includes('audio')) {
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

// Check if port is in use before starting server
const net = require('net');
const server = net.createServer();

server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please try a different port or kill the existing process.`);
        process.exit(1);
    }
});

server.once('listening', () => {
    server.close(() => {
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
            console.log('Environment:', process.env.NODE_ENV || 'development');
            console.log('Ready to handle TTS requests');
        });
    });
});

server.listen(port); 