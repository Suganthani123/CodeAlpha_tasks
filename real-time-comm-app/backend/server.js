const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());

// ---------- In-memory database ----------
const users = [];      // { id, username, email, password }
let nextUserId = 1;
const rooms = new Map(); // roomId -> { participants: Map(socketId -> {userId, username}), whiteboardData: '' }

// Auth routes (simple)
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (users.find(u => u.email === email))
    return res.status(400).json({ msg: 'User exists' });
  const id = nextUserId++;
  users.push({ id, username, email, password });
  res.json({ token: 'dummy', user: { id, username, email } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
  res.json({ token: 'dummy', user: { id: user.id, username: user.username, email: user.email } });
});

// Room routes
app.post('/api/rooms/create', (req, res) => {
  const roomId = Math.random().toString(36).substring(2, 8);
  rooms.set(roomId, { participants: new Map(), whiteboardData: '' });
  res.json({ roomId });
});

app.post('/api/rooms/join/:roomId', (req, res) => {
  if (!rooms.has(req.params.roomId)) return res.status(404).json({ msg: 'Room not found' });
  res.json({ success: true });
});

// ---------- Socket.io with all features ----------
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentRoom = null;
  let currentUser = null;

  socket.on('join-room', ({ roomId, userId, username }) => {
    currentRoom = roomId;
    currentUser = { userId, username };
    socket.join(roomId);

    if (!rooms.has(roomId))
      rooms.set(roomId, { participants: new Map(), whiteboardData: '' });
    const room = rooms.get(roomId);
    room.participants.set(socket.id, { userId, username });

    // Notify others
    socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, username });
    // Send existing participants to new user
    const participantsList = Array.from(room.participants.entries()).map(([sid, data]) => ({
      socketId: sid, userId: data.userId, username: data.username
    }));
    socket.emit('existing-participants', participantsList);
    socket.emit('whiteboard-sync', room.whiteboardData);
  });

  // WebRTC signaling
  socket.on('offer', ({ to, offer }) => io.to(to).emit('offer', { from: socket.id, offer }));
  socket.on('answer', ({ to, answer }) => io.to(to).emit('answer', { from: socket.id, answer }));
  socket.on('ice-candidate', ({ to, candidate }) => io.to(to).emit('ice-candidate', { from: socket.id, candidate }));

  // Screen share (special event – we just signal, the peer will replace track)
  socket.on('screen-share-offer', ({ to, offer }) => io.to(to).emit('screen-share-offer', { from: socket.id, offer }));
  socket.on('screen-share-answer', ({ to, answer }) => io.to(to).emit('screen-share-answer', { from: socket.id, answer }));

  // Whiteboard
  socket.on('draw', (data) => socket.to(data.roomId).emit('draw', data));
  socket.on('whiteboard-save', ({ roomId, data }) => {
    const room = rooms.get(roomId);
    if (room) room.whiteboardData = data;
  });

  // Chat
  socket.on('chat-message', ({ roomId, message, username }) => {
    io.to(roomId).emit('chat-message', { username, message, timestamp: new Date() });
  });

  // File sharing via data channel – we forward file chunks
  socket.on('file-metadata', ({ to, fileName, fileType, fileSize }) => {
    io.to(to).emit('file-metadata', { from: socket.id, fileName, fileType, fileSize });
  });
  socket.on('file-chunk', ({ to, chunk, index, total }) => {
    io.to(to).emit('file-chunk', { from: socket.id, chunk, index, total });
  });

  // Reactions & hand raise
  socket.on('send-reaction', ({ roomId, reaction, username }) => {
    io.to(roomId).emit('reaction', { username, reaction });
  });
  socket.on('raise-hand', ({ roomId, username }) => {
    io.to(roomId).emit('hand-raised', { username });
  });

  // Media toggles
  socket.on('toggle-audio', ({ roomId, userId, muted }) => {
    socket.to(roomId).emit('user-audio-toggle', { userId, muted });
  });
  socket.on('toggle-video', ({ roomId, userId, disabled }) => {
    socket.to(roomId).emit('user-video-toggle', { userId, disabled });
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.participants.delete(socket.id);
        io.to(currentRoom).emit('user-left', socket.id);
        if (room.participants.size === 0) rooms.delete(currentRoom);
      }
    }
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));