const { Client, GatewayIntentBits } = require('discord.js');

const token = process.env.TOKEN;
if (!token) {
    console.error('❌ TOKEN environment variable missing');
    process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.login(token).catch(err => {
    console.error('❌ Bot login failed:', err.message);
    process.exit(1);
});
