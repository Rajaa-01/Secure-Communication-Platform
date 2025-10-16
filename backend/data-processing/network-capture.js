const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');
const csv = require('csv-writer').createObjectCsvWriter;
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const http = require('http');
const WebSocket = require('ws');

// ===== 1. Configuration Complète =====
const CONFIG = {
    PROXY_PORT: 5002,
    LOGS_DIR: path.join(__dirname, 'logs'),
    CSV_FILENAME: 'network_traffic_unswnb15.csv',
    EXPORT_INTERVAL_MS: 5 * 60 * 1000,
    TARGETS: {
        chat: 'http://localhost:4200',
        meet: 'http://localhost:8000',
        blockchain: 'http://localhost:5000',
        userProfile: 'http://localhost:5001'
    },
    WHITELIST_PATHS: {
        chat: ['/api', '/socket.io'],
        meet: ['/webrtc', '/signaling'],
        blockchain: ['/chain', '/blocks'],
        userProfile: ['/users', '/auth']
    }
};

// Tous les champs UNSW-NB15
const UNSW_NB15_FIELDS = [
    {id: 'id', title: 'id'},
    {id: 'timestamp', title: 'timestamp'},
    {id: 'srcip', title: 'srcip'},
    {id: 'sport', title: 'sport'},
    {id: 'dstip', title: 'dstip'},
    {id: 'dsport', title: 'dsport'},
    {id: 'proto', title: 'proto'},
    {id: 'state', title: 'state'},
    {id: 'dur', title: 'dur'},
    {id: 'sbytes', title: 'sbytes'},
    {id: 'dbytes', title: 'dbytes'},
    {id: 'sttl', title: 'sttl'},
    {id: 'dttl', title: 'dttl'},
    {id: 'sloss', title: 'sloss'},
    {id: 'dloss', title: 'dloss'},
    {id: 'service', title: 'service'},
    {id: 'sload', title: 'sload'},
    {id: 'dload', title: 'dload'},
    {id: 'spkts', title: 'spkts'},
    {id: 'dpkts', title: 'dpkts'},
    {id: 'swin', title: 'swin'},
    {id: 'dwin', title: 'dwin'},
    {id: 'stcpb', title: 'stcpb'},
    {id: 'dtcpb', title: 'dtcpb'},
    {id: 'smeansz', title: 'smeansz'},
    {id: 'dmeansz', title: 'dmeansz'},
    {id: 'trans_depth', title: 'trans_depth'},
    {id: 'res_bdy_len', title: 'res_bdy_len'},
    {id: 'sjit', title: 'sjit'},
    {id: 'djit', title: 'djit'},
    {id: 'stime', title: 'stime'},
    {id: 'ltime', title: 'ltime'},
    {id: 'sintpkt', title: 'sintpkt'},
    {id: 'dintpkt', title: 'dintpkt'},
    {id: 'tcprtt', title: 'tcprtt'},
    {id: 'synack', title: 'synack'},
    {id: 'ackdat', title: 'ackdat'},
    {id: 'is_sm_ips_ports', title: 'is_sm_ips_ports'},
    {id: 'ct_state_ttl', title: 'ct_state_ttl'},
    {id: 'ct_flw_http_mthd', title: 'ct_flw_http_mthd'},
    {id: 'is_ftp_login', title: 'is_ftp_login'},
    {id: 'ct_ftp_cmd', title: 'ct_ftp_cmd'},
    {id: 'ct_srv_src', title: 'ct_srv_src'},
    {id: 'ct_srv_dst', title: 'ct_srv_dst'},
    {id: 'ct_dst_ltm', title: 'ct_dst_ltm'},
    {id: 'ct_src_ltm', title: 'ct_src_ltm'},
    {id: 'ct_src_dport_ltm', title: 'ct_src_dport_ltm'},
    {id: 'ct_dst_sport_ltm', title: 'ct_dst_sport_ltm'},
    {id: 'ct_dst_src_ltm', title: 'ct_dst_src_ltm'},
    {id: 'attack_cat', title: 'attack_cat'},
    {id: 'label', title: 'label'}
];

// ===== 2. Initialisation =====
if (!fs.existsSync(CONFIG.LOGS_DIR)) {
    fs.mkdirSync(CONFIG.LOGS_DIR, { recursive: true });
}

// ===== 3. Logging Avancé =====
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: path.join(CONFIG.LOGS_DIR, 'proxy-combined.log') 
        }),
        new winston.transports.File({
            filename: path.join(CONFIG.LOGS_DIR, 'proxy-errors.log'),
            level: 'error'
        })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// ===== 4. Gestion des Données =====
class TrafficMonitor {
    constructor() {
        this.data = [];
        this.csvWriter = csv({
            path: path.join(CONFIG.LOGS_DIR, CONFIG.CSV_FILENAME),
            header: UNSW_NB15_FIELDS,
            append: true
        });
    }

    capture(entry) {
        const completeEntry = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            ...this.getDefaultValues(),
            ...entry
        };
        this.data.push(completeEntry);
    }

    getDefaultValues() {
        return {
            attack_cat: 'Normal',
            label: 0,
            sttl: 64,
            dttl: 64,
            sloss: 0,
            dloss: 0,
            spkts: 1,
            dpkts: 1,
            swin: 65535,
            dwin: 65535,
            sjit: 0,
            djit: 0,
            sintpkt: 0,
            dintpkt: 0,
            is_sm_ips_ports: 0,
            ct_state_ttl: 0,
            is_ftp_login: 0,
            ct_ftp_cmd: 0,
            ct_srv_src: 1,
            ct_srv_dst: 1,
            ct_dst_ltm: 1,
            ct_src_ltm: 1,
            ct_src_dport_ltm: 1,
            ct_dst_sport_ltm: 1,
            ct_dst_src_ltm: 1
        };
    }

    async exportToCSV() {
        if (this.data.length === 0) return;

        try {
            await this.csvWriter.writeRecords(this.data);
            logger.info(`Exported ${this.data.length} records to CSV`);
            this.data = [];
        } catch (error) {
            logger.error('CSV Export Error:', error);
        }
    }
}

// ===== 5. Serveur Proxy Intelligent =====
class EnhancedProxy {
    constructor() {
        this.monitor = new TrafficMonitor();
        this.app = express();
        this.httpServer = http.createServer(this.app);
        this.wss = new WebSocket.Server({ server: this.httpServer });

        this.setupMiddleware();
        this.setupProxies();
        this.setupWebSocket();
        this.setupApiEndpoints();
        this.scheduleExports();
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use((req, res, next) => {
            const startTime = Date.now();
            const { method, originalUrl, headers, socket } = req;

            res.on('finish', () => {
                const contentLength = parseInt(res.get('Content-Length')) || 0;
                const reqLength = parseInt(headers['content-length']) || 0;
                const duration = Date.now() - startTime;

                this.monitor.capture({
                    srcip: socket.remoteAddress,
                    sport: socket.remotePort,
                    dstip: socket.localAddress,
                    dsport: socket.localPort,
                    proto: 'HTTP',
                    state: res.statusCode === 200 ? 'OK' : 'ERR',
                    dur: duration / 1000,
                    sbytes: reqLength,
                    dbytes: contentLength,
                    service: this.determineService(originalUrl),
                    sload: duration > 0 ? (reqLength / (duration / 1000)).toFixed(2) : 0,
                    dload: duration > 0 ? (contentLength / (duration / 1000)).toFixed(2) : 0,
                    stcpb: reqLength,
                    dtcpb: contentLength,
                    smeansz: reqLength,
                    dmeansz: contentLength,
                    trans_depth: 1,
                    res_bdy_len: contentLength,
                    tcprtt: duration,
                    synack: duration / 2,
                    ackdat: duration / 2,
                    ct_flw_http_mthd: method === 'GET' ? 1 : 0,
                    method,
                    path: originalUrl
                });
            });
            next();
        });
    }

    determineService(url) {
        for (const [service, paths] of Object.entries(CONFIG.WHITELIST_PATHS)) {
            if (paths.some(path => url.startsWith(path))) {
                return service;
            }
        }
        return 'other';
    }

    setupProxies() {
        Object.entries(CONFIG.TARGETS).forEach(([service, target]) => {
            this.app.use(`/${service}`, createProxyMiddleware({
                target,
                changeOrigin: true,
                pathRewrite: { [`^/${service}`]: '' },
                ws: true,
                onProxyReq: (proxyReq, req) => {
                    logger.debug(`Proxying ${req.method} ${req.originalUrl} to ${target}`);
                },
                onProxyRes: (proxyRes, req) => {
                    logger.debug(`Received response for ${req.originalUrl} (${proxyRes.statusCode})`);
                },
                onError: (err, req, res) => {
                    logger.error(`Proxy error for ${req.originalUrl}: ${err.message}`);
                    res.status(500).json({ error: 'Proxy error' });
                }
            }));
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            const startTime = Date.now();
            const { socket } = req;

            this.monitor.capture({
                srcip: socket.remoteAddress,
                sport: socket.remotePort,
                dstip: socket.localAddress,
                dsport: socket.localPort,
                proto: 'WS',
                state: 'OPEN',
                service: this.determineService(req.url)
            });

            ws.on('message', (message) => {
                this.monitor.capture({
                    srcip: socket.remoteAddress,
                    sport: socket.remotePort,
                    dstip: socket.localAddress,
                    dsport: socket.localPort,
                    proto: 'WS',
                    state: 'MESSAGE',
                    sbytes: message.length,
                    service: this.determineService(req.url)
                });
            });

            ws.on('close', () => {
                this.monitor.capture({
                    srcip: socket.remoteAddress,
                    sport: socket.remotePort,
                    dstip: socket.localAddress,
                    dsport: socket.localPort,
                    proto: 'WS',
                    state: 'CLOSE',
                    dur: (Date.now() - startTime) / 1000,
                    service: this.determineService(req.url)
                });
            });
        });
    }

    setupApiEndpoints() {
        this.app.get('/proxy/status', (req, res) => {
            res.json({
                status: 'running',
                services: Object.keys(CONFIG.TARGETS),
                recordsInMemory: this.monitor.data.length
            });
        });

        this.app.post('/proxy/export', async (req, res) => {
            try {
                await this.monitor.exportToCSV();
                res.json({ status: 'success' });
            } catch (error) {
                res.status(500).json({ status: 'error', error: error.message });
            }
        });
    }

    scheduleExports() {
        setInterval(() => {
            this.monitor.exportToCSV();
        }, CONFIG.EXPORT_INTERVAL_MS);
    }

    start() {
        this.httpServer.listen(CONFIG.PROXY_PORT, () => {
            logger.info(`Proxy server running on port ${CONFIG.PROXY_PORT}`);
            logger.info(`Available services: ${Object.keys(CONFIG.TARGETS).join(', ')}`);
            logger.info(`CSV export path: ${path.join(CONFIG.LOGS_DIR, CONFIG.CSV_FILENAME)}`);
        });
    }
}

// ===== 6. Démarrage =====
const proxy = new EnhancedProxy();
proxy.start();

// Gestion propre des arrêts
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    await proxy.monitor.exportToCSV();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    process.exit(1);
});