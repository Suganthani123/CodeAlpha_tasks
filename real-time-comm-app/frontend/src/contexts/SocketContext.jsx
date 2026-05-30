import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, token, username, userId }) => {
  const [socket, setSocket] = useState(null);
  useEffect(() => {
    const s = io('http://localhost:5000', { auth: { token } });
    setSocket(s);
    return () => s.close();
  }, [token]);
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};