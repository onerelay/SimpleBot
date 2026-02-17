const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { ProxyAgent, setGlobalDispatcher } = require('undici');
const { HttpsProxyAgent } = require('https-proxy-agent');

(async () => {
  try {
    // ==================== PROXY CONFIGURATION ====================
    const PROXY_URL = process.env.PROXY_URL; // Must be http:// or https://
    console.log('🔍 PROXY_URL from env:', PROXY_URL ? 'set' : 'not set');

    if (PROXY_URL) {
      console.log('🔌 HTTP/HTTPS proxy detected, configuring...');

      // For HTTP requests (Discord REST API)
      const proxyAgent = new ProxyAgent(PROXY_URL);
      setGlobalDispatcher(proxyAgent);
      console.log('✅ Global undici proxy configured');

      // For WebSocket (Discord Gateway)
      const wsAgent = new HttpsProxyAgent(PROXY_URL);
      global.wsProxyAgent = wsAgent;
      console.log('✅ WebSocket proxy agent configured');
    } else {
      console.log('⚠️ No PROXY_URL set, using direct connection');
    }

    // ==================== START EXPRESS SERVER (REQUIRED BY RENDER) ====================
    const app = express();
    const PORT = process.env.PORT || 10000;
    app.get('/', (req, res) => res.send('Bot is running'));
    app.get('/status', (req, res) => res.json({ status: 'ok', proxy: !!PROXY_URL }));

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌍 HTTP server listening on port ${PORT} at 0.0.0.0`);
    });

    // ==================== TOKEN VALIDATION ====================
    const token = process.env.TOKEN;
    console.log('🔑 Token exists?', token ? 'YES' : 'NO');
    console.log('🔑 Token length:', token ? token.length : 'N/A');
    if (!token) {
      throw new Error('❌ TOKEN environment variable is missing!');
    }

    // ==================== DISCORD CLIENT ====================
    const clientOptions = {
      intents: [GatewayIntentBits.Guilds] // Add more intents as needed
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
