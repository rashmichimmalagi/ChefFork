import React, { useEffect, useState, useCallback } from 'react';
import { Users, UserCheck, UserMinus, Loader2, ArrowRight, ChefHat, Sparkles } from 'lucide-react';
import { User } from '../types';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { BackButton } from '../components/BackButton';

interface FollowedChef extends User {
  recipesCount?: number;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

interface FollowingPageProps {
  onOpenProfile: (userId: string) => void;
  onExplore: () => void;
  onBack?: () => void;
}

export const FollowingPage: React.FC<FollowingPageProps> = ({
  onOpenProfile,
  onExplore,
  onBack,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [followedUsers, setFollowedUsers] = useState<FollowedChef[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);

  const fetchFollowed = useCallback(async () => {
    if (!currentUser?.id) {
      setFollowedUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.getFollowedUsers(currentUser.id);
      setFollowedUsers(res.users || []);
    } catch (err: any) {
      console.error('Error fetching followed chefs:', err);
      showToast(err.message || 'Failed to load followed chefs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, showToast]);

  // Load followed users on mount and whenever current authenticated user changes
  useEffect(() => {
    // Reset immediately whenever user changes or logs out to prevent stale state
    setFollowedUsers([]);
    fetchFollowed();
  }, [fetchFollowed]);

  const handleUnfollow = async (targetUser: FollowedChef) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    setUnfollowingId(targetUser.id);
    try {
      // Execute REAL InsForge database deletion in follows table
      await api.unfollowUser(targetUser.id);

      // Only remove from UI after successful database deletion
      setFollowedUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      showToast(`Unfollowed ${targetUser.name || targetUser.username}`, 'info');
    } catch (err: any) {
      console.error('Failed to unfollow chef in InsForge database:', err);
      // DO NOT remove from list if database deletion failed
      showToast(err.message || 'Failed to unfollow chef. Please try again.', 'error');
    } finally {
      setUnfollowingId(null);
    }
  };

  if (!currentUser) {
    return (
      <div id="following-page" className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-28">
        {onBack && (
          <div className="mb-6">
            <BackButton id="following-back-btn" onClick={onBack} label="Back" />
          </div>
        )}

        <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-heading text-stone-900 dark:text-stone-100 mb-2">
            See Chefs You Follow
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
            Log in to view and manage the creators and culinary masters you are currently following.
          </p>
          <button
            id="following-login-btn"
            type="button"
            onClick={() => openAuthModal('login')}
            className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer"
          >
            Log In to ChefFork
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="following-page" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {/* Top Bar with Back Navigation */}
      {onBack && (
        <div className="mb-4">
          <BackButton id="following-back-btn" onClick={onBack} label="Back to Feed" />
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-heading tracking-tight text-stone-900 dark:text-stone-100">
                Following
              </h1>
              {!isLoading && (
                <span
                  id="following-count-badge"
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-900/60"
                >
                  {followedUsers.length} {followedUsers.length === 1 ? 'chef' : 'chefs'}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              Chefs and culinary creators you actively follow in the ChefFork community.
            </p>
          </div>
        </div>

        <button
          id="following-explore-more-btn"
          type="button"
          onClick={onExplore}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
          <span>Discover More Chefs</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-stone-200 dark:bg-stone-800" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-stone-200 dark:bg-stone-800 rounded-md" />
                  <div className="h-3 w-20 bg-stone-200 dark:bg-stone-800 rounded-md" />
                </div>
              </div>
              <div className="h-9 w-24 bg-stone-200 dark:bg-stone-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : followedUsers.length === 0 ? (
        /* Empty State */
        <div
          id="following-empty-state"
          className="text-center py-16 px-6 rounded-3xl bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-800 shadow-xs"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-stone-100 dark:bg-stone-800/60 flex items-center justify-center text-stone-400 dark:text-stone-500">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold font-heading text-stone-900 dark:text-stone-100 mb-1">
            No chefs followed yet
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
            Follow chefs to see their recipes, forks, and kitchen updates here.
          </p>
          <button
            id="empty-following-explore-btn"
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer"
          >
            <span>Explore Chefs & Recipes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Populated List of Followed Chefs */
        <div id="following-list" className="space-y-3">
          {followedUsers.map((user) => {
            const isBeingUnfollowed = unfollowingId === user.id;

            return (
              <article
                key={user.id}
                id={`followed-chef-${user.id}`}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-orange-800/60 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* User Info (Clickable to open profile) */}
                <div
                  onClick={() => onOpenProfile(user.id)}
                  className="flex items-start sm:items-center gap-3.5 cursor-pointer group flex-1 min-w-0"
                >
                  <Avatar
                    src={user.avatar}
                    name={user.name}
                    sizeClassName="w-13 h-13 text-base shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                        {user.name}
                      </h3>
                      {user.username && (
                        <span className="text-xs text-stone-400 dark:text-stone-500">
                          @{user.username}
                        </span>
                      )}
                    </div>

                    {user.bio ? (
                      <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 line-clamp-2 leading-relaxed">
                        {user.bio}
                      </p>
                    ) : null}

                    <div className="flex items-center gap-3 mt-2 text-[11px] font-medium text-stone-400 dark:text-stone-500">
                      <span>{user.recipesCount ?? 0} recipes</span>
                      <span>•</span>
                      <span>{user.followersCount ?? 0} followers</span>
                    </div>
                  </div>
                </div>

                {/* Following / Unfollow Button */}
                <div className="flex items-center justify-end sm:justify-start shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                  <button
                    id={`unfollow-btn-${user.id}`}
                    type="button"
                    disabled={isBeingUnfollowed}
                    onClick={() => handleUnfollow(user)}
                    aria-label={`Unfollow ${user.name}`}
                    className="group relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 dark:hover:border-rose-900 disabled:opacity-50"
                  >
                    {isBeingUnfollowed ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-stone-500" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-600 group-hover:hidden" />
                        <UserMinus className="w-4 h-4 text-rose-500 hidden group-hover:inline" />
                        <span className="group-hover:hidden">Following</span>
                        <span className="hidden group-hover:inline">Unfollow</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
