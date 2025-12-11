FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=development
ENV HOSTNAME=0.0.0.0

# Run development server
CMD ["npm", "run", "dev"]
