import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from './Toast';
import { ActivePage } from '../types';
import { api } from '../api';
import {
  UtensilsCrossed,
  Compass,
  PlusCircle,
  Bell,
  User,
  LogOut,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  Users,
  Bookmark
} from 'lucide-react';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onOpenCreate: () => void;
  onSearch?: (query: string) => void;
  onOpenCommunity?: () => void;
  onLogout?: () => void | Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  onOpenCreate,
  onSearch,
  onOpenCommunity,
  onLogout,
}) => {
  const { currentUser, logout, openAuthModal } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const handleLogoutClick = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    if (onLogout) {
      await onLogout();
    } else {
      try {
        await logout();
        onNavigate('landing');
        showToast('Logged out successfully');
      } catch (err: any) {
        showToast(err?.message || 'Failed to log out', 'error');
      }
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    const fetchNotifs = async () => {
      try {
        const data = await api.getNotifications();
        const unread = data.notifications?.filter(n => !n.read).length || 0;
        setUnreadCount(unread);
      } catch {
        // silent fail
      }
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 25000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      onNavigate('explore');
    }
    setMobileMenuOpen(false);
  };

  const handleCommunityClick = () => {
    if (onOpenCommunity) {
      onOpenCommunity();
    } else {
      onNavigate('explore');
    }
    setMobileMenuOpen(false);
  };

  const isHomeActive = activePage === 'landing' || activePage === 'feed';
  const isExploreActive = activePage === 'explore';
  const isCreateActive = activePage === 'create';
  const isFollowingActive = activePage === 'following';

  return (
    <header className="sticky top-0 z-40 bg-[#fdfbf7]/90 dark:bg-[#121315]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 lg:gap-6">
        
        {/* Left: Brand Logo */}
        <div
          id="cheffork-brand-logo"
          onClick={() => {
            onNavigate(currentUser ? 'feed' : 'landing');
            setMobileMenuOpen(false);
          }}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-xl tracking-tight text-stone-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">
              Chef<span className="text-orange-600 dark:text-orange-500">Fork</span>
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <button
            id="nav-home-btn"
            onClick={() => onNavigate(currentUser ? 'feed' : 'landing')}
            className={`relative px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              isHomeActive
                ? 'text-orange-600 dark:text-orange-400 font-bold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/60'
            }`}
          >
            <span>Home</span>
            {isHomeActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-orange-600 dark:bg-orange-500 rounded-full" />
            )}
          </button>

          <button
            id="nav-explore-btn"
            onClick={() => onNavigate('explore')}
            className={`relative px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isExploreActive
                ? 'text-orange-600 dark:text-orange-400 font-bold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/60'
            }`}
          >
            <span>Explore</span>
            {isExploreActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-orange-600 dark:bg-orange-500 rounded-full" />
            )}
          </button>

          {currentUser && (
            <button
              id="nav-following-btn"
              onClick={() => onNavigate('following')}
              className={`relative px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                isFollowingActive
                  ? 'text-orange-600 dark:text-orange-400 font-bold'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Following</span>
              {isFollowingActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-orange-600 dark:bg-orange-500 rounded-full" />
              )}
            </button>
          )}

          <button
            id="nav-create-btn"
            onClick={onOpenCreate}
            className={`relative px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isCreateActive
                ? 'text-orange-600 dark:text-orange-400 font-bold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/60'
            }`}
          >
            <span>Create</span>
            {isCreateActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-orange-600 dark:bg-orange-500 rounded-full" />
            )}
          </button>

          <button
            id="nav-community-btn"
            onClick={handleCommunityClick}
            className="relative px-3 py-1.5 rounded-lg text-sm font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-all flex items-center gap-1.5"
          >
            <span>Community</span>
          </button>
        </nav>

        {/* Center: Search Bar */}
        <form
          id="nav-search-form"
          onSubmit={handleSearchSubmit}
          className="hidden sm:flex flex-1 max-w-xs md:max-w-sm lg:max-w-md items-center relative"
        >
          <Search className="w-4 h-4 absolute left-3.5 text-stone-400 dark:text-stone-500 pointer-events-none" />
          <input
            id="nav-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes, chefs, or tags..."
            className="w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-full bg-stone-100/90 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700/60 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-stone-800 transition-all"
          />
        </form>

        {/* Right Actions: Theme Toggle & Auth Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Light/Dark Theme Toggle */}
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus:outline-hidden focus:ring-2 focus:ring-orange-500"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-stone-600" />
            )}
          </button>

          {currentUser ? (
            <>
              {/* Logged in CTA */}
              <button
                id="nav-alerts-btn"
                onClick={() => onNavigate('notifications')}
                aria-label="Notifications"
                className={`relative p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
                  activePage === 'notifications' ? 'text-orange-600 dark:text-orange-400' : ''
                }`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-600 rounded-full ring-2 ring-white dark:ring-stone-900" />
                )}
              </button>

              <div className="relative">
                <button
                  id="nav-user-menu-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-label="User menu"
                  className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-orange-400 transition-all"
                >
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-9 h-9 rounded-full object-cover border border-stone-200 dark:border-stone-700"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-bold flex items-center justify-center text-xs border border-orange-200 dark:border-orange-800">
                      {currentUser.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </button>

                {userDropdownOpen && (
                  <div
                    id="nav-user-dropdown"
                    onClick={() => setUserDropdownOpen(false)}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 py-2 z-50 animate-fade-in"
                  >
                    <div className="px-4 py-2 border-b border-stone-100 dark:border-stone-800">
                      <div className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                        {currentUser.name}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                        @{currentUser.username}
                      </div>
                    </div>

                    <button
                      id="nav-dropdown-profile-btn"
                      onClick={() => onNavigate('profile')}
                      className="w-full px-4 py-2.5 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5"
                    >
                      <User className="w-4 h-4 text-stone-400" />
                      <span>My Kitchen & Forks</span>
                    </button>

                    <button
                      id="nav-dropdown-saved-btn"
                      onClick={() => onNavigate('saved')}
                      className="w-full px-4 py-2.5 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5"
                    >
                      <Bookmark className="w-4 h-4 text-amber-500" />
                      <span>Saved Recipes</span>
                    </button>

                    <button
                      id="nav-dropdown-following-btn"
                      onClick={() => onNavigate('following')}
                      className="w-full px-4 py-2.5 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5"
                    >
                      <Users className="w-4 h-4 text-stone-400" />
                      <span>Following</span>
                    </button>

                    <button
                      id="nav-dropdown-logout-btn"
                      onClick={handleLogoutClick}
                      className="w-full px-4 py-2.5 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="nav-login-btn"
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/80 transition-colors"
              >
                Log In
              </button>
              <button
                id="nav-signup-btn"
                type="button"
                onClick={() => openAuthModal('signup')}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-sm font-bold shadow-xs hover:shadow transition-all"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            id="mobile-menu-toggle-btn"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu-drawer"
          className="md:hidden bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-4 space-y-4"
        >
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes, chefs, or tags..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400"
            />
          </form>

          {/* Nav Links */}
          <div className="flex flex-col space-y-1">
            <button
              id="mobile-nav-home-btn"
              onClick={() => {
                onNavigate(currentUser ? 'feed' : 'landing');
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-2 rounded-lg text-left text-sm font-semibold ${
                isHomeActive
                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                  : 'text-stone-700 dark:text-stone-300'
              }`}
            >
              Home
            </button>

            <button
              id="mobile-nav-explore-btn"
              onClick={() => {
                onNavigate('explore');
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-2 rounded-lg text-left text-sm font-semibold ${
                isExploreActive
                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                  : 'text-stone-700 dark:text-stone-300'
              }`}
            >
              Explore
            </button>

            {currentUser && (
              <>
                <button
                  id="mobile-nav-following-btn"
                  onClick={() => {
                    onNavigate('following');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-left text-sm font-semibold flex items-center gap-2 ${
                    isFollowingActive
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Following</span>
                </button>

                <button
                  id="mobile-nav-saved-btn"
                  onClick={() => {
                    onNavigate('saved');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-left text-sm font-semibold flex items-center gap-2 ${
                    activePage === 'saved'
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Bookmark className="w-4 h-4 text-amber-500" />
                  <span>Saved Recipes</span>
                </button>

                <button
                  id="mobile-nav-logout-btn"
                  onClick={handleLogoutClick}
                  className="px-3 py-2 rounded-lg text-left text-sm font-semibold flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </>
            )}

            <button
              id="mobile-nav-create-btn"
              onClick={() => {
                onOpenCreate();
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-2 rounded-lg text-left text-sm font-semibold ${
                isCreateActive
                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                  : 'text-stone-700 dark:text-stone-300'
              }`}
            >
              Create
            </button>

            <button
              id="mobile-nav-community-btn"
              onClick={handleCommunityClick}
              className="px-3 py-2 rounded-lg text-left text-sm font-semibold text-stone-700 dark:text-stone-300"
            >
              Community
            </button>
          </div>

          {/* Theme switch row in mobile */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
            <span className="text-sm font-medium text-stone-600 dark:text-stone-400">Appearance</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-stone-600" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>

          {/* Guest Auth Buttons in Mobile Menu */}
          {!currentUser && (
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  openAuthModal('signup');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-orange-600 text-white font-bold text-sm shadow-xs"
              >
                Get Started
              </button>
              <button
                onClick={() => {
                  openAuthModal('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 font-semibold text-sm"
              >
                Log In
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
