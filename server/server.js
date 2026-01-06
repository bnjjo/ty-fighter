import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { neon } from '@neondatabase/serverless';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

const sql = neon(process.env.DATABASE_URL);

const rooms = new Map();

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const pickRandomText = async () => {
  try {
    const result = await sql`
      SELECT content FROM texts
      ORDER BY RANDOM()
      LIMIT 1
    `;
    return result[0]?.content || 'The quick brown fox jumps over the lazy dog.';
  } catch (error) {
    console.error('Error fetching text from database:', error);
    return 'The quick brown fox jumps over the lazy dog.';
  }
}

const startGame = (roomCode) => {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.gameState = 'playing';

  io.to(roomCode).emit('game-start');
}

const startCountdown = async (roomCode) => {
  const room = rooms.get(roomCode);
  if (!room) return;

  const text = await pickRandomText();
  room.text = text;
  room.gameState = 'countdown';
  let count = 11;

  console.log("Countdown started");
  const countdown = setInterval(() => {
    io.to(roomCode).emit('countdown', { count, text: room.text });
    console.log(count);
    count--;

    if (count < 0) {
      clearInterval(countdown);
      startGame(roomCode);
    }
  }, 1000);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', () => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      players: [socket.id],
      ready: [],
      gameState: 'waiting', // waiting, countdown, playing, finished
      scores: { [socket.id]: 0 }
    };
    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('room-created', { roomCode });
    console.log(`Room created: ${roomCode}`);
  });

  socket.on('join-room', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      console.log('Room not found');
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('error', { message: 'Room is full' });
      console.log('Room is full');
      return;
    }

    room.players.push(socket.id);
    room.scores[socket.id] = 0;
    socket.join(roomCode);
    socket.emit('room-joined', { roomCode });

    io.to(roomCode).emit('room-ready', {
      players: room.players.length
    });
    console.log(`Player joined room: ${roomCode}`);
  });

  socket.on('player-ready', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    if (!room.ready.includes(socket.id)) {
      room.ready.push(socket.id);
    }

    io.to(roomCode).emit('ready-status', {
      readyCount: room.ready.length,
      totalPlayers: room.players.length
    });

    if (room.ready.length === 2) {
      room.gameState = 'countdown';
      startCountdown(roomCode);
    }
  });

  socket.on('typing-progress', ({ roomCode, progress, wpm }) => {
    socket.to(roomCode).emit('opponent-progress', {
      progress,
      wpm
    });
  });

  socket.on('player-finished', ({ roomCode, wpm, accuracy, time }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.scores[socket.id]++;

    socket.to(roomCode).emit('opponent-finished');

    io.to(roomCode).emit('round-finished', {
      winner: socket.id,
      stats: { wpm, accuracy, time },
      scores: room.scores
    });

    room.gameState = 'finished';
    room.ready = [];
  });

  socket.on('rematch-vote', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    if (!room.ready.includes(socket.id)) {
      room.ready.push(socket.id);
    }

    if (room.ready.length === 2) {
      startCountdown(roomCode);
    }
  });

  socket.on('leave-room', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.players = room.players.filter(id => id !== socket.id);
    delete room.scores[socket.id];
    room.ready = room.ready.filter(id => id !== socket.id);
    socket.leave(roomCode);

    if (room.players.length === 0) {
      rooms.delete(roomCode);
    } else {
      io.to(roomCode).emit('player-left');
    }
    console.log(`Player left room: ${roomCode}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (let [code, room] of rooms.entries()) {
      if (room.players.includes(socket.id)) {
        room.players = room.players.filter(id => id !== socket.id);
        delete room.scores[socket.id];
        room.ready = room.ready.filter(id => id !== socket.id);

        if (room.players.length === 0) {
          rooms.delete(code);
        } else {
          io.to(code).emit('player-left');
        }
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
