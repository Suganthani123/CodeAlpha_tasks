import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/solid';

const Chat = ({ socket, roomId, username }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    socket.on('chat-message', (msg) => setMessages(prev => [...prev, msg]));
    return () => socket.off('chat-message');
  }, [socket]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = () => {
    if (input.trim()) {
      socket.emit('chat-message', { roomId, message: input, username });
      setInput('');
    }
  };

  const sendFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // File chunking via data channel (simplified – full implementation in MeetingRoom)
    alert('File sharing will be implemented in the meeting room using WebRTC data channel.');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-md">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.username === username ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2 rounded-2xl ${msg.username === username ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
              <div className="text-xs font-bold">{msg.username}</div>
              <div>{msg.message}</div>
              <div className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-2 flex gap-2">
        <input type="file" ref={fileInputRef} className="hidden" onChange={sendFile} />
        <button onClick={() => fileInputRef.current.click()} className="p-2 hover:bg-gray-100 rounded-full">
          <PaperClipIcon className="w-5 h-5 text-gray-500" />
        </button>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type a message..." />
        <button onClick={sendMessage} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600">
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
export default Chat;