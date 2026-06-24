require('dotenv').config();
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const authRoutes = require('./server/routes/authRoutes');
const teamRoutes = require('./server/routes/teamRoutes');
const friendRoutes = require('./server/routes/friendRoutes');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const MONGODB_URI = process.env.MONGODB_URI;

app.prepare().then(async () => {
  let uri = MONGODB_URI;
  if (!uri) {
    console.log('No MONGODB_URI provided. Starting in-memory MongoDB for development...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
  }

  mongoose.connect(uri)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch((err) => {
      console.error('❌ MongoDB connection failed:', err.message);
      process.exit(1);
    });

  const server = express();
  server.use(express.json());
  server.use(cookieParser());

  server.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', phase: 7 });
  });

  server.use('/api/auth', authRoutes);
  server.use('/api/teams', teamRoutes);
  server.use('/api/friends', friendRoutes);

  // Next.js Catch-all
  server.use((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const httpServer = createServer(server);

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    }
  });

  const setupSocket = require('./server/socket/index');
  setupSocket(io);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
