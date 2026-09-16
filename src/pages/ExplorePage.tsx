import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search,
  Compass,
  GitFork,
  Heart,
  Clock,
  ChefHat,
  Bookmark,
  SlidersHorizontal,
  Flame,
  Users,
  Check,
  X,
  RotateCcw,
  Play,
  ChevronDown,
  ChevronUp,
  Utensils,
  MessageSquare,
  UserPlus,
  UserCheck,
  ArrowUpDown,
  Timer,
} from 'lucide-react';
import { Recipe, User } from '../types';
import { api, isVideoUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';

interface ExplorePageProps {
  onOpenRecipe: (id: string) => void;
  onForkRecipe: (recipe: Recipe) => void;
  onOpenProfile: (userId: string) => void;
  initialSearch?: string;
  onOpenLikedBy?: (recipeId: string, recipeTitle?: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  onOpenRecipe,
  onForkRecipe,
  onOpenProfile,
  initialSearch = '',
  onOpenLikedBy,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const { showToast } = useToast();

  // Search input state
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch.trim());

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [cookingTimeRange, setCookingTimeRange] = useState<'all' | '<15' | '15-30' | '30-60' | '>60'>('all');
  const [prepTimeRange, setPrepTimeRange] = useState<'all' | '<15' | '15-30' | '30-60' | '>60'>('all');
  const [servingsRange, setServingsRange] = useState<'all' | '1-2' | '3-4' | '5+'>('all');
  const [caloriesRange, setCaloriesRange] = useState<'all' | '<300' | '300-500' | '500-800' | '>800'>('all');
  const [forkFilter, setForkFilter] = useState<'all' | 'original' | 'forks'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular' | 'forked' | 'quickest' | 'calories'>('newest');

  // UI state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [allDbTags, setAllDbTags] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [chefs, setChefs] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);

  // Sync initialSearch if prop changes
  useEffect(() => {
    if (initialSearch !== undefined && initialSearch !== searchInput) {
      setSearchInput(initialSearch);
      setDebouncedSearch(initialSearch.trim());
    }
  }, [initialSearch]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle immediate form submission on Enter or search button click
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDebouncedSearch(searchInput.trim());
  };

  // Load REAL distinct tags dynamically from InsForge database recipes only
  useEffect(() => {
    let isCancelled = false;
    async function loadDynamicTags() {
      try {
        const dbTags = await api.getAllRecipeTags();
        if (!isCancelled && dbTags) {
          setAllDbTags(dbTags);
        }
      } catch (err) {
        console.warn('Could not load dynamic tags from recipes:', err);
      }
    }
    loadDynamicTags();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Compute number of active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count += 1;
    if (selectedCategory !== 'All') count += 1;
    if (selectedTags.length > 0) count += selectedTags.length;
    if (cookingTimeRange !== 'all') count += 1;
    if (prepTimeRange !== 'all') count += 1;
    if (servingsRange !== 'all') count += 1;
    if (caloriesRange !== 'all') count += 1;
    if (forkFilter !== 'all') count += 1;
    if (sortBy !== 'newest') count += 1;
    return count;
  }, [
    debouncedSearch,
    selectedCategory,
    selectedTags,
    cookingTimeRange,
    prepTimeRange,
    servingsRange,
    caloriesRange,
    forkFilter,
    sortBy,
  ]);

  // Reset all filters and search to clean defaults
  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setSelectedTags([]);
    setCookingTimeRange('all');
    setPrepTimeRange('all');
    setServingsRange('all');
    setCaloriesRange('all');
    setForkFilter('all');
    setSortBy('newest');
  };

  // Toggle multi-tag selection
  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Real data fetch based on active search, filters, and sort
  const fetchExploreData = useCallback(async () => {
    setIsLoading(true);
    try {
      const onlyForksParam = forkFilter === 'all' ? undefined : forkFilter === 'forks';
      const categoryTag = selectedCategory !== 'All' ? selectedCategory : undefined;

      // Combine category and selected tags
      const combinedTags = [...(categoryTag ? [categoryTag] : []), ...selectedTags];
      const uniqueTags = Array.from(new Set(combinedTags));

      const [recipesRes, chefsRes] = await Promise.all([
        api.getRecipes({
          search: debouncedSearch || undefined,
          tags: uniqueTags.length > 0 ? uniqueTags : undefined,
          tag: uniqueTags.length === 1 ? uniqueTags[0] : undefined,
          cookingTimeRange,
          prepTimeRange,
          servingsRange,
          caloriesRange,
          only_forks: onlyForksParam,
          sort: sortBy,
          limit: 48,
        }),
        debouncedSearch ? api.searchUsers(debouncedSearch) : Promise.resolve({ users: [] }),
      ]);

      setRecipes(recipesRes.recipes || []);
      setChefs((chefsRes as any)?.users || (chefsRes as any) || []);
    } catch (err: any) {
      console.warn('Explore load error:', err);
      showToast(err.message || 'Could not load recipes from database', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    selectedCategory,
    selectedTags,
    cookingTimeRange,
    prepTimeRange,
    servingsRange,
    caloriesRange,
    forkFilter,
    sortBy,
    showToast,
  ]);

  // Trigger search on filter / state changes
  useEffect(() => {
    fetchExploreData();
  }, [fetchExploreData]);

  // Re-evaluate user-specific state when currentUser changes (e.g. login/logout)
  useEffect(() => {
    fetchExploreData();
  }, [currentUser?.id]);

  // Sync window events across pages for live reactivity
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
    const handleRecipeSaved = (e: any) => {
      const { recipeId, isSaved } = e?.detail || {};
      if (recipeId) {
        setRecipes((prev) =>
          prev.map((r) => (r.id === recipeId ? { ...r, hasSaved: isSaved } : r))
        );
      }
    };
    const handleRecipeLiked = (e: any) => {
      const { recipeId, isLiked, likeCount } = e?.detail || {};
      if (recipeId) {
        setRecipes((prev) =>
          prev.map((r) =>
            r.id === recipeId
              ? {
                  ...r,
                  hasLiked: isLiked,
                  likeCount: likeCount !== undefined ? likeCount : r.likeCount,
                }
              : r
          )
        );
      }
    };
    const handleFollowChanged = (e: any) => {
      const { targetUserId, isFollowing } = e?.detail || {};
      if (targetUserId) {
        setRecipes((prev) =>
          prev.map((r) =>
            r.author_id === targetUserId ? { ...r, isFollowingAuthor: isFollowing } : r
          )
        );
      }
    };

    window.addEventListener('cheffork:recipe-deleted', handleRecipeDeleted);
    window.addEventListener('cheffork:recipe-updated', handleRecipeUpdated);
    window.addEventListener('cheffork:recipe-saved', handleRecipeSaved);
    window.addEventListener('cheffork:recipe-liked', handleRecipeLiked);
    window.addEventListener('cheffork:follow-changed', handleFollowChanged);
    return () => {
      window.removeEventListener('cheffork:recipe-deleted', handleRecipeDeleted);
      window.removeEventListener('cheffork:recipe-updated', handleRecipeUpdated);
      window.removeEventListener('cheffork:recipe-saved', handleRecipeSaved);
      window.removeEventListener('cheffork:recipe-liked', handleRecipeLiked);
      window.removeEventListener('cheffork:follow-changed', handleFollowChanged);
    };
  }, []);

  // Card Bookmark / Save Action
  const handleToggleSave = async (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (savingRecipeId) return;

    const previousSaved = recipe.hasSaved ?? false;
    const nextSaved = !previousSaved;
    setSavingRecipeId(recipe.id);

    // Optimistic UI update
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipe.id ? { ...r, hasSaved: nextSaved } : r))
    );

    try {
      if (nextSaved) {
        await api.saveRecipe(recipe.id);
        showToast('Saved to your bookmarks!');
      } else {
        await api.unsaveRecipe(recipe.id);
        showToast('Removed from bookmarks');
      }
      window.dispatchEvent(
        new CustomEvent('cheffork:recipe-saved', {
          detail: { recipeId: recipe.id, isSaved: nextSaved },
        })
      );
    } catch (err: any) {
      // Revert optimistic update
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipe.id ? { ...r, hasSaved: previousSaved } : r))
      );
      showToast(err.message || 'Failed to update saved recipe', 'error');
    } finally {
      setSavingRecipeId(null);
    }
  };

  // Card Like Action
  const handleLike = async (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    const currentLiked = recipe.hasLiked ?? false;
    const nextLiked = !currentLiked;
    const nextCount = currentLiked
      ? Math.max(0, (recipe.likeCount || 0) - 1)
      : (recipe.likeCount || 0) + 1;

    // Optimistic UI update
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipe.id ? { ...r, hasLiked: nextLiked, likeCount: nextCount } : r
      )
    );

    try {
      await api.toggleLike(recipe.id, currentUser);
      window.dispatchEvent(
        new CustomEvent('cheffork:recipe-liked', {
          detail: { recipeId: recipe.id, isLiked: nextLiked, likeCount: nextCount },
        })
      );
    } catch (err: any) {
      // Revert optimistic update
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === recipe.id
            ? { ...r, hasLiked: currentLiked, likeCount: recipe.likeCount || 0 }
            : r
        )
      );
      showToast(err.message || 'Could not update like', 'error');
    }
  };

  // Follow / Unfollow Chef Action
  const handleToggleFollow = async (
    e: React.MouseEvent,
    chefId: string,
    isCurrentlyFollowing: boolean
  ) => {
    e.stopPropagation();
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (currentUser.id === chefId) return;

    // Optimistic UI update
    setRecipes((prev) =>
      prev.map((r) =>
        r.author_id === chefId ? { ...r, isFollowingAuthor: !isCurrentlyFollowing } : r
      )
    );

    try {
      const res = await api.toggleFollow(chefId, currentUser);
      const finalFollowing = res.isFollowing;
      setRecipes((prev) =>
        prev.map((r) =>
          r.author_id === chefId ? { ...r, isFollowingAuthor: finalFollowing } : r
        )
      );
      window.dispatchEvent(
        new CustomEvent('cheffork:follow-changed', {
          detail: { targetUserId: chefId, isFollowing: finalFollowing },
        })
      );
      showToast(finalFollowing ? 'Chef followed!' : 'Unfollowed chef');
    } catch (err: any) {
      // Revert optimistic update
      setRecipes((prev) =>
        prev.map((r) =>
          r.author_id === chefId ? { ...r, isFollowingAuthor: isCurrentlyFollowing } : r
        )
      );
      showToast(err.message || 'Could not update follow status', 'error');
    }
  };

  return (
    <div id="explore-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
      {/* Top Header & Search Bar */}
      <div className="max-w-3xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 flex items-center justify-center gap-2.5">
          <Compass className="w-8 h-8 text-orange-600" />
          <span>Explore Culinary Creations</span>
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Discover original recipes, branching forks, and trending home chefs with instant search & filters
        </p>

        {/* Search Input Box with Submit Action */}
        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 max-w-2xl mx-auto"
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              id="explore-search-input"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by recipe title, description, chef name, or tags..."
              className="w-full pl-12 pr-10 py-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500 shadow-2xs text-sm"
            />
            {searchInput && (
              <button
                id="explore-clear-search-btn"
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Submit Button */}
            <button
              id="explore-search-submit-btn"
              type="submit"
              className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>

            {/* Filter Panel Toggle Button */}
            <button
              id="explore-filter-toggle-btn"
              type="button"
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              className={`flex-1 sm:flex-none px-4 py-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 shadow-2xs ${
                isFilterPanelOpen || activeFilterCount > 0
                  ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span
                  id="explore-active-filter-badge"
                  className="px-1.5 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-extrabold min-w-[18px] text-center"
                >
                  {activeFilterCount}
                </span>
              )}
              {isFilterPanelOpen ? (
                <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Category / Tag Carousel using REAL database tags */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        <button
          id="explore-category-all"
          type="button"
          onClick={() => setSelectedCategory('All')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            selectedCategory === 'All'
              ? 'bg-orange-600 text-white shadow-2xs font-bold'
              : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800'
          }`}
        >
          All Recipes
        </button>
        {allDbTags.map((tag) => {
          const isSelected = selectedCategory.toLowerCase() === tag.toLowerCase();
          return (
            <button
              key={tag}
              id={`explore-category-${tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              type="button"
              onClick={() => setSelectedCategory(isSelected ? 'All' : tag)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-orange-600 text-white shadow-2xs font-bold'
                  : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Collapsible Advanced Filters Drawer / Panel */}
      {isFilterPanelOpen && (
        <div
          id="explore-advanced-filter-panel"
          className="mb-6 p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-md space-y-6 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 font-heading">
                Filter Recipes
              </h3>
            </div>
            {activeFilterCount > 0 && (
              <button
                id="reset-all-filters-btn"
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. COOKING TIME FILTER */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Cooking Time</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'All', value: 'all' as const },
                  { label: 'Under 15m', value: '<15' as const },
                  { label: '15–30m', value: '15-30' as const },
                  { label: '30–60m', value: '30-60' as const },
                  { label: 'Over 60m', value: '>60' as const },
                ].map((item) => {
                  const active = cookingTimeRange === item.value;
                  return (
                    <button
                      key={item.label}
                      id={`filter-cooking-time-${item.value}`}
                      type="button"
                      onClick={() => setCookingTimeRange(item.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. PREPARATION TIME FILTER */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-stone-400" />
                <span>Preparation Time</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'All', value: 'all' as const },
                  { label: 'Under 15m', value: '<15' as const },
                  { label: '15–30m', value: '15-30' as const },
                  { label: '30–60m', value: '30-60' as const },
                  { label: 'Over 60m', value: '>60' as const },
                ].map((item) => {
                  const active = prepTimeRange === item.value;
                  return (
                    <button
                      key={item.label}
                      id={`filter-prep-time-${item.value}`}
                      type="button"
                      onClick={() => setPrepTimeRange(item.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. SERVINGS FILTER */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                <span>Servings</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'All', value: 'all' as const },
                  { label: '1–2', value: '1-2' as const },
                  { label: '3–4', value: '3-4' as const },
                  { label: '5+', value: '5+' as const },
                ].map((item) => {
                  const active = servingsRange === item.value;
                  return (
                    <button
                      key={item.label}
                      id={`filter-servings-${item.value}`}
                      type="button"
                      onClick={() => setServingsRange(item.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. CALORIES FILTER */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-stone-400" />
                <span>Calories</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'All', value: 'all' as const },
                  { label: 'Under 300 kcal', value: '<300' as const },
                  { label: '300–500 kcal', value: '300-500' as const },
                  { label: '500–800 kcal', value: '500-800' as const },
                  { label: 'Over 800 kcal', value: '>800' as const },
                ].map((item) => {
                  const active = caloriesRange === item.value;
                  return (
                    <button
                      key={item.label}
                      id={`filter-calories-${item.value}`}
                      type="button"
                      onClick={() => setCaloriesRange(item.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recipe Type & Real Tags Section */}
          <div className="border-t border-stone-100 dark:border-stone-800 pt-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Origin Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-stone-400" />
                <span>Recipe Origin</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'All Recipes', value: 'all' as const },
                  { label: 'Originals Only', value: 'original' as const },
                  { label: 'Forks Only', value: 'forks' as const },
                ].map((item) => {
                  const active = forkFilter === item.value;
                  return (
                    <button
                      key={item.label}
                      id={`filter-origin-${item.value}`}
                      type="button"
                      onClick={() => setForkFilter(item.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        active
                          ? 'bg-orange-600 text-white shadow-2xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* REAL Database Tags Multi-Select */}
            {allDbTags.length > 0 && (
              <div className="lg:col-span-2 space-y-2">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-stone-400" />
                  <span>Real Recipe Tags in Database</span>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {allDbTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        id={`filter-tag-${tag.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-500 text-white font-bold'
                            : 'bg-stone-100 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>#{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Filter Pills Bar */}
      {activeFilterCount > 0 && (
        <div
          id="explore-active-filters-bar"
          className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 text-xs"
        >
          <span className="font-bold text-stone-500 dark:text-stone-400 text-[11px] uppercase tracking-wider">
            Active:
          </span>

          {debouncedSearch && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-medium">
              <span>Search: "{debouncedSearch}"</span>
              <X
                className="w-3 h-3 cursor-pointer hover:opacity-75"
                onClick={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                }}
              />
            </span>
          )}

          {selectedCategory !== 'All' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-medium">
              <span>Category: {selectedCategory}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:opacity-75"
                onClick={() => setSelectedCategory('All')}
              />
            </span>
          )}

          {selectedTags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-medium"
            >
              <span>#{t}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:opacity-75"
                onClick={() => handleToggleTag(t)}
              />
            </span>
          ))}

          {cookingTimeRange !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium">
              <span>
                Cook Time:{' '}
                {cookingTimeRange === '<15'
                  ? 'Under 15m'
                  : cookingTimeRange === '15-30'
                  ? '15–30m'
                  : cookingTimeRange === '30-60'
                  ? '30–60m'
                  : 'Over 60m'}
              </span>
              <X
                className="w-3 h-3 cursor-pointer hover:opacity-75"
                onClick={() => setCookingTimeRange('all')}
              />
            </span>
          )}

          {prepTimeRange !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium">
              <span>
                Prep Time:{' '}
                {prepTimeRange === '<15'
                  ? 'Under 15m'
                  : prepTimeRange === '15-30'
                  ? '15–30m'
                  : prepTimeRange === '30-60'
                  ? '30–60m'
                  : 'Over 60m'}
              </span>
              <X
                className="w-3 h-3 cursor-pointer hover:opacity-75"
                onClick={() => setPrepTimeRange('all')}
              />
            </span>
          )}

          {servingsRange !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium">
              <span>Servings: {servingsRange}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:opacity-75"
                onClick={() => setServingsRange('all')}
              />
            </span>
          )}

          {caloriesRange !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium">
              <span>
                Calories:{' '}
                {caloriesRange === '<300'
                  ? 'Under 300 kcal'
                  : caloriesRange === '300-500'
                  ? '300–500 kcal'
                  : caloriesRange === '500-800'
                  ? '500–800 kcal'
                  : 'Over 800 kcal'}
              </span>
              <X
                className="w-3 h-3 cursor-pointer hover:opacity-75"
                onClick={() => setCaloriesRange('all')}
              />
            </span>
          )}

          {forkFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium">
              <span>{forkFilter === 'original' ? 'Originals Only' : 'Forks Only'}</span>
              <X
                className="w-3 h-3 cursor-pointer hover:opacity-75"
                onClick={() => setForkFilter('all')}
              />
            </span>
          )}

          {sortBy !== 'newest' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium">
              <span>
                Sort: {sortBy === 'popular' ? 'Most Liked' : sortBy === 'oldest' ? 'Oldest' : sortBy}
              </span>
              <X
                className="w-3 h-3 cursor-pointer hover:opacity-75"
                onClick={() => setSortBy('newest')}
              />
            </span>
          )}

          <button
            id="clear-all-active-filters-btn"
            type="button"
            onClick={handleResetFilters}
            className="ml-auto text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Controls Bar: Real Result Count & Sorting Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div id="explore-results-count" className="text-xs text-stone-600 dark:text-stone-400 font-medium">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-stone-500">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              Searching recipes in database...
            </span>
          ) : (
            <span>
              <strong className="text-stone-900 dark:text-stone-100 font-bold">
                {recipes.length}
              </strong>{' '}
              {recipes.length === 1 ? 'recipe found' : 'recipes found'}
            </span>
          )}
        </div>

        {/* Sorting Dropdown with Newest, Oldest, Most Liked */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort:</span>
          </span>
          <select
            id="explore-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-2xs"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="popular">Most Liked</option>
            <option value="forked">Most Forked</option>
            <option value="quickest">Quickest</option>
          </select>
        </div>
      </div>

      {/* Chefs Discovery (shown when search query matches real chef profiles) */}
      {chefs.length > 0 && debouncedSearch.length > 0 && (
        <div
          id="matching-chefs-section"
          className="mb-8 p-5 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3.5 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-orange-600" />
            <span>Matching Chefs ({chefs.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {chefs.slice(0, 4).map((chef) => (
              <div
                key={chef.id}
                id={`matching-chef-card-${chef.id}`}
                onClick={() => onOpenProfile(chef.id)}
                className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-between gap-3 cursor-pointer hover:border-orange-500 hover:bg-orange-50/40 dark:hover:bg-stone-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={chef.avatar} name={chef.name} sizeClassName="w-10 h-10" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                      {chef.name}
                    </h4>
                    <p className="text-xs text-stone-500 truncate">@{chef.username}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipes Grid */}
      {isLoading ? (
        <div id="explore-recipes-loading" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-3xl bg-stone-200 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        /* Empty State: No fake recipes, clear instructions, Clear Filters button */
        <div
          id="explore-empty-state"
          className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3 max-w-lg mx-auto"
        >
          <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto">
            <ChefHat className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 font-heading">
            No recipes found
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
            Try changing your search or filters.
          </p>
          {activeFilterCount > 0 && (
            <div className="pt-2">
              <button
                id="empty-clear-filters-btn"
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Real Recipe Cards Grid */
        <div id="explore-recipes-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => {
            const totalTime = (recipe.preparation_time || 0) + (recipe.cooking_time || 0);
            const isVideo = isVideoUrl(recipe.media);
            const calories = recipe.nutrition?.calories;
            const isOwnRecipe = currentUser?.id === recipe.author_id;

            return (
              <div
                key={recipe.id}
                id={`recipe-card-${recipe.id}`}
                onClick={() => onOpenRecipe(recipe.id)}
                className="group rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs hover:shadow-md hover:border-orange-500/60 dark:hover:border-orange-500/60 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Media Hero */}
                  <div className="relative aspect-video w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                    {recipe.media ? (
                      isVideo ? (
                        <>
                          <video
                            src={recipe.media}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                            <div className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs">
                              <Play className="w-4 h-4 fill-white ml-0.5" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img
                          src={recipe.media}
                          alt={recipe.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-1.5">
                        <ChefHat className="w-10 h-10 opacity-30" />
                        <span className="text-[11px] font-medium text-stone-400">Fresh Recipe</span>
                      </div>
                    )}

                    {/* Heritage Fork Badge */}
                    {recipe.parent_recipe_id && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold backdrop-blur-md flex items-center gap-1 shadow-sm">
                        <GitFork className="w-3 h-3" /> Forked
                      </span>
                    )}

                    {/* Bookmark Save Button on Card */}
                    <button
                      id={`recipe-bookmark-btn-${recipe.id}`}
                      type="button"
                      onClick={(e) => handleToggleSave(e, recipe)}
                      disabled={savingRecipeId === recipe.id}
                      className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all cursor-pointer shadow-sm ${
                        recipe.hasSaved
                          ? 'bg-amber-500 text-white'
                          : 'bg-black/40 text-white hover:bg-black/60'
                      }`}
                      title={recipe.hasSaved ? 'Remove bookmark' : 'Bookmark recipe'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${recipe.hasSaved ? 'fill-white' : ''}`} />
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    {/* Author & Origin Row with Follow option */}
                    <div className="flex items-center justify-between mb-2">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (recipe.author_id) onOpenProfile(recipe.author_id);
                        }}
                        className="flex items-center gap-2 cursor-pointer group/author min-w-0"
                      >
                        <Avatar
                          src={recipe.author?.avatar}
                          name={recipe.author?.name}
                          sizeClassName="w-6 h-6"
                        />
                        <span className="text-xs font-medium text-stone-600 dark:text-stone-400 group-hover/author:text-orange-600 truncate">
                          {recipe.author?.name || 'Chef'}
                        </span>
                      </div>

                      {/* Optional inline follow toggle for other chefs */}
                      {currentUser && !isOwnRecipe && recipe.author_id && (
                        <button
                          id={`author-follow-btn-${recipe.id}`}
                          type="button"
                          onClick={(e) =>
                            handleToggleFollow(
                              e,
                              recipe.author_id,
                              recipe.isFollowingAuthor ?? false
                            )
                          }
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                            recipe.isFollowingAuthor
                              ? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                              : 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40'
                          }`}
                        >
                          {recipe.isFollowingAuthor ? (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3 h-3" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                      {recipe.title}
                    </h3>

                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-1.5 leading-relaxed">
                      {recipe.description || 'Delicious home-cooked recipe created on ChefFork.'}
                    </p>

                    {/* Tags Pills */}
                    {recipe.tags && recipe.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {recipe.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory(tag);
                            }}
                            className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-orange-100 hover:text-orange-700 dark:hover:bg-orange-950/40 dark:hover:text-orange-300 transition-colors cursor-pointer"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Metrics & Actions */}
                <div className="p-5 pt-0 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 mt-4">
                  {/* Time & Calories */}
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center gap-1"
                      title={`Prep: ${recipe.preparation_time || 0}m, Cook: ${recipe.cooking_time || 0}m`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{totalTime}m</span>
                    </div>
                    {calories ? (
                      <div className="flex items-center gap-1" title="Calories">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>{calories} kcal</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Actions: Likes, Comments, Forks */}
                  <div className="flex items-center gap-3">
                    {/* Interactive Like Action & Clickable Count */}
                    <div className="flex items-center gap-1 font-medium">
                      <button
                        id={`recipe-like-btn-${recipe.id}`}
                        type="button"
                        onClick={(e) => handleLike(e, recipe)}
                        className={`transition-colors cursor-pointer p-0.5 ${
                          recipe.hasLiked
                            ? 'text-rose-600 font-bold'
                            : 'text-stone-500 hover:text-rose-600 dark:hover:text-rose-400'
                        }`}
                        title={recipe.hasLiked ? 'Unlike' : 'Like'}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            recipe.hasLiked ? 'fill-rose-500 text-rose-500' : ''
                          }`}
                        />
                      </button>
                      <button
                        id={`recipe-like-count-btn-${recipe.id}`}
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
                        className={`transition-colors cursor-pointer hover:underline text-xs ${
                          recipe.hasLiked
                            ? 'text-rose-600 font-bold'
                            : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-200'
                        }`}
                        title="View who liked this recipe"
                      >
                        {recipe.likeCount || 0}
                      </button>
                    </div>

                    {/* Comments Indicator / Open Details */}
                    <button
                      id={`recipe-comment-btn-${recipe.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRecipe(recipe.id);
                      }}
                      className="flex items-center gap-1 text-stone-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
                      title="View comments"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{recipe.commentCount || 0}</span>
                    </button>

                    {/* Fork Button */}
                    <button
                      id={`recipe-fork-btn-${recipe.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!currentUser) {
                          openAuthModal('login');
                        } else {
                          onForkRecipe(recipe);
                        }
                      }}
                      className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold hover:underline cursor-pointer"
                      title="Fork and branch this recipe"
                    >
                      <GitFork className="w-3.5 h-3.5" />
                      <span>{recipe.forkCount || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
