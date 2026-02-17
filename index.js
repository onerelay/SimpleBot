const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 10000;  // Render sets PORT env

// Basic route to keep Render happy
app.get('/', (req, res) => res.send('Bot is running'));

// Start HTTP server
app.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
});

// Your Discord bot
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
