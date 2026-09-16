import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Bookmark, Search, Clock, Heart, GitFork, Trash2, Compass, ChefHat, Sparkles } from 'lucide-react';
import { Recipe } from '../types';
import { api, isVideoUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';
import { BackButton } from '../components/BackButton';

interface SavedRecipesPageProps {
  onOpenRecipe: (id: string) => void;
  onForkRecipe: (recipe: Recipe) => void;
  onOpenProfile: (userId: string) => void;
  onExplore: () => void;
  onBack?: () => void;
  onOpenLikedBy?: (recipeId: string, recipeTitle?: string) => void;
}

export const SavedRecipesPage: React.FC<SavedRecipesPageProps> = ({
  onOpenRecipe,
  onForkRecipe,
  onOpenProfile,
  onExplore,
  onBack,
  onOpenLikedBy,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchSavedRecipes = useCallback(async () => {
    if (!currentUser?.id) {
      setRecipes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.getSavedRecipes();
      setRecipes(res.recipes || []);
    } catch (err: any) {
      console.error('Error loading saved recipes:', err);
      showToast(err.message || 'Failed to load saved recipes', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, showToast]);

  useEffect(() => {
    setRecipes([]);
    fetchSavedRecipes();
  }, [fetchSavedRecipes]);

  // Real-time synchronization when recipes are saved/unsaved or deleted
  useEffect(() => {
    const handleRecipeSaved = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      const { recipeId, isSaved } = detail;
      if (!isSaved) {
        setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      } else {
        // If newly saved, refresh list to include it
        fetchSavedRecipes();
      }
    };

    const handleRecipeDeleted = (e: any) => {
      const deletedId = e?.detail?.recipeId;
      if (deletedId) {
        setRecipes((prev) => prev.filter((r) => r.id !== deletedId));
      }
    };

    const handleRecipeLiked = (e: any) => {
      const detail = e?.detail;
      if (detail?.recipeId) {
        setRecipes((prev) =>
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
      }
    };

    window.addEventListener('cheffork:recipe-saved', handleRecipeSaved);
    window.addEventListener('cheffork:recipe-deleted', handleRecipeDeleted);
    window.addEventListener('cheffork:recipe-liked', handleRecipeLiked);

    return () => {
      window.removeEventListener('cheffork:recipe-saved', handleRecipeSaved);
      window.removeEventListener('cheffork:recipe-deleted', handleRecipeDeleted);
      window.removeEventListener('cheffork:recipe-liked', handleRecipeLiked);
    };
  }, [fetchSavedRecipes, currentUser?.id]);

  const handleUnsave = async (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    if (!currentUser) return;

    setRemovingId(recipe.id);
    try {
      await api.unsaveRecipe(recipe.id);
      setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
      showToast(`Removed "${recipe.title}" from saved recipes`);
    } catch (err: any) {
      console.error('Failed to remove saved recipe:', err);
      showToast(err.message || 'Failed to remove recipe', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    const q = searchQuery.toLowerCase().trim();
    return recipes.filter((r) => {
      const matchTitle = r.title?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchAuthor = r.author?.name?.toLowerCase().includes(q) || r.author?.username?.toLowerCase().includes(q);
      const matchTags = r.tags?.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchAuthor || matchTags;
    });
  }, [recipes, searchQuery]);

  if (!currentUser) {
    return (
      <div id="saved-recipes-page" className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-28">
        {onBack && (
          <div className="mb-6">
            <BackButton id="saved-recipes-back-btn" onClick={onBack} label="Back" />
          </div>
        )}

        <div className="text-center py-16 px-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Bookmark className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-heading text-stone-900 dark:text-stone-100 mb-2">
            Your Personal Recipe Bookmarks
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto mb-6">
            Log in to save recipes to your personal collection and access them anytime across all your devices.
          </p>
          <button
            id="saved-login-btn"
            onClick={() => openAuthModal('login')}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Log In to View Saved Recipes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="saved-recipes-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          {onBack && (
            <div className="mb-3">
              <BackButton id="saved-recipes-back-btn" onClick={onBack} label="Back" />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Bookmark className="w-7 h-7 text-amber-500 fill-amber-500" />
            <span>Saved Recipes</span>
            <span className="text-sm font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full ml-1">
              {recipes.length}
            </span>
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Your bookmarked recipes stored securely in your InsForge database
          </p>
        </div>

        {/* Quick Search */}
        {recipes.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              id="saved-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your saved recipes..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 shadow-xs"
            />
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-80 rounded-3xl bg-stone-100 dark:bg-stone-800 animate-pulse border border-stone-200/60 dark:border-stone-700/60"
            />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        /* Empty Collection State */
        <div className="text-center py-20 px-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs max-w-xl mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Bookmark className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-heading text-stone-900 dark:text-stone-100 mb-2">
            No Saved Recipes Yet
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 max-w-md mx-auto">
            Whenever you discover a recipe you'd love to cook or fork later, tap the bookmark icon to save it here.
          </p>
          <button
            id="saved-explore-cta-btn"
            onClick={onExplore}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Community Recipes</span>
          </button>
        </div>
      ) : filteredRecipes.length === 0 ? (
        /* No Search Results */
        <div className="text-center py-16 px-4 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800">
          <Search className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">No matching bookmarks</h3>
          <p className="text-xs text-stone-500 mt-1">No recipes in your saved collection match "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 text-xs font-semibold text-orange-600 hover:underline"
          >
            Clear Search
          </button>
        </div>
      ) : (
        /* Saved Recipes Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              id={`saved-recipe-card-${recipe.id}`}
              onClick={() => onOpenRecipe(recipe.id)}
              className="group bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Media banner */}
                <div className="relative aspect-video w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
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
                    <div className="w-full h-full flex flex-col items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-400">
                      <ChefHat className="w-10 h-10 mb-1 opacity-50" />
                      <span className="text-xs font-medium">ChefFork Recipe</span>
                    </div>
                  )}

                  {/* Bookmark Remove Button overlay */}
                  <button
                    id={`saved-remove-btn-${recipe.id}`}
                    type="button"
                    onClick={(e) => handleUnsave(e, recipe)}
                    disabled={removingId === recipe.id}
                    title="Remove from saved recipes"
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-stone-900/90 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-amber-500 hover:text-rose-600 dark:text-amber-400 dark:hover:text-rose-400 backdrop-blur-md shadow-sm transition-all cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </button>

                  {/* Forked pill */}
                  {recipe.parent_recipe_id && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-[11px] font-bold backdrop-blur-md flex items-center gap-1 shadow-sm">
                      <GitFork className="w-3 h-3" /> Forked
                    </span>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (recipe.author_id) onOpenProfile(recipe.author_id);
                    }}
                    className="flex items-center gap-2 mb-2 cursor-pointer group/author"
                  >
                    <Avatar src={recipe.author?.avatar} name={recipe.author?.name} sizeClassName="w-6 h-6" />
                    <span className="text-xs font-medium text-stone-600 dark:text-stone-400 group-hover/author:text-orange-600 truncate">
                      Chef {recipe.author?.name || 'Chef'}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                    {recipe.title}
                  </h3>

                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                    {recipe.description || 'Delicious home-cooked recipe.'}
                  </p>

                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom footer */}
              <div className="p-5 pt-0 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mt-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{(recipe.preparation_time || 0) + (recipe.cooking_time || 0)}m</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    id={`saved-recipe-likes-${recipe.id}`}
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
                    className="flex items-center gap-1 text-rose-500 font-medium hover:text-rose-600 transition-colors cursor-pointer hover:underline"
                    title="View who liked this recipe"
                  >
                    <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                    <span>{recipe.likeCount || 0}</span>
                  </button>
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
                    className="flex items-center gap-1 text-orange-600 font-bold hover:underline"
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    <span>{recipe.forkCount || 0} forks</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
