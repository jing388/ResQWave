import { Button } from '@/components/ui/button';
import { useSocket } from '@/contexts/SocketContext';

export function TestWebSocketButton() {
  const { socket, isConnected } = useSocket();

  const handleTestAlert = () => {
    if (!socket || !isConnected) {
      alert('Socket not connected!');
      return;
    }

    const testPayload = {
      terminalId: 'RESQWAVE005', // Use a valid terminal ID from your database
      alertType: 'Critical', // 'Critical' | 'User-Initiated' | null (for no alert)
      terminalStatus: 'Online', // Terminal status (Online/Offline)
      sentThrough: "Sensor" // Sensor or Button
    };

    console.log('[TEST] Sending test alert:', testPayload);

    socket.emit('alert:simulate', testPayload, (ack: { ok?: boolean; alertId?: string; error?: string }) => {
      console.log('[TEST] Server response:', ack);
      if (ack?.ok) {
        alert(`Test alert sent! Alert ID: ${ack.alertId}`);
      } else {
        alert(`Error: ${ack?.error || 'Unknown error'}`);
      }
    });
  };

  return (
    <Button
      onClick={handleTestAlert}
      disabled={!isConnected}
      variant={isConnected ? 'default' : 'secondary'}

    >
      {isConnected ? '🚨 Send Test Alert' : '⚠️ Socket Disconnected'}
    </Button>
  );
}
