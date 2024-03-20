// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:3000' } }); 

const activeConnections = new Map();

app.get('/', (req, res) => {
  res.send('Hello World!');
});


io.on('connection', (socket) => {
 `  `

  // Handle new messages
  socket.on('sendMessage', (message) => {
    console.log('New message:', message);
    io.to(message.chatId).emit('newMessage', message);
  });

  // Handle user joining a chat room
  socket.on('joinChat', ({ chatId, userId }) => {
    socket.join(chatId);
    activeConnections.set(socket.id, { userId, chatId });
    console.log(`User ${userId} joined chat room: ${chatId}`);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    const connectionInfo = activeConnections.get(socket.id);
    if (connectionInfo) {
      const { userId, chatId } = connectionInfo;
      io.to(chatId).emit('userDisconnected', userId);
      activeConnections.delete(socket.id);
    }
  });
});

module.exports = { app, server ,io};