import { Music, ListMusic, Sliders, HardDriveDownload, Settings } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  playlistCount: number;
}

export function BottomNav({ activeTab, onSelectTab, playlistCount }: BottomNavProps) {
  const navItems = [
    { id: 'tracks' as ActiveTab, label: 'Lagu', icon: Music },
    {
      id: 'playlists' as ActiveTab,
      label: 'PlayLish',
      icon: ListMusic,
      badge: playlistCount > 0 ? playlistCount : undefined,
    },
    { id: 'equalizer' as ActiveTab, label: 'Equalizer', icon: Sliders },
    { id: 'offline' as ActiveTab, label: 'Offline', icon: HardDriveDownload },
    { id: 'settings' as ActiveTab, label: 'Setelan', icon: Settings },
  ];

  return (
    <nav
      id="android-bottom-nav"
      className="w-full bg-[#0A0A0A]/90 backdrop-blur-2xl border-t border-white/10 px-3 py-2 flex items-center justify-around z-40"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            id={`nav-btn-${item.id}`}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 cursor-pointer relative ${
              isActive
                ? 'text-[#F27D26] font-semibold'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            {/* Active Glow Pill */}
            {isActive && (
              <div className="absolute -top-1 w-8 h-0.5 bg-[#F27D26] rounded-full shadow-[0_0_10px_#F27D26]" />
            )}

            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110' : 'scale-100'
                }`}
              />
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 bg-[#F27D26] text-black font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
