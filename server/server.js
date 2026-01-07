import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { neon } from '@neondatabase/serverless';
import { generateRandomName } from './nameGenerator.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "https://ty-fighter.vercel.app"],
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
  room.matchStats = {};
  room.firstFinisher = null;
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

app.post('/api/users/guest', async (req, res) => {
  try {
    const { guestId } = req.body;

    if (!guestId) {
      return res.status(400).json({ error: 'Guest ID is required' });
    }

    const existingUser = await sql`
      SELECT * FROM anonymous_users WHERE guest_id = ${guestId}
    `;

    if (existingUser.length > 0) {
      return res.json({
        userId: existingUser[0].id,
        guestId: existingUser[0].guest_id,
        displayName: existingUser[0].display_name,
        theme: existingUser[0].theme
      });
    }

    const displayName = generateRandomName();
    const newUser = await sql`
      INSERT INTO anonymous_users (guest_id, display_name)
      VALUES (${guestId}, ${displayName})
      RETURNING *
    `;

    await sql`
      INSERT INTO player_stats (guest_id)
      VALUES (${guestId})
    `;

    res.json({
      userId: newUser[0].id,
      guestId: newUser[0].guest_id,
      displayName: newUser[0].display_name,
      theme: newUser[0].theme
    });
  } catch (error) {
    console.error('Error creating guest user:', error);
    res.status(500).json({ error: 'Failed to create guest user' });
  }
});

app.get('/api/users/:guestId/stats', async (req, res) => {
  try {
    const { guestId } = req.params;

    const stats = await sql`
      SELECT ps.*, au.display_name
      FROM player_stats ps
      JOIN anonymous_users au ON ps.guest_id = au.guest_id
      WHERE ps.guest_id = ${guestId}
    `;

    if (stats.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/users/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;

    const user = await sql`
      SELECT * FROM anonymous_users WHERE guest_id = ${guestId}
    `;

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.patch('/api/users/:guestId/theme', async (req, res) => {
  try {
    const { guestId } = req.params;
    const { theme } = req.body;

    if (!theme) {
      return res.status(400).json({ error: 'Theme is required' });
    }

    const validThemes = ['rose-pine', 'rose-pine-dawn', 'gruvbox'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    const result = await sql`
      UPDATE anonymous_users
      SET theme = ${theme}
      WHERE guest_id = ${guestId}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', ({ guestId }) => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      players: [socket.id],
      guestIds: { [socket.id]: guestId },
      ready: [],
      gameState: 'waiting',
      scores: { [socket.id]: 0 }
    };
    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('room-created', { roomCode });
    console.log(`Room created: ${roomCode} by ${guestId}`);
  });

  socket.on('join-room', ({ roomCode, guestId }) => {
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
    room.guestIds[socket.id] = guestId;
    room.scores[socket.id] = 0;
    socket.join(roomCode);
    socket.emit('room-joined', { roomCode });

    io.to(roomCode).emit('room-ready', {
      players: room.players.length
    });
    console.log(`Player ${guestId} joined room: ${roomCode}`);
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

  socket.on('player-finished', async ({ roomCode, wpm, accuracy, time }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    if (!room.matchStats) {
      room.matchStats = {};
    }

    if (!room.firstFinisher) {
      room.firstFinisher = socket.id;
      room.scores[socket.id]++;
    }

    room.matchStats[socket.id] = { wpm, accuracy, time };

    console.log(`player finished: ${socket.id} (guestId: ${room.guestIds[socket.id]})`);
    console.log(`matchStats count: ${Object.keys(room.matchStats).length}`);
    console.log(`room.players:`, room.players);
    console.log(`room.guestIds:`, room.guestIds);

    socket.to(roomCode).emit('opponent-finished');

    io.to(roomCode).emit('round-finished', {
      winner: room.firstFinisher,
      stats: { wpm, accuracy, time },
      scores: room.scores
    });

    room.gameState = 'finished';
    room.ready = [];

    try {
      if (Object.keys(room.matchStats).length === 2) {
        const player1SocketId = room.players[0];
        const player2SocketId = room.players[1];
        const player1GuestId = room.guestIds[player1SocketId];
        const player2GuestId = room.guestIds[player2SocketId];

        if (player1GuestId === player2GuestId) {
          console.log('same user playing against themselves, skipping stats save');
          room.matchStats = {};
          room.firstFinisher = null;
          return;
        }

        const winnerSocketId = room.firstFinisher;
        const winnerGuestId = room.guestIds[winnerSocketId];

        const player1Stats = room.matchStats[player1SocketId];
        const player2Stats = room.matchStats[player2SocketId];

        const textResult = await sql`
          SELECT id FROM texts WHERE content = ${room.text} LIMIT 1
        `;
        const textId = textResult[0]?.id;

        await sql`
          INSERT INTO matches (
            player1_guest_id, player2_guest_id, winner_guest_id,
            player1_wpm, player2_wpm,
            player1_accuracy, player2_accuracy,
            player1_time, player2_time,
            text_id
          ) VALUES (
            ${player1GuestId}, ${player2GuestId}, ${winnerGuestId},
            ${player1Stats.wpm}, ${player2Stats.wpm},
            ${player1Stats.accuracy}, ${player2Stats.accuracy},
            ${player1Stats.time}, ${player2Stats.time},
            ${textId}
          )
        `;

        console.log('match saved, updating player stats...');

        for (const playerId of room.players) {
          const guestId = room.guestIds[playerId];
          const stats = room.matchStats[playerId];
          const won = playerId === winnerSocketId ? 1 : 0;

          const currentStats = await sql`
            SELECT * FROM player_stats WHERE guest_id = ${guestId}
          `;

          if (currentStats.length > 0) {
            const current = currentStats[0];
            const newGamesPlayed = current.games_played + 1;
            const newGamesWon = current.games_won + won;
            const newAvgWpm = ((current.avg_wpm * current.games_played) + stats.wpm) / newGamesPlayed;
            const newBestWpm = Math.max(current.best_wpm, stats.wpm);
            const newAvgAccuracy = ((current.avg_accuracy * current.games_played) + stats.accuracy) / newGamesPlayed;
            const newTotalChars = current.total_characters_typed + (stats.wpm * 5 * (stats.time / 60));

            console.log(`updating stats for ${guestId}: games_played=${newGamesPlayed}, games_won=${newGamesWon}, avg_wpm=${newAvgWpm.toFixed(2)}`);

            await sql`
              UPDATE player_stats
              SET games_played = ${newGamesPlayed},
                  games_won = ${newGamesWon},
                  avg_wpm = ${newAvgWpm},
                  best_wpm = ${newBestWpm},
                  avg_accuracy = ${newAvgAccuracy},
                  total_characters_typed = ${newTotalChars},
                  updated_at = CURRENT_TIMESTAMP
              WHERE guest_id = ${guestId}
            `;
          }
        }

        room.matchStats = {};
        room.firstFinisher = null;
      }
    } catch (error) {
      console.error('Error saving match to database:', error);
    }
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
