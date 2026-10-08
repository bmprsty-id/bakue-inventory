import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Package, ClipboardList, Settings } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/products', label: 'Produk', icon: Package },
  { to: '/history', label: 'Riwayat', icon: ClipboardList },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const BottomNavigation: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-t border-[#ECE3D5] shadow-[0_-4px_20px_rgba(92,51,23,0.06)] pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[64px] min-h-[50px] py-1 px-2 rounded-2xl transition-all duration-150 active:scale-90 ${
                  isActive
                    ? 'text-[#5C3317] font-extrabold'
                    : 'text-[#8E7969] hover:text-[#5C3317] font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-xl transition-colors ${
                      isActive ? 'bg-[#F2E8DC] text-[#5C3317]' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5 transition-transform" />
                  </div>
                  <span className="text-[11px] mt-0.5 tracking-tight leading-tight">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
