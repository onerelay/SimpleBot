FROM alpine:latest

# Install system dependencies
RUN apk add --no-cache \
    bash \
    git \
    curl \
    openssh \
    nodejs \
    npm \
    screen \
    nano

# Configure SSH
RUN ssh-keygen -A && \
    echo 'root:SecurePass123' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Create working directories
WORKDIR /

# Copy package.json from root and install dependencies
COPY package*.json ./
RUN npm install

# Copy application folders
COPY app/ /app
COPY bot/ /bot

# Copy startup script
COPY start_services.sh /start_services.sh
RUN chmod +x /start_services.sh

# Expose ports
EXPOSE 10000 22

CMD ["/start_services.sh"]
