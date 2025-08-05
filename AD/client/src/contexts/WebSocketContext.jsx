import React, { createContext, useContext, useEffect, useState } from 'react';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [messageHandlers, setMessageHandlers] = useState(new Map());

  useEffect(() => {
    const connect = () => {
      const wsUrl = `ws://${window.location.hostname}:3001`;
      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        setWs(websocket);
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        setWs(null);
        
        // Attempt to reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const handleMessage = (message) => {
    const { type, data } = message;
    
    // Call all registered handlers for this message type
    const handlers = messageHandlers.get(type) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in message handler for ${type}:`, error);
      }
    });
  };

  const subscribe = (messageType, handler) => {
    const handlers = messageHandlers.get(messageType) || [];
    handlers.push(handler);
    setMessageHandlers(new Map(messageHandlers.set(messageType, handlers)));

    // Return unsubscribe function
    return () => {
      const currentHandlers = messageHandlers.get(messageType) || [];
      const filteredHandlers = currentHandlers.filter(h => h !== handler);
      setMessageHandlers(new Map(messageHandlers.set(messageType, filteredHandlers)));
    };
  };

  const sendMessage = (type, payload) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
      return true;
    } else {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }
  };

  const value = {
    ws,
    connectionStatus,
    subscribe,
    sendMessage,
    isConnected: connectionStatus === 'connected'
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};