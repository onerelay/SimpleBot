FROM alpine:latest

# Install system dependencies (keep what you need)
RUN apk add --no-cache \
    nginx \
    bash \
    curl \
    openssh \
    nodejs \
    npm \
    # optional: ngrok
    && curl -sSL https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz \
       | tar xz -C /usr/local/bin

# Configure SSH (optional)
RUN ssh-keygen -A && \
    echo 'root:SecurePass123' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Create necessary directories
RUN mkdir -p /run/nginx /app

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY start_services.sh /start_services.sh
RUN chmod +x /start_services.sh

# Copy and set up your bot
COPY app /app
WORKDIR /app
RUN npm install --only=production

WORKDIR /

# Expose ports
EXPOSE 10000 22 4040

CMD ["/start_services.sh"]
