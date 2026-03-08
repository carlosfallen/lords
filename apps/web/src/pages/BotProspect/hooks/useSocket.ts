import { useEffect } from 'react';
import { getSocket } from '../services/socket';

export function useSocket(
  event: string,
  handler: (data: any) => void,
  deps: unknown[] = []
): void {
  useEffect(() => {
    const socket = getSocket();
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}
