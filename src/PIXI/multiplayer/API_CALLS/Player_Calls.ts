import { BACKEND_HTTP_URL, BACKEND_WS_URL, ENDPOINTS } from './config';

interface RoomResponse {
  room_id: string;
  players: Array<{
    id: string;
    position: { x: number; y: number };
  }>;
}

interface WebSocketMessage {
  type: string;
  playerId?: string;
  player_id?: string;
  position?: { x: number; y: number };
}

export let ws: WebSocket | null = null;
const wsListeners: ((event: MessageEvent) => void)[] = [];

export function addWSListener(listener: (event: MessageEvent) => void) {
    wsListeners.push(listener);
    if (ws) ws.addEventListener('message', listener);
}

export async function joinRoom(userId: string): Promise<RoomResponse> {
  if (!userId) throw new Error('User ID is required to join room');
  
  console.log('Attempting to join room for user:', userId);
  try {
    const response = await fetch(BACKEND_HTTP_URL + ENDPOINTS.JOIN_ROOM, {
      method: 'POST',
      headers: {
        'Authorization': userId,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to join room:', error);
      throw new Error(`Failed to join room: ${error}`);
    }

    const roomData = await response.json();
    console.log('Successfully joined room:', roomData);
    return roomData;
  } catch (e) {
    console.error('Error joining room:', e);
    throw e;
  }
}

export async function joinSpecificRoom(userId: string, roomId: string): Promise<RoomResponse> {
  if (!userId) throw new Error('User ID is required to join room');
  if (!roomId) throw new Error('Room ID is required to join specific room');
  
  console.log('Attempting to join specific room for user:', userId, 'room:', roomId);
  try {
    const response = await fetch(BACKEND_HTTP_URL + ENDPOINTS.JOIN_SPECIFIC_ROOM, {
      method: 'POST',
      headers: {
        'Authorization': userId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ room_id: roomId }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to join specific room:', error);
      
      // Provide user-friendly error messages
      if (error.includes('is full')) {
        throw new Error(`Room ${roomId} is full (max 20 players)`);
      } else if (error.includes('too long')) {
        throw new Error(`Invalid room ID: ${error}`);
      } else {
        throw new Error(`Failed to join room ${roomId}: ${error}`);
      }
    }

    const roomData = await response.json();
    console.log('Successfully joined specific room:', roomData);
    return roomData;
  } catch (e) {
    console.error('Error joining specific room:', e);
    throw e;
  }
}

export function initializeWebSocket(userId: string, onMessage: (data: WebSocketMessage) => void): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('Using existing WebSocket connection');
      resolve(ws);
      return;
    }

    if (ws) {
      console.log('Closing existing WebSocket connection');
      ws.close();
    }

    console.log('Initializing new WebSocket connection for user:', userId);
    ws = new WebSocket(`${BACKEND_WS_URL}${ENDPOINTS.WS}?token=${encodeURIComponent(userId)}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      resolve(ws!);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      ws = null;
    };

    // Attach all registered listeners to the new ws
    wsListeners.forEach(listener => ws!.addEventListener('message', listener));
  });
}

export function updatePlayerPosition(position: { x: number; y: number }) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('Cannot send position update - WebSocket is not connected');
    return;
  }

  const message = {
    type: 'position_update',
    position: position
  };

  ws.send(JSON.stringify(message));
}

export function leaveRoom() {
  if (!ws) {
    console.error('Cannot leave room - WebSocket is not connected');
    return;
  }

  try {
    // Send leave room message if WebSocket is still open
    if (ws.readyState === WebSocket.OPEN) {
  const message = {
    type: 'leave_room'
  };
  console.log('Sending leave room message');
      
      // Use a Promise to ensure the message is sent before closing
      const sendMessage = new Promise<void>((resolve) => {
        ws!.send(JSON.stringify(message));
        // Give a small delay to ensure the message is sent
        setTimeout(resolve, 100);
      });

      // Wait for the message to be sent before closing
      sendMessage.then(() => {
        // Close WebSocket connection
        ws!.close();
        ws = null;
        
        // Clear all WebSocket listeners
        wsListeners.forEach(listener => {
          if (ws) {
            ws.removeEventListener('message', listener);
          }
        });
        wsListeners.length = 0;
      });
    } else {
      // If WebSocket is not open, just clean up
  ws.close();
      ws = null;
      wsListeners.length = 0;
    }
  } catch (error) {
    console.error('Error while leaving room:', error);
  }
} 