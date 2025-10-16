import { io } from "socket.io-client";

const URL = "http://localhost:4200";

const socket = io(URL, {
  autoConnect: false,
  withCredentials: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  auth: (cb) => {
    const username = localStorage.getItem('username') || prompt('Enter your username:');
    cb({ fetched_userName: username });
  }
});

// Debug
socket.onAny((event, ...args) => {
  console.log('[Socket Event]', event, args);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

export default socket;