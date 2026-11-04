FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npx prisma generate

# Copy source
COPY . .

# Ensure storage directory exists
RUN mkdir -p storage/uploads

EXPOSE 5000

CMD ["node", "src/server.js"]
