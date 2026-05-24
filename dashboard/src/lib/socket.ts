import { io, type Socket } from 'socket.io-client';
import { AUTH_TOKEN } from './token';

let socket: Socket | null = null;

/** Uma conexão Socket.IO compartilhada pela dashboard. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ auth: { token: AUTH_TOKEN } });
  }
  return socket;
}
