import { io } from "socket.io-client";
import { BACKEND_URL } from "../constants/workspaceConfig";

export const SOCKET_OPTIONS = {
  transports: ["websocket"],
  upgrade: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 400,
  reconnectionDelayMax: 2000,
  timeout: 10000,
};

export const socket = io(BACKEND_URL, SOCKET_OPTIONS);

export default socket;
