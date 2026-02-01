import { useSocket } from '@/contexts/SocketContext';

export function TestWebSocketButton() {
  const { isConnected } = useSocket();

  return (
    <div
      style={{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: isConnected ? '#22c55e' : '#9ca3af',
        boxShadow: isConnected ? '0 0 12px rgba(34, 197, 94, 0.6)' : 'none',
      }}
    />
  );
}
