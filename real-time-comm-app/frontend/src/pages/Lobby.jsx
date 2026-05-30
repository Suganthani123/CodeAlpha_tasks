import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Lobby = ({ token, user }) => {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const createRoom = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/rooms/create');
      navigate(`/meeting/${res.data.roomId}`);
    } catch (err) {
      alert('Create room failed');
    }
  };

  const joinRoom = async () => {
    if (!roomId) return;
    try {
      await axios.post(`http://localhost:5000/api/rooms/join/${roomId}`);
      navigate(`/meeting/${roomId}`);
    } catch (err) {
      alert('Room not found');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
      <div className="bg-white p-10 rounded-2xl shadow-2xl text-center">
        <h1 className="text-4xl font-bold mb-2">Welcome, {user.username}</h1>
        <p className="text-gray-600 mb-8">Start or join a video call</p>
        <button onClick={createRoom} className="bg-green-500 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-green-600 transition shadow-md mb-6 w-full">➕ Create New Room</button>
        <div className="flex gap-2">
          <input type="text" placeholder="Enter Room ID" className="flex-1 p-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500" value={roomId} onChange={e => setRoomId(e.target.value)} />
          <button onClick={joinRoom} className="bg-purple-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-purple-600 transition">Join</button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;