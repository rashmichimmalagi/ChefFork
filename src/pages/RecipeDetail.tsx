import React, { useState, useEffect } from 'react';
import { RecipeDetailData, Recipe } from '../types';
import { api, isVideoUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { LineageGraph } from '../components/LineageGraph';
import { BackButton } from '../components/BackButton';
import { Avatar } from '../components/Avatar';
import {
  Heart,
  MessageSquare,
  GitFork,
  Clock,
  Users,
  Flame,
  UserPlus,
  UserCheck,
  Send,
  Trash2,
  CheckSquare,
  Square,
  Share2,
  Bookmark,
  ChefHat,
  Video,
  Edit2,
  Check,
  X,
  Image as ImageIcon,
  Upload,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface RecipeDetailProps {
  recipeId: string;
  onBack: () => void;
  onForkRecipe: (recipe: Recipe) => void;
  onOpenRecipe: (id: string) => void;
  onOpenProfile: (userId: string) => void;
  onEditRecipe?: (recipe: Recipe) => void;
  onDeleteRecipe?: (deletedRecipeId: string) => void;
  onOpenLikedBy?: (recipeId: string, recipeTitle?: string) => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipeId,
  onBack,
  onForkRecipe,
  onOpenRecipe,
  onOpenProfile,
  onEditRecipe,
  onDeleteRecipe,
  onOpenLikedBy,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [recipe, setRecipe] = useState<RecipeDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // User-authenticated local client-side check-off states (only active when logged in)
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined' && recipeId && currentUser?.id) {
      try {
        const stored = sessionStorage.getItem(`cheffork_checked_ing_${currentUser.id}_${recipeId}`);
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined' && recipeId && currentUser?.id) {
      try {
        const stored = sessionStorage.getItem(`cheffork_checked_steps_${currentUser.id}_${recipeId}`);
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  // Sync check-off state when navigating recipes or logging in/out
  useEffect(() => {
    if (typeof window !== 'undefined' && recipeId && currentUser?.id) {
      try {
        const storedIng = sessionStorage.getItem(`cheffork_checked_ing_${currentUser.id}_${recipeId}`);
        setCheckedIngredients(storedIng ? JSON.parse(storedIng) : {});
        const storedSteps = sessionStorage.getItem(`cheffork_checked_steps_${currentUser.id}_${recipeId}`);
        setCheckedSteps(storedSteps ? JSON.parse(storedSteps) : {});
      } catch {
        setCheckedIngredients({});
        setCheckedSteps({});
      }
    } else {
      // Clear check states when logged out
      setCheckedIngredients({});
      setCheckedSteps({});
    }
  }, [recipeId, currentUser?.id]);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Owner media removal and replacement states
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);
  const [isRemovingMedia, setIsRemovingMedia] = useState<boolean>(false);
  const [isUploadingReplacement, setIsUploadingReplacement] = useState<boolean>(false);

  // Owner recipe deletion states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchRecipe = async () => {
      setLoading(true);
      try {
        const data = await api.getRecipe(recipeId);
        if (!isCancelled) {
          setRecipe(data.recipe);
          setIsFollowing(Boolean(data.recipe.isFollowingAuthor));
        }
      } catch (err: any) {
        if (!isCancelled) {
          showToast(err.message || 'Failed to load recipe', 'error');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    fetchRecipe();
    return () => {
      isCancelled = true;
    };
  }, [recipeId, currentUser?.id]);

  useEffect(() => {
    const handleRecipeSavedEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && detail.recipeId === recipeId) {
        setRecipe(prev => (prev ? { ...prev, hasSaved: detail.isSaved } : null));
      }
    };
    const handleRecipeLikedEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail && detail.recipeId === recipeId) {
        setRecipe(prev => {
          if (!prev) return null;
          const updatedHasLiked = detail.userId === currentUser?.id ? detail.isLiked : prev.hasLiked;
          return {
            ...prev,
            likeCount: typeof detail.likeCount === 'number' ? detail.likeCount : prev.likeCount,
            hasLiked: updatedHasLiked !== undefined ? updatedHasLiked : prev.hasLiked,
          };
        });
      }
    };
    window.addEventListener('cheffork:recipe-saved', handleRecipeSavedEvent);
    window.addEventListener('cheffork:recipe-liked', handleRecipeLikedEvent);
    return () => {
      window.removeEventListener('cheffork:recipe-saved', handleRecipeSavedEvent);
      window.removeEventListener('cheffork:recipe-liked', handleRecipeLikedEvent);
    };
  }, [recipeId, currentUser?.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="h-8 bg-stone-200 w-32 rounded mb-6 animate-pulse" />
        <div className="h-96 bg-stone-200 rounded-3xl animate-pulse mb-8" />
        <div className="h-10 bg-stone-200 w-3/4 rounded animate-pulse" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <h2 className="text-xl font-bold text-stone-900 mb-2">Recipe Not Found</h2>
        <p className="text-sm text-stone-500 mb-6">The requested recipe may have been removed.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl"
        >
          Back to Recipes
        </button>
      </div>
    );
  }

  const handleOpenLikedBy = () => {
    if (!recipe) return;
    if (onOpenLikedBy) {
      onOpenLikedBy(recipe.id, recipe.title);
    } else {
      window.dispatchEvent(
        new CustomEvent('cheffork:open-liked-by', {
          detail: { recipeId: recipe.id, recipeTitle: recipe.title },
        })
      );
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (isLiking) return;
    setIsLiking(true);

    const nextLiked = !recipe.hasLiked;
    const nextCount = nextLiked ? recipe.likeCount + 1 : Math.max(0, recipe.likeCount - 1);
    setRecipe({ ...recipe, hasLiked: nextLiked, likeCount: nextCount });

    try {
      const res = await api.toggleLike(recipe.id, currentUser);
      setRecipe(prev => prev ? { ...prev, hasLiked: res.liked, likeCount: res.totalLikes } : null);
    } catch (err: any) {
      // revert
      setRecipe({ ...recipe, hasLiked: !nextLiked, likeCount: recipe.likeCount });
      showToast(err.message || 'Like failed', 'error');
    } finally {
      setIsLiking(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (currentUser.id === recipe.author_id) return;

    setFollowLoading(true);
    try {
      const res = await api.toggleFollow(recipe.author_id, currentUser);
      setIsFollowing(res.isFollowing);
      setRecipe(prev => prev ? { ...prev, isFollowingAuthor: res.isFollowing } : null);
      showToast(res.isFollowing ? `Following Chef ${recipe.author?.name}` : `Unfollowed`);
    } catch (err: any) {
      // Re-verify the actual state in the database on error
      try {
        const actualState = await api.checkIsFollowing(recipe.author_id, currentUser?.id);
        setIsFollowing(actualState);
        setRecipe(prev => prev ? { ...prev, isFollowingAuthor: actualState } : null);
      } catch {
        // ignore
      }
      showToast(err.message || 'Follow failed', 'error');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await api.addComment(recipe.id, commentText.trim(), currentUser);
      setRecipe({
        ...recipe,
        comments: [...recipe.comments, res.comment],
        commentCount: recipe.commentCount + 1
      });
      setCommentText('');
      showToast('Comment posted!');
    } catch (err: any) {
      showToast(err.message || 'Failed to add comment', 'error');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(recipe.id, commentId);
      setRecipe({
        ...recipe,
        comments: recipe.comments.filter(c => c.id !== commentId),
        commentCount: Math.max(0, recipe.commentCount - 1)
      });
      showToast('Comment deleted');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete comment', 'error');
    }
  };

  const handleStartEditComment = (comment: { id: string; content: string }) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    setIsUpdatingComment(true);
    try {
      await api.updateComment(commentId, editingCommentText.trim());
      setRecipe({
        ...recipe,
        comments: recipe.comments.map(c =>
          c.id === commentId ? { ...c, content: editingCommentText.trim() } : c
        ),
      });
      setEditingCommentId(null);
      setEditingCommentText('');
      showToast('Comment updated!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update comment', 'error');
    } finally {
      setIsUpdatingComment(false);
    }
  };

  const toggleIngredientCheck = (id: string) => {
    if (!currentUser) {
      showToast('Please log in to mark ingredients and cooking steps.', 'info');
      openAuthModal('login');
      return;
    }

    setCheckedIngredients(prev => {
      const next = {
        ...prev,
        [id]: !prev[id]
      };
      if (typeof window !== 'undefined' && recipeId && currentUser?.id) {
        try {
          sessionStorage.setItem(`cheffork_checked_ing_${currentUser.id}_${recipeId}`, JSON.stringify(next));
        } catch {
          // ignore session storage write issues
        }
      }
      return next;
    });
  };

  const toggleStepCheck = (id: string) => {
    if (!currentUser) {
      showToast('Please log in to mark ingredients and cooking steps.', 'info');
      openAuthModal('login');
      return;
    }

    setCheckedSteps(prev => {
      const next = {
        ...prev,
        [id]: !prev[id]
      };
      if (typeof window !== 'undefined' && recipeId && currentUser?.id) {
        try {
          sessionStorage.setItem(`cheffork_checked_steps_${currentUser.id}_${recipeId}`, JSON.stringify(next));
        } catch {
          // ignore session storage write issues
        }
      }
      return next;
    });
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    showToast('Recipe link copied to clipboard!');
  };

  const handleSaveToggle = async () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (!recipe || isSaving) return;

    const previousSaved = recipe.hasSaved ?? false;
    const nextSaved = !previousSaved;
    setIsSaving(true);

    try {
      if (nextSaved) {
        await api.saveRecipe(recipe.id);
        setRecipe(prev => (prev ? { ...prev, hasSaved: true } : null));
        showToast('Recipe saved to your bookmarks!');
      } else {
        await api.unsaveRecipe(recipe.id);
        setRecipe(prev => (prev ? { ...prev, hasSaved: false } : null));
        showToast('Recipe removed from bookmarks');
      }
    } catch (err: any) {
      console.error('Save toggle error:', err);
      showToast(err.message || 'Failed to update saved recipe', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const isOwner = !!(currentUser && recipe && currentUser.id === recipe.author_id);

  const handleConfirmDeleteRecipe = async () => {
    if (!recipe || !isOwner) return;
    setIsDeleting(true);
    try {
      await api.deleteRecipe(recipe.id);
      showToast('Recipe deleted successfully');
      setShowDeleteConfirm(false);
      if (onDeleteRecipe) {
        onDeleteRecipe(recipe.id);
      } else {
        onBack();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete recipe', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmRemoveMedia = async () => {
    if (!recipe || !isOwner) return;
    setIsRemovingMedia(true);
    try {
      await api.removeRecipeMedia(recipe.id);
      setRecipe(prev => (prev ? { ...prev, media: '' } : null));
      showToast('Media removed successfully');
      setShowRemoveConfirm(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove media', 'error');
    } finally {
      setIsRemovingMedia(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !recipe || !isOwner) return;
    e.target.value = '';

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(`File is too large. Max size is ${isVideo ? '100MB' : '15MB'}`, 'error');
      return;
    }

    setIsUploadingReplacement(true);
    try {
      const uploadedUrl = await api.uploadMedia(file);
      const { recipe: updatedRecipe } = await api.updateRecipeMedia(recipe.id, uploadedUrl);
      setRecipe(updatedRecipe);
      showToast('Media updated successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to update media', 'error');
    } finally {
      setIsUploadingReplacement(false);
    }
  };

  return (
    <div id="recipe-detail-page" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {/* Back Button & Top Share */}
      <div className="flex items-center justify-between mb-5">
        <BackButton id="recipe-detail-back-btn" onClick={onBack} label="Back" />

        <div className="flex items-center gap-2">
          {isOwner && onEditRecipe && (
            <button
              id="recipe-top-edit-btn"
              onClick={() => onEditRecipe(recipe)}
              className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Edit recipe details"
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Edit Recipe</span>
            </button>
          )}

          {isOwner && (
            <button
              id="recipe-top-delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-stone-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Delete recipe"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Recipe</span>
            </button>
          )}

          <button
            id="recipe-top-save-btn"
            onClick={handleSaveToggle}
            disabled={isSaving}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              recipe.hasSaved
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
            title={recipe.hasSaved ? 'Remove from saved bookmarks' : 'Bookmark recipe'}
          >
            <Bookmark className={`w-4 h-4 ${recipe.hasSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span className="hidden sm:inline">{recipe.hasSaved ? 'Saved' : 'Save'}</span>
          </button>

          <button
            id="recipe-share-btn"
            onClick={handleShare}
            className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Share link"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Hero Cover Image & Header */}
      <div className="relative aspect-16/9 sm:aspect-21/9 rounded-3xl overflow-hidden bg-stone-900 mb-6 shadow-sm flex items-center justify-center">
        {isVideoUrl(recipe.media) ? (
          <video
            src={recipe.media}
            controls
            playsInline
            className="w-full h-full object-contain"
          />
        ) : recipe.media ? (
          <>
            <img
              src={recipe.media}
              alt={recipe.title}
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full min-h-[260px] flex flex-col items-center justify-center text-stone-400 bg-stone-900 p-6 text-center">
            <ChefHat className="w-12 h-12 mb-3 opacity-40 text-stone-400" />
            <span className="text-sm font-semibold text-stone-300 mb-1">No media uploaded</span>
            <span className="text-xs text-stone-400 max-w-sm mb-4">
              {isOwner
                ? 'Attach a cover photo or cooking video to showcase your culinary creation.'
                : 'The chef has not attached a photo or cooking video to this recipe.'}
            </span>
            {isOwner && (
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <label
                  id="detail-empty-upload-photo-btn"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  {isUploadingReplacement ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )}
                  <span>{isUploadingReplacement ? 'Uploading...' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMediaUpload}
                    disabled={isUploadingReplacement}
                    className="hidden"
                  />
                </label>
                <label
                  id="detail-empty-upload-video-btn"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  {isUploadingReplacement ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                  <span>{isUploadingReplacement ? 'Uploading...' : 'Upload Cooking Video'}</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleMediaUpload}
                    disabled={isUploadingReplacement}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Owner Media Action Toolbar (when media exists) */}
        {isOwner && recipe.media && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <label
              id="detail-replace-media-btn"
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 text-xs font-bold shadow-md transition-all"
              title="Replace recipe media"
            >
              {isUploadingReplacement ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isUploadingReplacement ? 'Uploading...' : 'Replace Media'}
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                disabled={isRemovingMedia || isUploadingReplacement}
                className="hidden"
              />
            </label>
            <button
              id="detail-remove-media-btn"
              type="button"
              onClick={() => setShowRemoveConfirm(true)}
              disabled={isRemovingMedia || isUploadingReplacement}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isRemovingMedia ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>{isVideoUrl(recipe.media) ? 'Remove Video' : 'Remove Photo'}</span>
            </button>
          </div>
        )}

        {/* Hero Bottom Badges */}
        <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex flex-wrap items-center justify-between gap-3 text-white pointer-events-none">
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <Clock className="w-4 h-4 text-amber-300" />
              <span>Prep: {recipe.preparation_time}m | Cook: {recipe.cooking_time}m</span>
            </span>
            <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <Users className="w-4 h-4 text-amber-300" />
              <span>{recipe.servings} Servings</span>
            </span>
            {recipe.nutrition?.calories && (
              <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>{recipe.nutrition.calories} Calories</span>
              </span>
            )}
          </div>

          <button
            id="detail-hero-fork-btn"
            onClick={() => onForkRecipe(recipe)}
            className="pointer-events-auto px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <GitFork className="w-4 h-4" />
            <span>Fork This Recipe ({recipe.forkCount})</span>
          </button>
        </div>
      </div>

      {/* Main Recipe Info Card */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-6 sm:p-8 shadow-xs mb-8">
        {/* Fork Heritage Banner if this recipe is a fork */}
        {recipe.parentRecipe && (
          <div
            id="detail-parent-fork-banner"
            onClick={() => onOpenRecipe(recipe.parentRecipe!.id)}
            className="mb-6 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800 hover:bg-amber-100/70 dark:hover:bg-amber-900/50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 text-xs">
              <GitFork className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="text-stone-600 dark:text-stone-300">Forked from parent recipe:</span>
              <span className="font-bold text-orange-700 dark:text-orange-400 underline group-hover:text-orange-900 dark:group-hover:text-orange-300">
                "{recipe.parentRecipe.title}"
              </span>
              <span className="text-stone-500 dark:text-stone-400">by {recipe.parentRecipe.authorName || 'Chef'}</span>
            </div>
            <span className="text-[11px] font-bold text-orange-800 dark:text-orange-300 bg-orange-200/60 dark:bg-orange-900/60 px-2.5 py-0.5 rounded-full shrink-0">
              View Original Parent →
            </span>
          </div>
        )}

        {/* Title & Author Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-heading text-stone-900 dark:text-stone-100 tracking-tight mb-2">
              {recipe.title}
            </h1>

            {/* Author Profile */}
            <div
              id="detail-author-chip"
              onClick={() => onOpenProfile(recipe.author_id)}
              className="flex min-w-0 max-w-full items-center gap-3 cursor-pointer group"
            >
              <Avatar
                src={recipe.author?.avatar}
                name={recipe.author?.name || 'Chef'}
                sizeClassName="w-10 h-10"
                borderClassName="border-2 border-orange-100 dark:border-orange-900 group-hover:border-orange-400 transition-all"
              />
              <div className="min-w-0 truncate">
                <div className="truncate text-sm font-bold text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                  Chef {recipe.author?.name}
                </div>
                <div className="truncate text-xs text-stone-500 dark:text-stone-400">@{recipe.author?.username}</div>
              </div>
            </div>
          </div>

          {/* Action buttons: Follow + Like + Fork */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {(!currentUser || currentUser.id !== recipe.author_id) && (
              <button
                id="detail-follow-btn"
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isFollowing
                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                    : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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

            <div className="inline-flex items-center rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-2xs overflow-hidden">
              <button
                id="detail-like-btn"
                type="button"
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  recipe.hasLiked
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700/60'
                }`}
                title={recipe.hasLiked ? 'Unlike recipe' : 'Like recipe'}
              >
                <Heart className={`w-4 h-4 ${recipe.hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{recipe.hasLiked ? 'Liked' : 'Like'}</span>
              </button>
              <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700" />
              <button
                id="detail-like-count-btn"
                type="button"
                onClick={handleOpenLikedBy}
                className="px-3 py-2 text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-stone-50 dark:hover:bg-stone-700/60 transition-colors cursor-pointer"
                title="View who liked this recipe"
              >
                <span>{recipe.likeCount} {recipe.likeCount === 1 ? 'Like' : 'Likes'}</span>
              </button>
            </div>

            <button
              id="detail-save-btn"
              onClick={handleSaveToggle}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                recipe.hasSaved
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700'
              }`}
              title={recipe.hasSaved ? 'Remove from saved recipes' : 'Save recipe to bookmarks'}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              ) : (
                <Bookmark className={`w-4 h-4 ${recipe.hasSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
              )}
              <span>{recipe.hasSaved ? 'Saved' : 'Save'}</span>
            </button>

            {isOwner && onEditRecipe && (
              <button
                id="detail-edit-recipe-btn"
                onClick={() => onEditRecipe(recipe)}
                className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-amber-200 dark:border-amber-800 cursor-pointer"
                title="Edit recipe details and media"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Recipe</span>
              </button>
            )}

            {isOwner && (
              <button
                id="detail-delete-recipe-btn"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-rose-200 dark:border-rose-800 cursor-pointer disabled:opacity-50"
                title="Delete recipe permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-stone-700 dark:text-stone-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
          {recipe.description}
        </p>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {recipe.tags.map((tag, i) => (
              <span key={i} className="px-3 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Nutrition Bar */}
        {recipe.nutrition && (
          <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 flex flex-wrap items-center justify-around gap-4 text-center">
            <div>
              <span className="block text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Calories</span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{recipe.nutrition.calories || '—'} kcal</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Protein</span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{recipe.nutrition.protein || '—'}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Carbs</span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{recipe.nutrition.carbs || '—'}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Fat</span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{recipe.nutrition.fat || '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* LINEAGE GRAPH & COMMUNITY FORKS SECTION */}
      <div className="mb-8">
        <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-100 mb-3 flex items-center gap-2">
          <GitFork className="w-5 h-5 text-orange-600" />
          <span>Recipe Lineage & Evolution</span>
        </h2>
        <LineageGraph recipe={recipe} onSelectRecipe={onOpenRecipe} />
      </div>

      {/* Two-Column Preparation Section: Ingredients & Steps */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-10">
        {/* Ingredients (Col 1-5) */}
        <div className="md:col-span-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100 dark:border-stone-800">
            <h2 className="text-base font-bold font-heading text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Ingredients ({recipe.ingredients.length})
            </h2>
            <span className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
              Click to check off
            </span>
          </div>

          <ul className="space-y-2">
            {recipe.ingredients.map((ing) => {
              const isChecked = !!checkedIngredients[ing.id];
              return (
                <li
                  key={ing.id}
                  id={`ingredient-item-${ing.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleIngredientCheck(ing.id)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleIngredientCheck(ing.id);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer select-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 ${
                    isChecked
                      ? 'bg-stone-50 dark:bg-stone-800/60 text-stone-400 dark:text-stone-500 line-through'
                      : 'hover:bg-amber-50/60 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-300 dark:text-stone-600 shrink-0" />
                    )}
                    <span className="text-sm font-medium">{ing.name}</span>
                  </div>
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-400 shrink-0">
                    {ing.quantity} {ing.unit}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Steps (Col 6-12) */}
        <div className="md:col-span-7 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100 dark:border-stone-800">
            <h2 className="text-base font-bold font-heading text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Preparation & Cooking Steps ({recipe.steps.length})
            </h2>
            <span className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
              Click to check off
            </span>
          </div>

          <ol className="space-y-3">
            {recipe.steps.map((step) => {
              const isChecked = !!checkedSteps[step.id];
              return (
                <li
                  key={step.id}
                  id={`cooking-step-${step.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleStepCheck(step.id)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleStepCheck(step.id);
                    }
                  }}
                  className={`flex items-start gap-3.5 p-3 rounded-2xl cursor-pointer select-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 ${
                    isChecked
                      ? 'bg-stone-50 dark:bg-stone-800/60 text-stone-400 dark:text-stone-500'
                      : 'hover:bg-amber-50/60 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs transition-colors ${
                      isChecked
                        ? 'bg-emerald-600 text-white'
                        : 'bg-orange-600 text-white'
                    }`}
                  >
                    {isChecked ? (
                      <Check className="w-4 h-4 text-white stroke-[2.5]" />
                    ) : (
                      step.step_number
                    )}
                  </span>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p
                      className={`text-sm leading-relaxed font-normal transition-colors ${
                        isChecked ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-800 dark:text-stone-200'
                      }`}
                    >
                      {step.instruction}
                    </p>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-300 dark:text-stone-600 shrink-0" />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* COMMENTS & COMMUNITY FEEDBACK SECTION */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-6 sm:p-8 shadow-2xs">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-5 h-5 text-orange-600" />
          <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-100">
            Chef Comments & Kitchen Notes ({recipe.comments.length})
          </h2>
        </div>

        {/* Add comment box */}
        <form onSubmit={handleAddComment} className="mb-8">
          <div className="flex gap-3">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt="You"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-stone-200 dark:ring-stone-700 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-bold flex items-center justify-center text-xs ring-2 ring-stone-200 dark:ring-stone-700 shrink-0">
                {currentUser?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1">
              <textarea
                id="comment-input-textarea"
                rows={2}
                placeholder={
                  currentUser
                    ? 'Share how your cook turned out, or suggestions for forks...'
                    : 'Log in to join the conversation and leave kitchen notes...'
                }
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={!currentUser}
                className="w-full px-4 py-2.5 rounded-2xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:bg-stone-50 dark:disabled:bg-stone-800/50"
              />
              <div className="mt-2 flex justify-end">
                {currentUser ? (
                  <button
                    id="submit-comment-btn"
                    type="submit"
                    disabled={isSubmittingComment || !commentText.trim()}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post Note</span>
                  </button>
                ) : (
                  <button
                    id="login-to-comment-btn"
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer"
                  >
                    Log In to Comment
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Comment list */}
        {recipe.comments.length === 0 ? (
          <div id="no-comments-empty" className="text-center py-8 text-stone-400 dark:text-stone-500 text-xs">
            No notes on this recipe yet. Be the first home chef to leave one!
          </div>
        ) : (
          <div className="space-y-4">
            {recipe.comments.map((comment) => (
              <div
                key={comment.id}
                id={`comment-item-${comment.id}`}
                className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-stone-50/70 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {comment.author?.avatar ? (
                    <img
                      src={comment.author.avatar}
                      alt={comment.author?.name || 'Cook'}
                      className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      {comment.author?.name?.[0]?.toUpperCase() || 'C'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{comment.author?.name || 'Home Cook'}</span>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400">@{comment.author?.username || 'cook'}</span>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          id={`edit-comment-input-${comment.id}`}
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                          rows={2}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            id={`save-comment-btn-${comment.id}`}
                            onClick={() => handleSaveEditComment(comment.id)}
                            disabled={isUpdatingComment || !editingCommentText.trim()}
                            className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                          <button
                            id={`cancel-comment-btn-${comment.id}`}
                            onClick={handleCancelEditComment}
                            className="px-2.5 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
                        {comment.content}
                      </p>
                    )}
                  </div>
                </div>

                {currentUser && currentUser.id === comment.user_id && editingCommentId !== comment.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      id={`edit-comment-btn-${comment.id}`}
                      onClick={() => handleStartEditComment(comment)}
                      className="p-1.5 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                      title="Edit your comment"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-comment-btn-${comment.id}`}
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete your comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remove Media Confirmation Modal */}
      {showRemoveConfirm && recipe && (
        <div
          id="remove-media-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => !isRemovingMedia && setShowRemoveConfirm(false)}
        >
          <div
            id="remove-media-modal"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-heading text-stone-900 dark:text-stone-100">
                  Remove this media?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  From "{recipe.title}"
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Are you sure you want to remove this photo/video from the recipe?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="cancel-remove-media-btn"
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={isRemovingMedia}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-remove-media-btn"
                type="button"
                onClick={handleConfirmRemoveMedia}
                disabled={isRemovingMedia}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isRemovingMedia ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Remove</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Recipe Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          id="delete-recipe-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setShowDeleteConfirm(false)}
        >
          <div
            id="delete-recipe-modal"
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-heading text-stone-900 dark:text-stone-100">
                  Delete Recipe
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1">
                  "{recipe?.title}"
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Are you sure you want to delete this recipe? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="cancel-delete-recipe-btn"
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-recipe-btn"
                type="button"
                onClick={handleConfirmDeleteRecipe}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Recipe</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
