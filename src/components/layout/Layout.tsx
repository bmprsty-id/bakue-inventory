import React from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNavigation } from './BottomNavigation';
import { OfflineIndicator } from '../common/OfflineIndicator';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#EBE4D8] flex justify-center">
      {/* Mobile container - optimized for 360px - 480px smartphones, neatly centered with gentle shadow on wider screens */}
      <div className="w-full max-w-md min-h-screen bg-[#FAF6F0] shadow-2xl sm:border-x sm:border-[#ECE4D8] flex flex-col relative pb-20 select-text">
        <OfflineIndicator />
        <main className="flex-1 flex flex-col">
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    </div>
  );
};
