import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm animate-pulse z-40 sticky top-0">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Mode Offline — Data tersimpan lokal di perangkat.</span>
    </div>
  );
};
