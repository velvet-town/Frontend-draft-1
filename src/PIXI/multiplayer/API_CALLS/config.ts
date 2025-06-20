// export const BACKEND_HTTP_URL = 'https://backend-n751.onrender.com'; // Update with your backend URL
// export const BACKEND_WS_URL = 'wss://backend-n751.onrender.com';

export const BACKEND_HTTP_URL = 'http://localhost:8080'; // Update with your backend URL
export const BACKEND_WS_URL = 'ws://localhost:8080';

export const ENDPOINTS = {
  JOIN_ROOM: '/player/join-room',
  JOIN_SPECIFIC_ROOM: '/player/join-specific-room',
  UPDATE_POSITION: '/player/update-position',
  GET_OTHER_PLAYERS: '/player/get-other-players',
  WS: '/player/ws',
}; 