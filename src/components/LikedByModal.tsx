import React, { useEffect, useState, useRef } from 'react';
import { X, Heart, UserPlus, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { FollowerChef } from '../types';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { Avatar } from './Avatar';

export interface LikedByModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string | null;
  recipeTitle?: string;
  onOpenProfile: (userId: string) => void;
  onLikeCountChange?: (recipeId: string, newCount: number) => void;
}

export const LikedByModal: React.FC<LikedByModalProps> = ({
  isOpen,
  onClose,
  recipeId,
  recipeTitle,
  onOpenProfile,
  onLikeCountChange,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<FollowerChef[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const onLikeCountChangeRef = useRef(onLikeCountChange);
  onLikeCountChangeRef.current = onLikeCountChange;

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

  // Primary data fetching effect tied strictly to recipeId and viewer auth state
  useEffect(() => {
    if (!isOpen || !recipeId) {
      setUsers([]);
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setUsers([]);
    setErrorMessage(null);

    const fetchLikes = async () => {
      try {
        const res = await api.getRecipeLikes(recipeId, currentUser?.id);
        if (!isMounted) return;
        setUsers(res.users || []);
        setTotalCount(res.totalCount);
        onLikeCountChangeRef.current?.(recipeId, res.totalCount);
      } catch (err: any) {
        if (!isMounted) return;
        console.error(`Error loading likes for recipe ${recipeId}:`, err);
        setErrorMessage(err?.message || 'Unable to load likes. Please try again.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchLikes();

    return () => {
      isMounted = false;
    };
  }, [isOpen, recipeId, currentUser?.id, retryCount]);

  // Real-time listener for like events
  useEffect(() => {
    const handleRecipeLiked = (e: any) => {
      const detail = e?.detail;
      if (!detail || detail.recipeId !== recipeId) return;

      // When the viewed recipe's likes change, refresh the list
      if (isOpen && recipeId) {
        api
          .getRecipeLikes(recipeId, currentUser?.id)
          .then((res) => {
            setUsers(res.users || []);
            setTotalCount(res.totalCount);
            onLikeCountChangeRef.current?.(recipeId, res.totalCount);
          })
          .catch(() => {
            // Background sync error non-fatal
          });
      }
    };

    window.addEventListener('cheffork:recipe-liked', handleRecipeLiked);
    return () => {
      window.removeEventListener('cheffork:recipe-liked', handleRecipeLiked);
    };
  }, [isOpen, recipeId, currentUser?.id]);

  // Real-time listener for follow/unfollow updates
  useEffect(() => {
    const handleFollowUpdated = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      const { targetUserId, currentUserId: senderId, isFollowing, followersCount } = detail;

      if (senderId === currentUser?.id) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === targetUserId
              ? {
                  ...u,
                  isFollowing,
                  followersCount: typeof followersCount === 'number' ? followersCount : u.followersCount,
                }
              : u
          )
        );
      }
    };

    window.addEventListener('cheffork:follow-updated', handleFollowUpdated);
    window.addEventListener('cheffork:follow-changed', handleFollowUpdated);
    return () => {
      window.removeEventListener('cheffork:follow-updated', handleFollowUpdated);
      window.removeEventListener('cheffork:follow-changed', handleFollowUpdated);
    };
  }, [currentUser?.id]);

  const handleRetry = () => {
    setErrorMessage(null);
    setIsLoading(true);
    setUsers([]);
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
      setUsers((prev) =>
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
      showToast(res.isFollowing ? `Following Chef ${chef.name}` : `Unfollowed ${chef.name}`);
    } catch (err: any) {
      console.error('Failed to toggle follow in liked-by modal:', err);
      showToast(err.message || 'Follow action failed', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSelectChef = (chefId: string) => {
    onClose();
    onOpenProfile(chefId);
  };

  if (!isOpen || !recipeId) return null;

  return (
    <div
      id="liked-by-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="liked-by-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="liked-by-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-500 shrink-0">
              <Heart className="w-4 h-4 fill-rose-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  id="liked-by-modal-title"
                  className="text-base sm:text-lg font-bold font-heading text-stone-900 dark:text-stone-100"
                >
                  Liked By
                </h3>
                {totalCount !== null && (
                  <span
                    id="liked-by-count-badge"
                    className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                  >
                    {totalCount}
                  </span>
                )}
              </div>
              {recipeTitle && (
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-[240px] sm:max-w-[280px]">
                  {recipeTitle}
                </p>
              )}
            </div>
          </div>

          <button
            id="liked-by-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User list container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 divide-y divide-stone-100 dark:divide-stone-800/80 min-h-[320px]">
          {isLoading ? (
            <div id="liked-by-modal-loading" className="space-y-3 py-2">
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
            <div id="liked-by-modal-error" className="py-12 px-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-200 mb-1">
                Unable to load likes.
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto mb-4">
                {errorMessage}
              </p>
              <button
                id="liked-by-retry-btn"
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : users.length === 0 ? (
            <div id="liked-by-empty-state" className="py-12 px-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-stone-100 dark:bg-stone-800/80 flex items-center justify-center text-stone-400">
                <Heart className="w-6 h-6" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-200 mb-1">
                No likes yet
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
                Be the first to like this recipe!
              </p>
            </div>
          ) : (
            users.map((chef) => {
              const isSelf = currentUser?.id === chef.id;
              const isActionLoading = actionLoadingId === chef.id;

              return (
                <div
                  key={chef.id}
                  id={`liked-by-user-${chef.id}`}
                  className="pt-2.5 first:pt-0 flex items-center justify-between gap-3"
                >
                  {/* Clickable Profile Info */}
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

                  {/* Follow / Following Button */}
                  <div className="shrink-0">
                    {isSelf ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                        You
                      </span>
                    ) : (
                      <button
                        id={`liked-by-follow-btn-${chef.id}`}
                        type="button"
                        disabled={isActionLoading}
                        onClick={() => handleToggleFollow(chef)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                          chef.isFollowing
                            ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 border border-stone-200 dark:border-stone-700'
                            : 'bg-orange-600 hover:bg-orange-500 text-white shadow-xs'
                        }`}
                      >
                        {isActionLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : chef.isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Following</span>
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
