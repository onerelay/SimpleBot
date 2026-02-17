FROM alpine:latest

# Install system dependencies (no nginx, no ngrok)
RUN apk add --no-cache \
    bash \
    curl \
    openssh \
    nodejs \
    npm \
    # for cloudflared
    ca-certificates

# Install cloudflared
RUN curl -L --output cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    && chmod +x cloudflared \
    && mv cloudflared /usr/local/bin/

# Configure SSH (optional, but keep for now)
RUN ssh-keygen -A && \
    echo 'root:SecurePass123' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY app/package*.json ./
RUN npm install --only=production

# Copy bot source
COPY app/index.js ./

# Copy startup script
COPY start_services.sh /start_services.sh
RUN chmod +x /start_services.sh

# Expose the port Render expects (10000) and SSH port (22)
EXPOSE 10000 22

CMD ["/start_services.sh"]
