import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import { useSheetsStore } from '../store';
import { useAuthStore } from '../store';

/**
 * Build the WebSocket URL from the API base URL.
 * Converts http(s):// to ws(s):// and points to the /ws-direct endpoint
 * which does NOT use SockJS, avoiding ngrok interstitial CORS issues.
 */
function buildWsUrl(): string {
  const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
  const wsBase = apiBase
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');
  return wsBase + '/ws-direct';
}

/**
 * WebSocket hook for real-time dashboard updates.
 * Uses native WebSocket (not SockJS) for lowest latency and ngrok compatibility.
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
      const brokerURL = buildWsUrl();
      console.log('?? Connecting WebSocket to:', brokerURL);

      const client = new Client({
        brokerURL,
        // No webSocketFactory needed — @stomp/stompjs uses native WebSocket
        // when brokerURL is provided, which is the fastest transport.
        reconnectDelay: 3000,       // Reconnect faster (was 5s)
        heartbeatIncoming: 8000,    // Detect dead connections faster (was 10s)
        heartbeatOutgoing: 8000,

        onConnect: () => {
          console.log('?? WebSocket connected (native WS)');

          client.subscribe('/topic/sheets', (message) => {
            try {
              const event = JSON.parse(message.body);
              console.log('?? Sheet event:', event.type, event.sheetId);
              fetchSheets();

              // Native notification for Electron desktop app
              const electronAPI = (window as any).electronAPI;
              if (electronAPI?.sendNotification) {
                const typeLabel = event.type === 'CREATED' ? 'New Sheet'
                  : event.type === 'UPDATED' ? 'Sheet Updated'
                  : event.type === 'DELETED' ? 'Sheet Deleted'
                  : event.type === 'SENT' ? 'Sheet Sent'
                  : 'Sheet Activity';
                electronAPI.sendNotification(
                  typeLabel,
                  event.title || event.sheetId || 'Action sheet activity detected'
                );
              }
            } catch (e) {
              console.warn('Failed to parse WS message', e);
            }
          });
        },

        onDisconnect: () => {
          console.log('?? WebSocket disconnected');
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
