import { ws, addWSListener } from "./Player_Calls";

interface ChatMessage {
    type: 'chat_message';
    text: string;
    player_id: string;
    username: string;
}

let messageCallback: ((message: ChatMessage) => void) | null = null;

addWSListener((event) => {
    try {
        const data = JSON.parse(event.data);
        console.log('[Chat Debug] WebSocket received:', data);
        if (data.type === 'chat_message' && messageCallback) {
            messageCallback(data);
        }
    } catch (error) {
        console.error('Error parsing chat message:', error);
    }
});

export const chat = {
    send: (text: string, userId: string, username: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('Cannot send chat message - WebSocket is not connected');
        return;
    }

        const message: ChatMessage = {
        type: 'chat_message',
            text,
            player_id: userId,
            username
    };
        console.log('[Chat Debug] WebSocket sending:', message);
    ws.send(JSON.stringify(message));
    },

    onMessage: (callback: (message: ChatMessage) => void) => {
        messageCallback = callback;
        }
    };