# Stage 1: Build the Vite dashboard
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY dashboard/package*.json ./dashboard/
RUN npm install --prefix dashboard
COPY dashboard/ ./dashboard/
RUN npm run build --prefix dashboard

# Stage 2: Main application runner
FROM mcr.microsoft.com/playwright:v1.44.1-jammy
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Copy the built dashboard from Stage 1
COPY --from=frontend-builder /app/dashboard/dist ./dashboard/dist

# Expose backend port
EXPOSE 3001

CMD ["npm", "run", "server"]
