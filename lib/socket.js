'use client';
import { io } from 'socket.io-client';

// Singleton socket connection
let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      autoConnect: true
    });
  }
  return socket;
};
