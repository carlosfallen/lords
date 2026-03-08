// ============================================================
// useWebSocket — Real-time WebSocket Hook
// ============================================================
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

type WSHandler = (data: any) => void;

export function useWebSocket() {
    const { accessToken, isAuthenticated } = useAuthStore();
    const wsRef = useRef<WebSocket | null>(null);
    const handlersRef = useRef<Map<string, Set<WSHandler>>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

    const connect = useCallback(() => {
        // This `connect` function is now primarily responsible for initiating the connection attempt
        // and handling reconnection logic. The actual WebSocket creation is in the useEffect.
        if (!isAuthenticated || !accessToken || wsRef.current?.readyState === WebSocket.OPEN) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const ws = new WebSocket(`${protocol}//${host}:4000/ws?token=${accessToken}`);

        ws.onopen = () => {
            setIsConnected(true);
            console.log('🔌 WebSocket connected');
        };

        ws.onmessage = (event) => {
            try {
                const { type, data } = JSON.parse(event.data);
                const handlers = handlersRef.current.get(type);
                if (handlers) handlers.forEach(h => h(data));
            } catch (e) {
                console.error('WS parse error:', e);
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
            console.log('🔌 WebSocket disconnected, reconnecting in 3s...');
            reconnectTimer.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => ws.close();
        wsRef.current = ws;
    }, [accessToken]);

    useEffect(() => {
        connect();
        return () => {
            clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [connect]);

    const on = useCallback((event: string, handler: WSHandler) => {
        if (!handlersRef.current.has(event)) handlersRef.current.set(event, new Set());
        handlersRef.current.get(event)!.add(handler);
        return () => { handlersRef.current.get(event)?.delete(handler); };
    }, []);

    const send = useCallback((type: string, data: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type, data }));
        }
    }, []);

    return { isConnected, on, send };
}
