const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fetch = require('node-fetch'); // Must be v2.x

(async () => {
  try {
    // ==================== PROXY CONFIGURATION ====================
    const PROXY_URL = process.env.PROXY_URL; // e.g., socks5://user:pass@ip:port
    console.log('🔍 PROXY_URL from env:', PROXY_URL ? 'set' : 'not set');

    if (PROXY_URL) {
      console.log('🔌 SOCKS5 proxy detected, configuring...');
      
      // Create SOCKS agent
      const socksAgent = new SocksProxyAgent(PROXY_URL);
      
      // Override global fetch to use the SOCKS agent
      global.fetch = (url, options = {}) => {
        return fetch(url, { ...options, agent: socksAgent });
      };
      
      // Store agent for WebSocket (used by Discord.js client)
      global.wsProxyAgent = socksAgent;
      
      console.log('✅ Global fetch and WebSocket configured to use SOCKS5 proxy');
    } else {
      console.log('⚠️ No PROXY_URL set, using direct connection');
      global.fetch = fetch; // Use normal fetch
    }

    // ==================== TEST GENERAL INTERNET CONNECTIVITY ====================
    try {
      console.log('🌐 Testing general internet connectivity (ipify)...');
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      console.log('✅ Public IP:', ipData.ip);
    } catch (err) {
      console.error('❌ General internet test failed:', err.message);
    }

    // ==================== DISCORD API TEST ====================
    try {
      console.log('🌐 Testing connection to Discord API...');
      const discordRes = await fetch('https://discord.com/api/v10/gateway');
      console.log('📡 Discord API status:', discordRes.status, discordRes.statusText);
      const text = await discordRes.text();
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
      console.error(`❌ Login timed out after ${LOGIN_TIMEOUT_MS/1000} seconds`);
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
