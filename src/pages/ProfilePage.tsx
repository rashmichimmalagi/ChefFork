import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ChefHat, GitFork, UserPlus, UserCheck, Edit3, Calendar, PlusCircle, Heart, Clock, Check, Bookmark, Trash2 } from 'lucide-react';
import { User, UserStats, Recipe } from '../types';
import { api, isVideoUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { BackButton } from '../components/BackButton';
import { Avatar } from '../components/Avatar';
import { FollowersModal } from '../components/FollowersModal';

interface ProfilePageProps {
  userId: string | null;
  onOpenRecipe: (id: string) => void;
  onForkRecipe: (recipe: Recipe) => void;
  onOpenProfile: (userId: string) => void;
  onOpenCreate: () => void;
  onBack?: () => void;
  onOpenLikedBy?: (recipeId: string, recipeTitle?: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userId,
  onOpenRecipe,
  onForkRecipe,
  onOpenProfile,
  onOpenCreate,
  onBack,
  onOpenLikedBy,
}) => {
  const { currentUser, refreshUser, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const targetUserId = userId || currentUser?.id || '';
  const isOwnProfile = currentUser?.id === targetUserId;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'forks' | 'saved'>('all');
  const [removingSavedId, setRemovingSavedId] = useState<string | null>(null);

  // Followers & Following modal state
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers');

  // Edit Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!targetUserId) {
      setProfileUser(null);
      setStats(null);
      setUserRecipes([]);
      setSavedRecipes([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [res, recipesRes, savedRes] = await Promise.all([
        api.getUser(targetUserId),
        api.getRecipes({
          authorId: targetUserId,
          limit: 30,
        }),
        isOwnProfile ? api.getSavedRecipes() : Promise.resolve({ recipes: [], totalCount: 0 }),
      ]);

      setProfileUser(res.user);
      setStats(res.stats);
      setEditName(res.user.name || '');
      setEditBio(res.user.bio || '');
      setUserRecipes(recipesRes.recipes || []);
      if (isOwnProfile) {
        setSavedRecipes(savedRes.recipes || []);
      }
    } catch (err: any) {
      console.warn('Profile fetch error:', err);
      showToast(err.message || 'Could not load profile', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, isOwnProfile, showToast]);

  useEffect(() => {
    setShowFollowModal(false);
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const handleRecipeDeleted = (e: any) => {
      const deletedId = e?.detail?.recipeId;
      if (deletedId) {
        setUserRecipes((prev) => prev.filter((r) => r.id !== deletedId));
        setSavedRecipes((prev) => prev.filter((r) => r.id !== deletedId));
        setStats((prev) => (prev ? { ...prev, recipesCount: Math.max(0, prev.recipesCount - 1) } : null));
      }
    };
    const handleRecipeUpdated = (e: any) => {
      const updated = e?.detail?.recipe;
      if (updated?.id) {
        setUserRecipes((prev) =>
          prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
        );
        setSavedRecipes((prev) =>
          prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
        );
      }
    };
    const handleRecipeSaved = (e: any) => {
      const detail = e?.detail;
      if (!detail || !isOwnProfile) return;
      const { recipeId, isSaved } = detail;
      if (!isSaved) {
        setSavedRecipes((prev) => prev.filter((r) => r.id !== recipeId));
        setStats((prev) => (prev ? { ...prev, savedCount: Math.max(0, (prev.savedCount || 1) - 1) } : null));
      } else {
        api.getSavedRecipes().then((res) => {
          setSavedRecipes(res.recipes || []);
          setStats((prev) => (prev ? { ...prev, savedCount: res.totalCount } : null));
        }).catch(() => {});
      }
    };

    window.addEventListener('cheffork:recipe-deleted', handleRecipeDeleted);
    window.addEventListener('cheffork:recipe-updated', handleRecipeUpdated);
    window.addEventListener('cheffork:recipe-saved', handleRecipeSaved);

    const handleRecipeLiked = (e: any) => {
      const detail = e?.detail;
      if (!detail?.recipeId) return;
      setUserRecipes((prev) =>
        prev.map((r) =>
          r.id === detail.recipeId
            ? {
                ...r,
                likeCount: typeof detail.likeCount === 'number' ? detail.likeCount : r.likeCount,
                hasLiked: detail.userId === currentUser?.id ? detail.isLiked : r.hasLiked,
              }
            : r
        )
      );
      setSavedRecipes((prev) =>
        prev.map((r) =>
          r.id === detail.recipeId
            ? {
                ...r,
                likeCount: typeof detail.likeCount === 'number' ? detail.likeCount : r.likeCount,
                hasLiked: detail.userId === currentUser?.id ? detail.isLiked : r.hasLiked,
              }
            : r
        )
      );
    };
    window.addEventListener('cheffork:recipe-liked', handleRecipeLiked);

    const handleFollowUpdated = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      if (detail.targetUserId === targetUserId) {
        setStats((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: detail.currentUserId === currentUser?.id ? detail.isFollowing : prev.isFollowing,
                followersCount: typeof detail.followersCount === 'number' ? detail.followersCount : prev.followersCount,
              }
            : null
        );
      }
      if (detail.currentUserId === targetUserId) {
        api.getUser(targetUserId).then((res) => {
          setStats(res.stats);
        }).catch(() => {});
      }
    };
    window.addEventListener('cheffork:follow-updated', handleFollowUpdated);

    return () => {
      window.removeEventListener('cheffork:recipe-deleted', handleRecipeDeleted);
      window.removeEventListener('cheffork:recipe-updated', handleRecipeUpdated);
      window.removeEventListener('cheffork:recipe-saved', handleRecipeSaved);
      window.removeEventListener('cheffork:recipe-liked', handleRecipeLiked);
      window.removeEventListener('cheffork:follow-updated', handleFollowUpdated);
    };
  }, [isOwnProfile, targetUserId, currentUser?.id]);

  // Reset follow modal when viewed profile changes
  useEffect(() => {
    setShowFollowModal(false);
  }, [targetUserId]);

  const handleUnsave = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    setRemovingSavedId(recipeId);
    try {
      await api.unsaveRecipe(recipeId);
      setSavedRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      setStats((prev) => (prev ? { ...prev, savedCount: Math.max(0, (prev.savedCount || 1) - 1) } : null));
      showToast('Removed from saved recipes');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove saved recipe', 'error');
    } finally {
      setRemovingSavedId(null);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (!targetUserId || targetUserId === currentUser.id) return;

    try {
      const res = await api.toggleFollow(targetUserId, currentUser);
      setStats((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: res.isFollowing,
              followersCount: res.followersCount,
            }
          : prev
      );
      showToast(res.isFollowing ? `Following Chef ${profileUser?.name}` : 'Unfollowed');
    } catch (err: any) {
      try {
        const actualState = await api.checkIsFollowing(targetUserId, currentUser.id);
        setStats((prev) => (prev ? { ...prev, isFollowing: actualState } : prev));
      } catch {
        // ignore
      }
      showToast(err.message || 'Follow failed', 'error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnProfile) return;
    setIsSaving(true);
    try {
      const res = await api.updateProfile({
        name: editName.trim(),
        bio: editBio.trim(),
      });
      setProfileUser(res.user);
      await refreshUser();
      setIsEditing(false);
      showToast('Profile updated successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Uploading profile photo...');
      const photoUrl = await api.uploadMedia(file);
      const res = await api.updateProfile({ avatar: photoUrl });
      setProfileUser(res.user);
      await refreshUser();
      showToast('Profile avatar updated!');
    } catch (err: any) {
      showToast(err.message || 'Avatar upload failed', 'error');
    }
  };

  const filteredRecipes = useMemo(() => {
    if (activeTab === 'saved') return savedRecipes;
    if (activeTab === 'forks') return userRecipes.filter((r) => Boolean(r.parent_recipe_id));
    return userRecipes;
  }, [activeTab, savedRecipes, userRecipes]);

  return (
    <div id="profile-page" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {onBack && (
        <div className="mb-4">
          <BackButton onClick={onBack} label="Back" />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-48 rounded-2xl bg-stone-200 dark:bg-stone-800 animate-pulse" />
          <div className="h-32 rounded-2xl bg-stone-200 dark:bg-stone-800 animate-pulse" />
        </div>
      ) : !profileUser ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
          <ChefHat className="w-12 h-12 mx-auto text-stone-400 mb-3" />
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Chef Not Found</h3>
          <p className="text-sm text-stone-500 mt-1">Please log in or explore active community chefs.</p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="mt-4 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm transition-colors"
          >
            Log In
          </button>
        </div>
      ) : (
        <>
          {/* Chef Header Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar src={profileUser.avatar} name={profileUser.name} sizeClassName="w-20 h-20 text-xl" />
                  {isOwnProfile && (
                    <label
                      htmlFor="profile-avatar-file-input"
                      className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity"
                    >
                      <Edit3 className="w-5 h-5" />
                      <input
                        id="profile-avatar-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{profileUser.name}</h2>
                  <p className="text-sm font-medium text-stone-500 dark:text-stone-400">@{profileUser.username}</p>
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Joined{' '}
                      {new Date(profileUser.createdAt || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div>
                {isOwnProfile ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-sm font-semibold text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      stats?.isFollowing
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 hover:bg-stone-200'
                        : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/20'
                    }`}
                  >
                    {stats?.isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Follow Chef</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Bio */}
            {!isEditing ? (
              profileUser.bio && (
                <p className="mt-5 text-sm text-stone-700 dark:text-stone-300 leading-relaxed border-t border-stone-100 dark:border-stone-800 pt-4">
                  {profileUser.bio}
                </p>
              )
            ) : (
              <form onSubmit={handleSaveProfile} className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                    Chef Bio
                  </label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell other cooks about your favorite cuisines, culinary secrets, and cooking journey..."
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Stats Row */}
            <div className={`mt-6 pt-4 border-t border-stone-100 dark:border-stone-800 grid ${isOwnProfile ? 'grid-cols-5' : 'grid-cols-4'} gap-2 text-center`}>
              <div>
                <div className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
                  {stats?.recipesCount || userRecipes.length}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Recipes</div>
              </div>
              <div>
                <div className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
                  {stats?.forksCount || userRecipes.filter((r) => r.parent_recipe_id).length}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Forks</div>
              </div>
              {isOwnProfile && (
                <div>
                  <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                    {stats?.savedCount ?? savedRecipes.length}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Saved</div>
                </div>
              )}
              <button
                type="button"
                id="profile-followers-btn"
                onClick={() => {
                  setFollowModalTab('followers');
                  setShowFollowModal(true);
                }}
                className="group p-2 -m-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-center"
                aria-label={`View ${stats?.followersCount || 0} followers`}
              >
                <div className="text-xl font-extrabold text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {stats?.followersCount || 0}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 font-medium group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  Followers
                </div>
              </button>
              <button
                type="button"
                id="profile-following-btn"
                onClick={() => {
                  setFollowModalTab('following');
                  setShowFollowModal(true);
                }}
                className="group p-2 -m-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-center"
                aria-label={`View ${stats?.followingCount || 0} following`}
              >
                <div className="text-xl font-extrabold text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  {stats?.followingCount || 0}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 font-medium group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  Following
                </div>
              </button>
            </div>
          </div>

          {/* Recipes Tabs */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 p-1 bg-stone-200/70 dark:bg-stone-800/80 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                All Recipes ({userRecipes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('forks')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'forks'
                    ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Forks ({userRecipes.filter((r) => r.parent_recipe_id).length})</span>
              </button>
              {isOwnProfile && (
                <button
                  type="button"
                  id="profile-tab-saved"
                  onClick={() => setActiveTab('saved')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'saved'
                      ? 'bg-white dark:bg-stone-900 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 fill-current" />
                  <span>Saved ({savedRecipes.length})</span>
                </button>
              )}
            </div>

            {isOwnProfile && (
              <button
                type="button"
                onClick={onOpenCreate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Recipe</span>
              </button>
            )}
          </div>

          {/* Recipes List */}
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
              {activeTab === 'saved' ? (
                <Bookmark className="w-10 h-10 mx-auto text-amber-500/60 mb-2" />
              ) : (
                <ChefHat className="w-10 h-10 mx-auto text-stone-400 mb-2" />
              )}
              <h4 className="text-base font-bold text-stone-800 dark:text-stone-200">
                {activeTab === 'saved'
                  ? 'No Saved Recipes'
                  : activeTab === 'forks'
                  ? 'No Forked Recipes Yet'
                  : 'No Recipes Published Yet'}
              </h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                {activeTab === 'saved'
                  ? 'Recipes you bookmark across ChefFork will appear here for quick cooking.'
                  : isOwnProfile
                  ? 'Start sharing your culinary creativity or fork an existing dish.'
                  : 'This chef has not published recipes in this section.'}
              </p>
              {isOwnProfile && activeTab !== 'saved' && (
                <button
                  type="button"
                  onClick={onOpenCreate}
                  className="mt-4 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition-colors"
                >
                  Create Recipe
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => onOpenRecipe(recipe.id)}
                  className="group rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs hover:border-orange-500/60 dark:hover:border-orange-500/60 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-video w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                      {recipe.media ? (
                        isVideoUrl(recipe.media) ? (
                          <video
                            src={recipe.media}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={recipe.media}
                            alt={recipe.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">
                          <ChefHat className="w-8 h-8 opacity-30" />
                        </div>
                      )}

                      {recipe.parent_recipe_id && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500/90 text-white text-[10px] font-bold backdrop-blur-md flex items-center gap-1">
                          <GitFork className="w-3 h-3" /> Forked
                        </span>
                      )}

                      {isOwnProfile && activeTab === 'saved' && (
                        <button
                          type="button"
                          onClick={(e) => handleUnsave(e, recipe.id)}
                          disabled={removingSavedId === recipe.id}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/95 dark:bg-stone-900/95 text-amber-500 hover:text-rose-600 dark:text-amber-400 dark:hover:text-rose-400 backdrop-blur-md shadow-xs transition-colors cursor-pointer"
                          title="Remove bookmark"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </button>
                      )}
                    </div>

                    <div className="p-4">
                      <h4 className="font-bold text-base text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                        {recipe.title}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-1">
                        {recipe.description || 'Tasty recipe.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mt-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{(recipe.preparation_time || 0) + (recipe.cooking_time || 0)}m</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        id={`profile-recipe-likes-${recipe.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenLikedBy) {
                            onOpenLikedBy(recipe.id, recipe.title);
                          } else {
                            window.dispatchEvent(
                              new CustomEvent('cheffork:open-liked-by', {
                                detail: { recipeId: recipe.id, recipeTitle: recipe.title },
                              })
                            );
                          }
                        }}
                        className="flex items-center gap-1 text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer hover:underline"
                        title="View who liked this recipe"
                      >
                        <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                        <span>{recipe.likeCount || 0}</span>
                      </button>
                      <span className="flex items-center gap-1 text-orange-600">
                        <GitFork className="w-3.5 h-3.5" />
                        <span>{recipe.forkCount || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {/* Followers / Following Modal */}
      <FollowersModal
        isOpen={showFollowModal}
        onClose={() => setShowFollowModal(false)}
        profileUser={profileUser}
        initialTab={followModalTab}
        initialFollowersCount={stats?.followersCount ?? 0}
        initialFollowingCount={stats?.followingCount ?? 0}
        onOpenProfile={(uid) => {
          setShowFollowModal(false);
          onOpenProfile(uid);
        }}
        onFollowersCountChange={(newCount) => {
          setStats((prev) => (prev ? { ...prev, followersCount: newCount } : null));
        }}
        onFollowingCountChange={(newCount) => {
          setStats((prev) => (prev ? { ...prev, followingCount: newCount } : null));
        }}
      />
    </div>
  );
};
