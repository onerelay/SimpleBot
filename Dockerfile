# Multi-purpose free Render server with Node.js Discord bot
FROM alpine:latest

# Install essential packages: bash, curl, nginx, openssh, nodejs, npm, and optionally ngrok
RUN apk add --no-cache bash curl nginx openssh nodejs npm \
    && if [ "${INSTALL_NGROK}" = "true" ]; then apk add --no-cache ngrok; fi

# Create necessary directories
RUN mkdir -p /run/nginx /app

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy bot source
COPY index.js ./

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY start_services.sh /start_services.sh
RUN chmod +x /start_services.sh

# SSH setup (optional – remove if not needed)
RUN echo "root:$(openssl rand -base64 32)" | chpasswd \
    && ssh-keygen -A \
    && sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config \
    && sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Expose ports: 10000 for Render, 22 for SSH (if enabled), and ngrok ports
EXPOSE 10000 22 4040

# Start all services
CMD ["/start_services.sh"]
