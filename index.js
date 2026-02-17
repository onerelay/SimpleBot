const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { createServer } = require('http');
const { ProxyAgent, setGlobalDispatcher } = require('undici');
const { HttpsProxyAgent } = require('https-proxy-agent');

(async () => {
  try {
    // ==================== SOCKS5 PROXY CONFIGURATION ====================
    const SOCKS_URL = process.env.PROXY_URL; // e.g., socks5://user:pass@ip:port
    console.log('🔍 PROXY_URL from env:', SOCKS_URL ? 'set' : 'not set');

    if (!SOCKS_URL) {
      console.log('⚠️ No PROXY_URL set, using direct connection');
    } else {
      console.log('🔌 SOCKS5 proxy detected, setting up local HTTP proxy...');

      // Create a SOCKS5 agent for the local proxy to use
      const socksAgent = new SocksProxyAgent(SOCKS_URL);

      // Create a local HTTP proxy server that forwards to the SOCKS5 proxy
      const localProxyPort = 0; // Let the OS assign a random free port
      const localProxyServer = createServer((req, res) => {
        // This handles HTTP requests (not CONNECT) – we'll only use CONNECT for WebSocket, but include for completeness
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('This proxy only supports CONNECT (WebSocket)');
      });

      // Handle CONNECT method (used for HTTPS and WebSocket tunneling)
      localProxyServer.on('connect', (req, clientSocket, head) => {
        const { port, hostname } = new URL(`http://${req.url}`);
        // Connect to the target through the SOCKS5 proxy
        socksAgent.connect(req, { host: hostname, port }, (err, proxySocket) => {
          if (err) {
            clientSocket.write('HTTP/1.1 500 Connection Failed\r\n\r\n');
            clientSocket.end();
            return;
          }
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          // Pipe data between client and proxy
          proxySocket.pipe(clientSocket);
          clientSocket.pipe(proxySocket);
        });
      });

      // Start the local proxy server
      await new Promise((resolve) => {
        localProxyServer.listen(localProxyPort, '127.0.0.1', () => {
          console.log(`✅ Local HTTP proxy listening on port ${localProxyServer.address().port}`);
          resolve();
        });
      });

      const LOCAL_PROXY_URL = `http://127.0.0.1:${localProxyServer.address().port}`;

      // ==================== CONFIGURE UNDERICI TO USE LOCAL HTTP PROXY ====================
      const proxyAgent = new ProxyAgent(LOCAL_PROXY_URL);
      setGlobalDispatcher(proxyAgent);
      console.log('✅ Global undici proxy configured to use local HTTP proxy');

      // ==================== CONFIGURE WEBSOCKET AGENT ====================
      const wsAgent = new HttpsProxyAgent(LOCAL_PROXY_URL);
      global.wsProxyAgent = wsAgent;
      console.log('✅ WebSocket proxy agent configured to use local HTTP proxy');
    }

    // ==================== TEST PROXY VIA LOCAL HTTP PROXY ====================
    try {
      console.log('🧪 Testing proxy via ipify (through undici)...');
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      console.log('✅ Public IP via proxy:', data.ip);
    } catch (err) {
      console.error('❌ Proxy test failed:', err.message);
    }

    // ==================== DISCORD API TEST ====================
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

    // ==================== TOKEN VALIDATION ====================
    const token = process.env.TOKEN;
    console.log('🔑 Token exists?', token ? 'YES' : 'NO');
    console.log('🔑 Token length:', token ? token.length : 'N/A');
    console.log('🔑 Token starts with:', token ? token.substring(0, 5) : 'N/A');

    if (!token) {
      throw new Error('❌ TOKEN environment variable is missing!');
    }

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

    // ==================== EXPRESS SERVER ====================
    const app = express();
    const PORT = process.env.PORT || 10000;

    app.get('/', (req, res) => res.send('Bot is running'));

    app.listen(PORT, () => {
      console.log(`🌍 HTTP server listening on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Fatal error on startup:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
