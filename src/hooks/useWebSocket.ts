import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useSheetsStore } from '../store';
import { useAuthStore } from '../store';

const WS_URL = (import.meta.env.VITE_API_URL || '') + '/ws';

/**
 * WebSocket hook for real-time dashboard updates.
 * Only connects when a user is authenticated.
 * Resilient to connection failures — will silently retry.
 */
export function useWebSocket() {
  const clientRef = useRef<Client | null>(null);
  const { fetchSheets } = useSheetsStore();
  const { user } = useAuthStore();

  const connect = useCallback(() => {
    if (clientRef.current?.connected) return;
    if (!user) return;

    try {
      const client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        onConnect: () => {
          console.log('🔌 WebSocket connected');

          client.subscribe('/topic/sheets', (message) => {
            try {
              const event = JSON.parse(message.body);
              console.log('📡 Sheet event:', event.type, event.sheetId);
              fetchSheets();
            } catch (e) {
              console.warn('Failed to parse WS message', e);
            }
          });
        },

        onDisconnect: () => {
          console.log('🔌 WebSocket disconnected');
        },

        onStompError: (frame) => {
          console.warn('WebSocket STOMP error:', frame.headers?.message);
        },

        onWebSocketError: () => {
          // Silently handle — will auto-reconnect
        },
      });

      client.activate();
      clientRef.current = client;
    } catch (e) {
      console.warn('WebSocket connection failed, will retry:', e);
    }
  }, [fetchSheets, user]);

  const disconnect = useCallback(() => {
    try {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    } catch {
      // Ignore disconnect errors
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connect, disconnect };
}
