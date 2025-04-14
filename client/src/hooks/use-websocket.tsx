import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useToast } from './use-toast';

type WebSocketContextType = {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  lastMessage: any;
  subscribeToEntity: (entityType: string, entityId: number) => void;
};

type WebSocketProviderProps = {
  children: ReactNode;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedEntities = useRef<Set<string>>(new Set());
  
  // Connect to WebSocket server
  const connectWebSocket = useCallback(() => {
    try {
      // Determine the correct protocol (ws or wss) based on the current page protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('Connecting to WebSocket server at:', wsUrl);
      
      const newSocket = new WebSocket(wsUrl);
      
      newSocket.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        
        // Re-subscribe to all previously subscribed entities
        subscribedEntities.current.forEach(channelKey => {
          const [entityType, entityId] = channelKey.split('_');
          sendSubscription(newSocket, entityType, parseInt(entityId));
        });
        
        // Clear any reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      newSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          setLastMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      newSocket.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        setSocket(null);
        
        // Setup reconnect with exponential backoff
        if (!reconnectTimeoutRef.current) {
          const backoffDelay = 3000; // 3 seconds
          console.log(`Attempting to reconnect in ${backoffDelay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, backoffDelay);
        }
      };
      
      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: 'Connection Error',
          description: 'Could not connect to the real-time updates service. Some features may not work properly.',
          variant: 'destructive',
        });
      };
      
      setSocket(newSocket);
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
    }
  }, [toast]);
  
  // Send subscription message for a specific entity
  const sendSubscription = (ws: WebSocket, entityType: string, entityId: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'subscribe',
        entity_type: entityType,
        entity_id: entityId
      }));
    }
  };
  
  // Subscribe to entity updates
  const subscribeToEntity = useCallback((entityType: string, entityId: number) => {
    const channelKey = `${entityType}_${entityId}`;
    
    // Add to our tracking set
    subscribedEntities.current.add(channelKey);
    
    // If connected, send the subscription message
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendSubscription(socket, entityType, entityId);
    }
  }, [socket]);
  
  // Send a message through the WebSocket
  const sendMessage = useCallback((message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message, WebSocket is not connected');
    }
  }, [socket]);
  
  // Connect on component mount
  useEffect(() => {
    connectWebSocket();
    
    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);
  
  return (
    <WebSocketContext.Provider value={{ isConnected, sendMessage, lastMessage, subscribeToEntity }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
}