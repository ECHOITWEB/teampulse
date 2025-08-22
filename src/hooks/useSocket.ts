import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const useSocket = (token?: string | null) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    // Connect to socket server
    const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001', {
      auth: {
        token
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return socketRef.current;
};

export default useSocket;