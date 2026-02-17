const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { createServer } = require('http');
const { SocksClient } = require('socks');
const dns = require('node:dns/promises');
const { ProxyAgent, setGlobalDispatcher } = require('undici');
const { HttpsProxyAgent } = require('https-proxy-agent');

(async () => {
  try {
    // ==================== SOCKS5 PROXY CONFIGURATION ====================
    const SOCKS_URL = process.env.PROXY_URL; // e.g., socks5://70.166.167.38:57728
    console.log('🔍 PROXY_URL from env:', SOCKS_URL ? 'set' : 'not set');

    if (!SOCKS_URL) {
      console.log('⚠️ No PROXY_URL set, using direct connection');
    } else {
      console.log('🔌 SOCKS5 proxy detected, setting up local HTTP proxy...');

      // Parse SOCKS URL
      const socksUrl = new URL(SOCKS_URL);
      const proxyOptions = {
        proxy: {
          host: socksUrl.hostname,
          port: parseInt(socksUrl.port) || 1080,
          type: 5, // SOCKS5
          userId: socksUrl.username ? decodeURIComponent(socksUrl.username) : undefined,
          password: socksUrl.password ? decodeURIComponent(socksUrl.password) : undefined,
        },
        command: 'connect',
        destination: { host: '', port: 0 }, // Will be set per request
      };

      // Create a local HTTP proxy server
      const localProxyPort = 0; // Let OS assign random port
      const localProxyServer = createServer((req, res) => {
        res.writeHead(502);
        res.end('This proxy only supports CONNECT');
      });

      // Handle CONNECT method (used for HTTPS and WebSocket tunneling)
      localProxyServer.on('connect', async (req, clientSocket, head) => {
        const { port, hostname } = new URL(`http://${req.url}`);
        console.log(`🔌 CONNECT request to ${hostname}:${port}`);

        try {
          // Resolve hostname to IP (mimics curl's behavior)
          const { address } = await dns.lookup(hostname, { family: 4 }); // Prefer IPv4
          console.log(`   Resolved to IP: ${address}`);

          // Establish SOCKS5 connection using the resolved IP
          const { socket } = await SocksClient.createConnection({
            ...proxyOptions,
            destination: { host: address, port: port },
          });

          console.log(`✅ SOCKS connection established to ${hostname}:${port} via ${address}`);

          // Send 200 Connection Established
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

          // Pipe data
          socket.pipe(clientSocket);
          clientSocket.pipe(socket);

          socket.on('error', (err) => {
            console.error(`❌ SOCKS socket error: ${err.message}`);
            clientSocket.end();
          });
          clientSocket.on('error', (err) => {
            console.error(`❌ Client socket error: ${err.message}`);
            socket.end();
          });

          if (head && head.length > 0) socket.write(head);
        } catch (err) {
          console.error(`❌ Failed to establish SOCKS connection to ${hostname}:${port}: ${err.message}`);
          clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
          clientSocket.end();
        }
      });

      // Start local proxy server
      await new Promise((resolve) => {
        localProxyServer.listen(localProxyPort, '127.0.0.1', () => {
          console.log(`✅ Local HTTP proxy listening on port ${localProxyServer.address().port}`);
          resolve();
        });
      });

      const LOCAL_PROXY_URL = `http://127.0.0.1:${localProxyServer.address().port}`;

      // Configure undici to use local HTTP proxy
      const proxyAgent = new ProxyAgent(LOCAL_PROXY_URL);
      setGlobalDispatcher(proxyAgent);
      console.log('✅ Global undici proxy configured to use local HTTP proxy');

      // Configure WebSocket agent
      const wsAgent = new HttpsProxyAgent(LOCAL_PROXY_URL);
      global.wsProxyAgent = wsAgent;
      console.log('✅ WebSocket proxy agent configured to use local HTTP proxy');
    }

    // ==================== START EXPRESS SERVER FIRST ====================
    const app = express();
    const PORT = process.env.PORT || 10000;
    app.get('/', (req, res) => res.send('Bot is running'));
    app.get('/status', (req, res) => res.json({ status: 'ok', proxy: !!SOCKS_URL }));

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌍 HTTP server listening on port ${PORT} at 0.0.0.0`);
    });

    // ==================== PROXY TEST (NON-BLOCKING) ====================
    if (SOCKS_URL) {
      (async () => {
        try {
          console.log('🧪 Testing proxy via ipify...');
          const response = await fetch('https://api.ipify.org?format=json');
          const data = await response.json();
          console.log('✅ Public IP via proxy:', data.ip);
        } catch (err) {
          console.error('❌ Proxy test failed (non-critical):', err.message);
        }
      })();
    }

    // ==================== DISCORD API TEST ====================
    (async () => {
      try {
        console.log('🌐 Testing connection to Discord API...');
        const res = await fetch('https://discord.com/api/v10/gateway');
        console.log('📡 Discord API status:', res.status, res.statusText);
        const text = await res.text();
        console.log('📄 Discord API response preview:', text.substring(0, 200));
        try {
          const data = JSON.parse(text);
          console.log('✅ Gateway URL:', data.url);
        } catch {
          console.error('❌ Discord API response is not JSON.');
        }
      } catch (err) {
        console.error('❌ Discord API network error:', err.message);
      }
    })();

    // ==================== TOKEN VALIDATION ====================
    const token = process.env.TOKEN;
    console.log('🔑 Token exists?', token ? 'YES' : 'NO');
    console.log('🔑 Token length:', token ? token.length : 'N/A');
    console.log('🔑 Token starts with:', token ? token.substring(0, 5) : 'N/A');

    if (!token) throw new Error('❌ TOKEN environment variable is missing!');

    // ==================== DISCORD CLIENT ====================
    const clientOptions = {
      intents: [GatewayIntentBits.Guilds]
    };
    if (global.wsProxyAgent) {
      clientOptions.ws = {
        agent: global.wsProxyAgent
      };
      console.log('🔌 WebSocket will use proxy agent');
    }

    const client = new Client(clientOptions);

    client.once('ready', () => {
      console.log(`✅ Logged in as ${client.user.tag}`);
    });

    // ==================== LOGIN WITH TIMEOUT ====================
    console.log('🚀 Attempting Discord login...');
    const LOGIN_TIMEOUT_MS = 30000;
    const loginTimeout = setTimeout(() => {
      console.error(`❌ Login timed out after ${LOGIN_TIMEOUT_MS / 1000} seconds`);
      process.exit(1);
    }, LOGIN_TIMEOUT_MS);

    await client.login(token);
    clearTimeout(loginTimeout);
    console.log('✅ Login successful!');

  } catch (err) {
    console.error('❌ Fatal error on startup:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
