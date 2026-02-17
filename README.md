# Discord Bot on Render (Docker)

This repository contains a Discord bot configured to run on Render's free tier using Docker. It includes a health check endpoint to prevent the service from sleeping.

## Setup

1. Clone this repository
2. Install dependencies: `npm install`
3. Create a `.env` file with `TOKEN=your_discord_bot_token`
4. Test locally: `docker build -t bot . && docker run -p 10000:10000 --env-file .env bot`

## Deploy on Render

1. Push this repository to GitHub
2. On Render, create a **New Web Service**
3. Connect your repository
4. Choose **Docker** as the environment
5. Add environment variable `TOKEN` with your bot token
6. Select **Free** instance and create

## Keep Alive

Sign up at [cron-job.org](https://cron-job.org) and create a job that pings `https://your-service.onrender.com/health` every 5 minutes. This keeps the service awake 24/7 for free.
