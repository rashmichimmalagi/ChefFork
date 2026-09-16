import React, { useEffect, useState, useRef } from 'react';
import { X, Users, UserPlus, UserCheck, UserMinus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { User, FollowerChef } from '../types';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Avatar } from './Avatar';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileUser: User | null;
  initialTab?: 'followers' | 'following';
  initialFollowersCount?: number;
  initialFollowingCount?: number;
  onOpenProfile: (userId: string) => void;
  onFollowersCountChange?: (newCount: number) => void;
  onFollowingCountChange?: (newCount: number) => void;
}

export const FollowersModal: React.FC<FollowersModalProps> = ({
  isOpen,
  onClose,
  profileUser,
  initialTab = 'followers',
  initialFollowersCount,
  initialFollowingCount,
  onOpenProfile,
  onFollowersCountChange,
  onFollowingCountChange,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [currentList, setCurrentList] = useState<FollowerChef[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const [followersCount, setFollowersCount] = useState<number | null>(
    typeof initialFollowersCount === 'number' ? initialFollowersCount : null
  );
  const [followingCount, setFollowingCount] = useState<number | null>(
    typeof initialFollowingCount === 'number' ? initialFollowingCount : null
  );

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Keep callback refs stable to prevent parent re-renders from causing effect loops
  const onFollowersCountChangeRef = useRef(onFollowersCountChange);
  onFollowersCountChangeRef.current = onFollowersCountChange;

  const onFollowingCountChangeRef = useRef(onFollowingCountChange);
  onFollowingCountChangeRef.current = onFollowingCountChange;

  const prevIsOpenRef = useRef(false);

  // When modal opens, sync activeTab to initialTab and reset counts if provided
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setActiveTab(initialTab);
      setCurrentList([]);
      setErrorMessage(null);
      if (typeof initialFollowersCount === 'number') {
        setFollowersCount(initialFollowersCount);
      }
      if (typeof initialFollowingCount === 'number') {
        setFollowingCount(initialFollowingCount);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialTab, initialFollowersCount, initialFollowingCount]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Main data fetching effect: strictly tied to target profile, activeTab, and viewer authentication
  useEffect(() => {
    if (!isOpen || !profileUser?.id) {
      setCurrentList([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    // Explicitly clear list when request starts to avoid stale list or flicker
    setCurrentList([]);
    setErrorMessage(null);

    const targetUserId = profileUser.id;
    const currentViewerId = currentUser?.id;

    const fetchUsers = async () => {
      try {
        if (activeTab === 'followers') {
          // Fetch users where follows.following_id = targetUserId
          const res = await api.getFollowers(targetUserId, currentViewerId);
          if (!isMounted) return;
          setCurrentList(res.users || []);
          setFollowersCount(res.totalCount);
          onFollowersCountChangeRef.current?.(res.totalCount);
        } else {
          // Fetch users where follows.follower_id = targetUserId
          const res = await api.getFollowedUsers(targetUserId, currentViewerId);
          if (!isMounted) return;
          setCurrentList(res.users || []);
          setFollowingCount(res.totalCount);
          onFollowingCountChangeRef.current?.(res.totalCount);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error(`Error loading ${activeTab} for user ${targetUserId}:`, err);
        const msg = err?.message || `Failed to load ${activeTab}. Please check your connection.`;
        setErrorMessage(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, [isOpen, profileUser?.id, activeTab, currentUser?.id, retryCount]);

  // Listen to external follow updates so modal stays reactive in real time
  useEffect(() => {
    const handleFollowUpdated = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      const { targetUserId, currentUserId: senderId, isFollowing, followersCount: newFollowersCount } = detail;

      // Update following state for target user in current list if viewer was the sender
      if (senderId === currentUser?.id) {
        setCurrentList((prev) =>
          prev.map((u) =>
            u.id === targetUserId
              ? {
                  ...u,
                  isFollowing,
                  followersCount: typeof newFollowersCount === 'number' ? newFollowersCount : u.followersCount,
                }
              : u
          )
        );
      }

      // If viewed profile's followers count changed
      if (profileUser?.id === targetUserId && typeof newFollowersCount === 'number') {
        setFollowersCount(newFollowersCount);
        onFollowersCountChangeRef.current?.(newFollowersCount);
      }
    };

    window.addEventListener('cheffork:follow-updated', handleFollowUpdated);
    return () => {
      window.removeEventListener('cheffork:follow-updated', handleFollowUpdated);
    };
  }, [currentUser?.id, profileUser?.id]);

  const handleTabChange = (newTab: 'followers' | 'following') => {
    if (newTab === activeTab && !errorMessage) return;
    setActiveTab(newTab);
    // Explicitly reset current list and error when user switches tabs
    setCurrentList([]);
    setErrorMessage(null);
    setIsLoading(true);
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setIsLoading(true);
    setCurrentList([]);
    setRetryCount((prev) => prev + 1);
  };

  const handleToggleFollow = async (chef: FollowerChef) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (chef.id === currentUser.id) return;

    setActionLoadingId(chef.id);
    try {
      const res = await api.toggleFollow(chef.id, currentUser);

      // Update local state in current list
      setCurrentList((prev) =>
        prev.map((u) =>
          u.id === chef.id
            ? {
                ...u,
                isFollowing: res.isFollowing,
                followersCount: res.followersCount,
              }
            : u
        )
      );

      // If the current profile being viewed is the current logged-in user's profile:
      if (profileUser?.id === currentUser.id) {
        const newFollowingCount = await api.getFollowingCount(currentUser.id);
        setFollowingCount(newFollowingCount);
        onFollowingCountChangeRef.current?.(newFollowingCount);
      }

      // If the chef followed/unfollowed was the profileUser being viewed
      if (chef.id === profileUser?.id) {
        setFollowersCount(res.followersCount);
        onFollowersCountChangeRef.current?.(res.followersCount);
      }

      showToast(res.isFollowing ? `Following Chef ${chef.name}` : `Unfollowed ${chef.name}`);
    } catch (err: any) {
      console.error('Failed to toggle follow in modal:', err);
      showToast(err.message || 'Follow action failed', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSelectChef = (chefId: string) => {
    onClose();
    onOpenProfile(chefId);
  };

  if (!isOpen || !profileUser) return null;

  return (
    <div
      id="followers-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="followers-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="followers-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="followers-modal-title"
              className="text-lg font-bold font-heading text-stone-900 dark:text-stone-100 truncate"
            >
              {profileUser.name}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
              @{profileUser.username}
            </p>
          </div>

          <button
            id="followers-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 p-1">
          <button
            type="button"
            id="modal-tab-followers"
            onClick={() => handleTabChange('followers')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'followers'
                ? 'bg-white dark:bg-stone-800 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <span>Followers</span>
            <span
              id="modal-followers-count-badge"
              className="px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 dark:bg-stone-700/60 text-stone-600 dark:text-stone-300"
            >
              {followersCount !== null
                ? followersCount
                : typeof initialFollowersCount === 'number'
                ? initialFollowersCount
                : 0}
            </span>
          </button>

          <button
            type="button"
            id="modal-tab-following"
            onClick={() => handleTabChange('following')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'following'
                ? 'bg-white dark:bg-stone-800 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <span>Following</span>
            <span
              id="modal-following-count-badge"
              className="px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 dark:bg-stone-700/60 text-stone-600 dark:text-stone-300"
            >
              {followingCount !== null
                ? followingCount
                : typeof initialFollowingCount === 'number'
                ? initialFollowingCount
                : 0}
            </span>
          </button>
        </div>

        {/* List Content Container with fixed min-height to prevent jumping */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 divide-y divide-stone-100 dark:divide-stone-800/80 min-h-[360px]">
          {isLoading ? (
            /* Loading Skeleton Rows */
            <div id="followers-modal-loading" className="space-y-3 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-2 rounded-xl animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-stone-200 dark:bg-stone-800 shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-28 bg-stone-200 dark:bg-stone-800 rounded-sm" />
                      <div className="h-2.5 w-16 bg-stone-200 dark:bg-stone-800 rounded-sm" />
                    </div>
                  </div>
                  <div className="h-8 w-20 bg-stone-200 dark:bg-stone-800 rounded-xl" />
                </div>
              ))}
            </div>
          ) : errorMessage ? (
            /* Error State with Retry Action */
            <div id="followers-modal-error" className="py-12 px-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-200 mb-1">
                Failed to load {activeTab}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto mb-4">
                {errorMessage}
              </p>
              <button
                id="modal-retry-btn"
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : currentList.length === 0 ? (
            /* Empty State */
            <div
              id={activeTab === 'followers' ? 'followers-empty-state' : 'following-empty-state'}
              className="py-12 px-4 text-center"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-stone-100 dark:bg-stone-800/80 flex items-center justify-center text-stone-400">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-200 mb-1">
                {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
                {activeTab === 'followers'
                  ? `${profileUser.name} doesn't have any followers yet.`
                  : `${profileUser.name} isn't following any chefs yet.`}
              </p>
            </div>
          ) : (
            /* Populated Chef List */
            currentList.map((chef) => {
              const isSelf = currentUser?.id === chef.id;
              const isActionLoading = actionLoadingId === chef.id;

              return (
                <div
                  key={chef.id}
                  id={`modal-chef-${chef.id}`}
                  className="pt-2.5 first:pt-0 flex items-center justify-between gap-3"
                >
                  {/* Clickable Profile Info with Real User UUID */}
                  <div
                    onClick={() => handleSelectChef(chef.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group py-1"
                  >
                    <Avatar
                      src={chef.avatar}
                      name={chef.name}
                      sizeClassName="w-11 h-11 text-sm shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                          {chef.name}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                        @{chef.username}
                      </p>
                      {chef.bio ? (
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                          {chef.bio}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Follow / Following Action Button */}
                  <div className="shrink-0">
                    {isSelf ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                        You
                      </span>
                    ) : (
                      <button
                        type="button"
                        id={`modal-follow-btn-${chef.id}`}
                        disabled={isActionLoading}
                        onClick={() => handleToggleFollow(chef)}
                        aria-label={chef.isFollowing ? `Unfollow ${chef.name}` : `Follow ${chef.name}`}
                        className={`group relative inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          chef.isFollowing
                            ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border border-stone-300 dark:border-stone-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 dark:hover:border-rose-900'
                            : 'bg-orange-600 hover:bg-orange-500 text-white shadow-xs shadow-orange-600/20'
                        } disabled:opacity-50`}
                      >
                        {isActionLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
                            <span>...</span>
                          </>
                        ) : chef.isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 group-hover:hidden" />
                            <UserMinus className="w-3.5 h-3.5 text-rose-500 hidden group-hover:inline" />
                            <span className="group-hover:hidden">Following</span>
                            <span className="hidden group-hover:inline">Unfollow</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
