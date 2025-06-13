import { useState, useEffect } from 'react'
import { chat } from '../API_CALLS/Chat_Voice_Calls'

interface ChatMessage {
    text: string;
    player_id: string;
    username: string;
}

interface Chat_ComponentProps {
    userId: string;
    username: string;
}

const Chat_Component: React.FC<Chat_ComponentProps> = ({ userId, username }) => {
    const [message, setMessage] = useState<string>("")
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [showChatBox, setShowChatBox] = useState<boolean>(false)

    useEffect(() => {
        chat.onMessage((message) => {
            setMessages(prev => {
                const updated = [...prev, message];
               
                return updated;
            });
        })
    }, [])

    const handleSendMessage = () => {
        if (message.trim() !== "") {
            const newMessage = { text: message, player_id: userId, username }
            setMessages(prev => [...prev, newMessage])
            chat.send(message, userId, username)
            setMessage("")
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <button 
                className='bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2'
                onClick={() => setShowChatBox(!showChatBox)}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                Chat
            </button>

            {showChatBox && (
                <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
                    <div className="bg-indigo-600 text-white p-3 rounded-t-lg flex justify-between items-center">
                        <h3 className="font-semibold">Chat</h3>
                        <button 
                            onClick={() => setShowChatBox(false)}
                            className="hover:text-gray-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    <div className="h-64 overflow-y-auto p-3 bg-gray-50">
                        {messages.map((msg, index) => (
                            <div 
                                key={index} 
                                className={`mb-2 p-2 rounded-lg shadow-sm ${
                                    msg.player_id === userId 
                                        ? 'bg-indigo-100 ml-8' 
                                        : 'bg-white mr-8'
                                }`}
                            >
                                <div className="text-xs text-gray-500 mb-1">
                                    {msg.username}
                                </div>
                                <div>{msg.text}</div>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-gray-200">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={message} 
                                onChange={(e) => setMessage(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Type a message..."
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button 
                                onClick={handleSendMessage}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Chat_Component
