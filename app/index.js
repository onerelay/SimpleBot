const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 4040;

// Health check endpoint (used by cron-job.org to keep service alive)
app.get('/health', (req, res) => res.send('OK'));
app.get('/', (req, res) => res.send('Bot is running'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Health server listening on port ${PORT}`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
