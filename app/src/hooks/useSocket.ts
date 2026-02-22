import { useSocketContext } from '../contexts/SocketContext';

// Re-export the context hook as useSocket for backward compatibility
export function useSocket() {
  return useSocketContext();
}
