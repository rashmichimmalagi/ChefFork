import React from 'react';
import { UtensilsCrossed, Compass, PlusCircle, Bell, User, Users } from 'lucide-react';
import { ActivePage } from '../types';
import { useAuth } from '../context/AuthContext';

interface MobileNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onOpenCreate: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activePage,
  onNavigate,
  onOpenCreate,
}) => {
  const { currentUser, openAuthModal } = useAuth();

  const handleAuthGuarded = (page: ActivePage) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    onNavigate(page);
  };

  return (
    <nav
      id="mobile-bottom-navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121315]/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-2 py-1.5 flex items-center justify-around shadow-lg"
    >
      <button
        type="button"
        id="mobile-nav-feed-btn"
        onClick={() => onNavigate(currentUser ? 'feed' : 'landing')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
          activePage === 'feed' || activePage === 'landing'
            ? 'text-orange-600 dark:text-orange-500 font-semibold'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
        }`}
      >
        <UtensilsCrossed className="w-5 h-5 mb-0.5" />
        <span>Feed</span>
      </button>

      <button
        type="button"
        id="mobile-nav-explore-btn"
        onClick={() => onNavigate('explore')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
          activePage === 'explore'
            ? 'text-orange-600 dark:text-orange-500 font-semibold'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
        }`}
      >
        <Compass className="w-5 h-5 mb-0.5" />
        <span>Explore</span>
      </button>

      <button
        type="button"
        id="mobile-nav-following-btn"
        onClick={() => handleAuthGuarded('following')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
          activePage === 'following'
            ? 'text-orange-600 dark:text-orange-500 font-semibold'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
        }`}
      >
        <Users className="w-5 h-5 mb-0.5" />
        <span>Following</span>
      </button>

      {/* Create Button */}
      <button
        type="button"
        id="mobile-nav-create-btn"
        onClick={() => {
          if (!currentUser) {
            openAuthModal('login');
          } else {
            onOpenCreate();
          }
        }}
        className="flex flex-col items-center justify-center -mt-4"
        aria-label="Create Recipe"
      >
        <div className="w-12 h-12 rounded-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-600/30 transition-transform active:scale-95">
          <PlusCircle className="w-6 h-6" />
        </div>
        <span className="text-[10px] mt-0.5 font-semibold text-orange-600 dark:text-orange-400">Cook</span>
      </button>

      <button
        type="button"
        id="mobile-nav-notifications-btn"
        onClick={() => handleAuthGuarded('notifications')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
          activePage === 'notifications'
            ? 'text-orange-600 dark:text-orange-500 font-semibold'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
        }`}
      >
        <Bell className="w-5 h-5 mb-0.5" />
        <span>Activity</span>
      </button>

      <button
        type="button"
        id="mobile-nav-profile-btn"
        onClick={() => handleAuthGuarded('profile')}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
          activePage === 'profile'
            ? 'text-orange-600 dark:text-orange-500 font-semibold'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
        }`}
      >
        <User className="w-5 h-5 mb-0.5" />
        <span>Profile</span>
      </button>
    </nav>
  );
};
