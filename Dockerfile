FROM node:20-bullseye

# System deps: ffmpeg + python3-pip, then yt-dlp
RUN apt-get update && apt-get install -y ffmpeg python3-pip && \    pip3 install --upgrade yt-dlp && \    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production

# Render will supply PORT; app listens on it
CMD ["node", "index.js"]
