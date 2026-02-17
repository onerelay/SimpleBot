const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const PROXY_WORKER_URL = 'https://discord.onerelay.workers.dev/';

// Patch fetch to use proxy for Discord API calls
const originalFetch = global.fetch;
global.fetch = async (url, options = {}) => {
  // Only proxy Discord API calls
  if (url.includes('discord.com/api')) {
    const discordPath = new URL(url).pathname;
    url = `${PROXY_WORKER_URL}${discordPath}`;
    // Add original host header
    options.headers = {
      ...options.headers,
      'Host': 'discord.com'
    };
  }
  return originalFetch(url, options);
};

// Proxy configuration (read from environment)
const PROXY_URL = process.env.PROXY_URL; // e.g., http://user:pass@ip:port or socks5://...

// If proxy is set, configure global fetch (undici) and WebSocket agent
if (PROXY_URL) {
  console.log('🔌 Proxy detected, configuring...');
  
  // For fetch (Discord API calls)
  const { ProxyAgent, setGlobalDispatcher } = require('undici');
  const proxyAgent = new ProxyAgent(PROXY_URL);
  setGlobalDispatcher(proxyAgent);
  console.log('✅ Global fetch proxy configured');

  // For WebSocket (Discord gateway)
  const { HttpsProxyAgent } = require('https-proxy-agent');
  const wsAgent = new HttpsProxyAgent(PROXY_URL);
  // We'll pass this agent to the Discord client via the `ws` option
  global.wsProxyAgent = wsAgent; // Store for later use
} else {
  console.log('⚠️ No PROXY_URL set, using direct connection');
}
// ==================== TEST GENERAL INTERNET CONNECTIVITY ====================
(async () => {
  try {
    console.log('🌐 Testing general internet connectivity (ipify)...');
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    console.log('✅ Public IP:', data.ip);
  } catch (err) {
    console.error('❌ General internet test failed:', err.message);
  }
})();

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

if (!token) {
  console.error('❌ TOKEN environment variable is missing!');
  // Do not exit – continue to show other diagnostics.
}

// ==================== DISCORD CLIENT ====================
// Pass the proxy agent to the WebSocket if configured
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
if (token) {
  console.log('🚀 Attempting Discord login...');
  const LOGIN_TIMEOUT_MS = 30000;
  const loginTimeout = setTimeout(() => {
    console.error(`❌ Login timed out after ${LOGIN_TIMEOUT_MS/1000} seconds`);
    process.exit(1);
  }, LOGIN_TIMEOUT_MS);

  client.login(token)
    .then(() => {
      clearTimeout(loginTimeout);
      console.log('✅ Login successful!');
    })
    .catch(err => {
      clearTimeout(loginTimeout);
      console.error('❌ Login failed:', err.message);
      process.exit(1);
    });
} else {
  console.log('⏸️ Skipping login because token is missing.');
}

// ==================== EXPRESS SERVER ====================
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('Bot is running'));

app.listen(PORT, () => {
  console.log(`🌍 HTTP server listening on port ${PORT}`);
});
