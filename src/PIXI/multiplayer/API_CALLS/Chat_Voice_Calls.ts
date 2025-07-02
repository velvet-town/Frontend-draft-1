import { ws, addWSListener } from "./Player_Calls";

interface ChatMessage {
    type: 'chat_message';
    text: string;
    player_id: string;
    username: string;
}

interface PrivateMessage {
    type: 'private_message';
    text: string;
    player_id: string;
    target_player_id: string;
    username: string;
}

interface PrivateMessageReceived {
    type: 'private_message';
    text: string;
    player_id: string;
    username: string;
    timestamp: number;
}



let messageCallback: ((message: ChatMessage) => void) | null = null;
let privateMessageCallback: ((message: PrivateMessageReceived) => void) | null = null;

addWSListener((event) => {
    try {
        const data = JSON.parse(event.data);
        console.log('[Chat Debug] WebSocket received:', data);
        
        if (data.type === 'chat_message' && messageCallback) {
            messageCallback(data);
        } else if (data.type === 'private_message' && privateMessageCallback) {
            privateMessageCallback(data);
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

    sendPrivate: (text: string, userId: string, targetUserId: string, username: string) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error('Cannot send private message - WebSocket is not connected');
            return;
        }

        const message: PrivateMessage = {
            type: 'private_message',
            text,
            player_id: userId,
            target_player_id: targetUserId,
            username
        };
        console.log('[Chat Debug] WebSocket sending private message:', message);
        ws.send(JSON.stringify(message));
    },

    onMessage: (callback: (message: ChatMessage) => void) => {
        messageCallback = callback;
    },

    onPrivateMessage: (callback: (message: PrivateMessageReceived) => void) => {
        privateMessageCallback = callback;
    }
};