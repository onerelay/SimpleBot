const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const app = express();

// Health check endpoint (used by cron-job.org to keep service alive)
app.get('/health', (req, res) => res.send('OK'));
app.get('/', (req, res) => res.send('Bot is running'));

app.listen(4040, '0.0.0.0', () => {
    console.log(`Health server listening on port 4040`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
