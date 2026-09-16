import React, { useEffect, useState, useCallback } from 'react';
import { ChefHat, GitFork, Heart, MessageSquare, Clock, PlusCircle, Share2, Sparkles, Filter } from 'lucide-react';
import { Recipe } from '../types';
import { api, isVideoUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';

interface HomeFeedProps {
  onOpenRecipe: (id: string) => void;
  onForkRecipe: (recipe: Recipe) => void;
  onOpenProfile: (userId: string) => void;
  onOpenCreate: () => void;
  onOpenLikedBy?: (recipeId: string, recipeTitle?: string) => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  onOpenRecipe,
  onForkRecipe,
  onOpenProfile,
  onOpenCreate,
  onOpenLikedBy,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'latest' | 'following' | 'forked'>('latest');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      let sort: 'recent' | 'popular' | 'forked' = 'recent';
      let tabParam: 'all' | 'following' = 'all';

      if (activeTab === 'following') {
        tabParam = 'following';
      } else if (activeTab === 'forked') {
        sort = 'forked';
      }

      const res = await api.getRecipes({
        tab: tabParam,
        sort,
        limit: 20,
      });
      setRecipes(res.recipes || []);
    } catch (err: any) {
      console.warn('Failed to load feed:', err);
      showToast(err.message || 'Failed to refresh feed', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentUser?.id, showToast]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  useEffect(() => {
    const handleRecipeDeleted = (e: any) => {
      const deletedId = e?.detail?.recipeId;
      if (deletedId) {
        setRecipes((prev) => prev.filter((r) => r.id !== deletedId));
      }
    };
    const handleRecipeUpdated = (e: any) => {
      const updated = e?.detail?.recipe;
      if (updated?.id) {
        setRecipes((prev) =>
          prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
        );
      }
    };
    const handleRecipeLiked = (e: any) => {
      const { recipeId, likeCount, isLiked, userId } = e?.detail || {};
      if (recipeId) {
        setRecipes((prev) =>
          prev.map((r) => {
            if (r.id !== recipeId) return r;
            const updatedHasLiked = userId === currentUser?.id ? isLiked : r.hasLiked;
            return {
              ...r,
              likeCount: typeof likeCount === 'number' ? likeCount : r.likeCount,
              hasLiked: updatedHasLiked !== undefined ? updatedHasLiked : r.hasLiked,
            };
          })
        );
      }
    };

    window.addEventListener('cheffork:recipe-deleted', handleRecipeDeleted);
    window.addEventListener('cheffork:recipe-updated', handleRecipeUpdated);
    window.addEventListener('cheffork:recipe-liked', handleRecipeLiked);
    return () => {
      window.removeEventListener('cheffork:recipe-deleted', handleRecipeDeleted);
      window.removeEventListener('cheffork:recipe-updated', handleRecipeUpdated);
      window.removeEventListener('cheffork:recipe-liked', handleRecipeLiked);
    };
  }, [currentUser?.id]);

  const handleLike = async (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    // Optimistic toggle
    const currentLiked = recipe.hasLiked;
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipe.id
          ? {
              ...r,
              hasLiked: !currentLiked,
              likeCount: currentLiked ? Math.max(0, r.likeCount - 1) : r.likeCount + 1,
            }
          : r
      )
    );

    try {
      await api.toggleLike(recipe.id, currentUser);
    } catch (err: any) {
      // Revert on error
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipe.id
            ? {
                ...r,
                hasLiked: currentLiked,
                likeCount: recipe.likeCount,
              }
            : r
        )
      );
      showToast(err.message || 'Could not update like', 'error');
    }
  };

  const handleShare = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?recipeId=${recipe.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Recipe link copied to clipboard!');
    }
  };

  return (
    <div id="home-feed-page" className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <ChefHat className="w-7 h-7 text-orange-600" />
            <span>Community Feed</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Discover freshly baked ideas and evolutionary forks
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-stone-200/70 dark:bg-stone-800/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('latest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'latest'
                ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => {
              if (!currentUser) {
                openAuthModal('login');
              } else {
                setActiveTab('following');
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'following'
                ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Following
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('forked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'forked'
                ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Top Forks</span>
          </button>
        </div>
      </div>

      {/* Feed Cards */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-96 rounded-2xl bg-stone-200 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <ChefHat className="w-12 h-12 mx-auto text-stone-400 mb-3" />
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            {activeTab === 'following' ? 'No Recipes From Following Chefs' : 'No Recipes Found'}
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            {activeTab === 'following'
              ? 'Explore creators and follow chefs whose recipes inspire your daily cooking.'
              : 'Be the pioneer! Publish your first recipe or fork a classic dish.'}
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Cook New Recipe</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {recipes.map((recipe) => (
            <article
              key={recipe.id}
              onClick={() => onOpenRecipe(recipe.id)}
              className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 overflow-hidden shadow-xs hover:shadow-md hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-all cursor-pointer"
            >
              {/* Card Header: Author Info */}
              <div className="p-4 sm:p-5 flex items-center justify-between">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (recipe.author_id) onOpenProfile(recipe.author_id);
                  }}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <Avatar src={recipe.author?.avatar} name={recipe.author?.name} sizeClassName="w-10 h-10" />
                  <div>
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {recipe.author?.name || 'Chef'}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      @{recipe.author?.username || 'cook'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{(recipe.preparation_time || 0) + (recipe.cooking_time || 0)}m</span>
                </div>
              </div>

              {/* Fork Lineage Banner if forked */}
              {recipe.parent_recipe_id && (
                <div className="mx-4 sm:mx-5 mb-3 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">
                    Forked from{' '}
                    <span className="font-semibold">{recipe.parentRecipe?.title || 'Original Recipe'}</span>
                    {recipe.parentRecipe?.authorName ? ` by ${recipe.parentRecipe.authorName}` : ''}
                  </span>
                </div>
              )}

              {/* Media Player / Image */}
              {recipe.media && (
                <div className="relative aspect-video w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  {isVideoUrl(recipe.media) ? (
                    <video
                      src={recipe.media}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={recipe.media}
                      alt={recipe.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Card Body */}
              <div className="p-4 sm:p-5">
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                  {recipe.title}
                </h3>
                {recipe.description && (
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
                    {recipe.description}
                  </p>
                )}

                {/* Ingredients snippet */}
                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {recipe.ingredients.slice(0, 4).map((ing) => (
                      <span
                        key={ing.id}
                        className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                      >
                        {ing.name}
                      </span>
                    ))}
                    {recipe.ingredients.length > 4 && (
                      <span className="px-2 py-0.5 text-[11px] font-medium text-stone-500">
                        +{recipe.ingredients.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Action Bar */}
                <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Like button and clickable count */}
                    <div className="inline-flex items-center rounded-lg border border-stone-200/80 dark:border-stone-700/80 bg-stone-50/60 dark:bg-stone-850 overflow-hidden text-xs">
                      <button
                        id={`homefeed-like-btn-${recipe.id}`}
                        type="button"
                        onClick={(e) => handleLike(e, recipe)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold transition-colors cursor-pointer ${
                          recipe.hasLiked
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                            : 'text-stone-600 dark:text-stone-400 hover:text-rose-600 dark:hover:text-rose-400'
                        }`}
                        title={recipe.hasLiked ? 'Unlike recipe' : 'Like recipe'}
                      >
                        <Heart className={`w-4 h-4 ${recipe.hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                      <button
                        id={`homefeed-like-count-${recipe.id}`}
                        type="button"
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
                        className="px-2 py-1.5 font-semibold text-stone-600 dark:text-stone-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                        title="View who liked this recipe"
                      >
                        {recipe.likeCount || 0}
                      </button>
                    </div>

                    {/* Comments count */}
                    <button
                      type="button"
                      onClick={() => onOpenRecipe(recipe.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{recipe.commentCount || 0}</span>
                    </button>

                    {/* Share */}
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, recipe)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                      title="Share recipe link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Fork Action Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!currentUser) {
                        openAuthModal('login');
                      } else {
                        onForkRecipe(recipe);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/50 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 text-xs font-bold transition-all border border-orange-200/80 dark:border-orange-800 cursor-pointer"
                  >
                    <GitFork className="w-3.5 h-3.5 text-orange-600" />
                    <span>Fork Recipe ({recipe.forkCount || 0})</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
