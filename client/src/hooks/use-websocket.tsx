import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

type WebSocketContextType = {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  lastMessage: any;
  subscribeToEntity: (entityType: string, entityId: number) => void;
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

type WebSocketProviderProps = {
  children: ReactNode;
};

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  
  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        setSocket(null);
      }, 5000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('WebSocket message received:', message);
      
      // Handle connection message with clientId
      if (message.type === 'connection' && message.status === 'connected') {
        setClientId(message.clientId);
      } else {
        setLastMessage(message);
      }
    };
    
    setSocket(ws);
    
    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);
  
  // Send message over WebSocket
  const sendMessage = useCallback((message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      // Add client ID if we have one
      if (clientId) {
        message.clientId = clientId;
      }
      
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }, [socket, clientId]);
  
  // Subscribe to entity updates
  const subscribeToEntity = useCallback((entityType: string, entityId: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'subscribe',
        entity_type: entityType,
        entity_id: entityId
      });
    }
  }, [socket, sendMessage]);
  
  const value = {
    isConnected,
    sendMessage,
    lastMessage,
    subscribeToEntity
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
}