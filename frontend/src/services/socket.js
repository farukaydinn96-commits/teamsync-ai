import { io } from 'socket.io-client';
import { BACKEND_URL } from '../constants/workspaceConfig';

export const SOCKET_OPTIONS = {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 2500,
  timeout: 20000,
};

export const socket = io(BACKEND_URL, SOCKET_OPTIONS);

export default socket;
