# Use Node.js LTS
FROM node:20-alpine

# Add necessary packages
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    jpeg-dev \
    cairo-dev \
    pango-dev \
    giflib-dev

# Create app directory
WORKDIR /usr/src/app

# Install PM2 globally
RUN npm install pm2 -g

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create necessary directories
RUN mkdir -p logs temp-uploads

# Set proper permissions
RUN chown -R node:node .
USER node

# Expose port
EXPOSE 4000

# Start the application with PM2
CMD ["pm2-runtime", "ecosystem.config.json", "--env", "production"]
