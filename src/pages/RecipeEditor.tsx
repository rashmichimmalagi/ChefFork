import React, { useState, useEffect } from 'react';
import { Recipe, Ingredient, RecipeStep, NutritionInfo } from '../types';
import { api, isVideoUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { BackButton } from '../components/BackButton';
import confetti from 'canvas-confetti';
import {
  GitFork,
  Plus,
  Trash2,
  Clock,
  Users,
  Image as ImageIcon,
  Sparkles,
  ArrowLeft,
  Flame,
  CheckCircle2,
  Eye,
  Send,
  Upload,
  Video,
  ChefHat,
  Loader2,
  Edit2
} from 'lucide-react';

interface RecipeEditorProps {
  forkParentRecipe?: Recipe | null;
  editingRecipe?: Recipe | null;
  onCancel: () => void;
  onPublished: (publishedRecipe: Recipe) => void;
  onOpenRecipe: (id: string) => void;
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({
  forkParentRecipe,
  editingRecipe,
  onCancel,
  onPublished,
  onOpenRecipe
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const isFork = !!forkParentRecipe;
  const isEdit = !!editingRecipe;

  // Initial form values pre-populated if editing or forking
  const [title, setTitle] = useState(
    editingRecipe
      ? editingRecipe.title
      : (forkParentRecipe ? `Twist on ${forkParentRecipe.title}` : '')
  );
  const [description, setDescription] = useState(
    editingRecipe
      ? (editingRecipe.description || '')
      : (forkParentRecipe
          ? `Forked from Chef ${forkParentRecipe.author?.name || 'original'}'s recipe. Here is my variation:`
          : '')
  );
  const [media, setMedia] = useState(
    editingRecipe
      ? (editingRecipe.media || '')
      : (forkParentRecipe?.media || '')
  );
  const [prepTime, setPrepTime] = useState<number | ''>(
    editingRecipe ? editingRecipe.preparation_time : (forkParentRecipe?.preparation_time || '')
  );
  const [cookTime, setCookTime] = useState<number | ''>(
    editingRecipe ? editingRecipe.cooking_time : (forkParentRecipe?.cooking_time || '')
  );
  const [servings, setServings] = useState<number | ''>(
    editingRecipe ? editingRecipe.servings : (forkParentRecipe?.servings || '')
  );
  const [tagInput, setTagInput] = useState<string>(
    editingRecipe?.tags
      ? editingRecipe.tags.join(', ')
      : (forkParentRecipe?.tags ? forkParentRecipe.tags.join(', ') : '')
  );

  // Nutrition
  const initialNutrition = editingRecipe?.nutrition || forkParentRecipe?.nutrition;
  const [calories, setCalories] = useState<number | ''>(
    initialNutrition?.calories !== undefined ? initialNutrition.calories : ''
  );
  const [protein, setProtein] = useState<string>(
    initialNutrition?.protein || ''
  );
  const [carbs, setCarbs] = useState<string>(
    initialNutrition?.carbs || ''
  );
  const [fat, setFat] = useState<string>(
    initialNutrition?.fat || ''
  );

  // Ingredients (cloned from editingRecipe, or parent if forking, or blank row if new)
  const initialIngredients = editingRecipe?.ingredients?.length
    ? editingRecipe.ingredients.map(i => ({ ...i, id: Math.random().toString(36).substring(2, 9) }))
    : (forkParentRecipe?.ingredients?.length
        ? forkParentRecipe.ingredients.map(i => ({ ...i, id: Math.random().toString(36).substring(2, 9) }))
        : [{ id: '1', name: '', quantity: '', unit: '' }]);

  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);

  // Cooking Steps
  const initialSteps = editingRecipe?.steps?.length
    ? editingRecipe.steps.map(s => ({ ...s, id: Math.random().toString(36).substring(2, 9) }))
    : (forkParentRecipe?.steps?.length
        ? forkParentRecipe.steps.map(s => ({ ...s, id: Math.random().toString(36).substring(2, 9) }))
        : [{ id: '1', step_number: 1, instruction: '' }]);

  const [steps, setSteps] = useState<RecipeStep[]>(initialSteps);

  // Ensure full post data is loaded from InsForge and ownership is strictly verified
  useEffect(() => {
    if (editingRecipe?.id) {
      if (currentUser?.id) {
        const ownerId = editingRecipe.author_id || editingRecipe.author?.id;
        if (ownerId && ownerId !== currentUser.id) {
          showToast('Unauthorized: You can only edit recipes you own', 'error');
          onCancel();
          return;
        }
      }

      let isCancelled = false;
      const loadFreshRecipeData = async () => {
        try {
          const { recipe: fresh } = await api.getRecipe(editingRecipe.id);
          if (isCancelled || !fresh) return;

          if (currentUser?.id && fresh.author_id && fresh.author_id !== currentUser.id) {
            showToast('Unauthorized: You can only edit recipes you own', 'error');
            onCancel();
            return;
          }

          setTitle(fresh.title || '');
          setDescription(fresh.description || '');
          setMedia(fresh.media || '');
          setPrepTime(fresh.preparation_time !== undefined ? fresh.preparation_time : '');
          setCookTime(fresh.cooking_time !== undefined ? fresh.cooking_time : '');
          setServings(fresh.servings !== undefined ? fresh.servings : '');
          setTagInput(fresh.tags ? fresh.tags.join(', ') : '');

          const n = fresh.nutrition || {};
          setCalories(n.calories !== undefined ? n.calories : '');
          setProtein(n.protein || '');
          setCarbs(n.carbs || '');
          setFat(n.fat || '');

          if (fresh.ingredients && fresh.ingredients.length > 0) {
            setIngredients(
              fresh.ingredients.map(i => ({
                id: i.id || Math.random().toString(36).substring(2, 9),
                name: i.name,
                quantity: i.quantity !== undefined ? String(i.quantity) : '',
                unit: i.unit || '',
              }))
            );
          }

          if (fresh.steps && fresh.steps.length > 0) {
            setSteps(
              fresh.steps.map((s, idx) => ({
                id: s.id || Math.random().toString(36).substring(2, 9),
                step_number: s.step_number || idx + 1,
                instruction: s.instruction,
              }))
            );
          }
        } catch (err: any) {
          console.warn('Could not refresh editing recipe from InsForge:', err);
        }
      };

      loadFreshRecipeData();
      return () => {
        isCancelled = true;
      };
    }
  }, [editingRecipe?.id, currentUser?.id]);

  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState<boolean>(false);
  const [isRemovingMedia, setIsRemovingMedia] = useState<boolean>(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemoveMedia = async () => {
    if (!media) return;
    setIsRemovingMedia(true);
    try {
      if (isEdit && editingRecipe) {
        await api.removeRecipeMedia(editingRecipe.id);
        setMedia('');
        showToast('Media removed successfully');
      } else {
        await api.deleteDraftMedia(media);
        setMedia('');
        showToast('Media removed successfully');
      }
      setShowRemoveConfirm(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove media', 'error');
    } finally {
      setIsRemovingMedia(false);
    }
  };

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPEG, PNG, WebP)', 'error');
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const uploadedUrl = await api.uploadMedia(file);
      if (isEdit && editingRecipe) {
        await api.updateRecipeMedia(editingRecipe.id, uploadedUrl);
        setMedia(uploadedUrl);
        showToast('Media updated successfully');
      } else {
        setMedia(uploadedUrl);
        showToast('Photo uploaded to InsForge Storage!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      showToast('Please select a valid video file (MP4, WebM, MOV)', 'error');
      return;
    }
    setIsUploadingVideo(true);
    try {
      const uploadedUrl = await api.uploadMedia(file);
      if (isEdit && editingRecipe) {
        await api.updateRecipeMedia(editingRecipe.id, uploadedUrl);
        setMedia(uploadedUrl);
        showToast('Media updated successfully');
      } else {
        setMedia(uploadedUrl);
        showToast('Cooking video uploaded to InsForge Storage!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload cooking video', 'error');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  // Ingredient Handlers
  const addIngredient = () => {
    setIngredients(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), name: '', quantity: '', unit: '' }
    ]);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    setIngredients(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) {
      showToast('A recipe needs at least one ingredient', 'info');
      return;
    }
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // Step Handlers
  const addStep = () => {
    setSteps(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), step_number: prev.length + 1, instruction: '' }
    ]);
  };

  const updateStep = (index: number, text: string) => {
    setSteps(prev => {
      const next = [...prev];
      next[index] = { ...next[index], instruction: text };
      return next;
    });
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      showToast('A recipe needs at least one step', 'info');
      return;
    }
    setSteps(prev =>
      prev.filter((_, i) => i !== index).map((s, idx) => ({ ...s, step_number: idx + 1 }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Please provide a recipe title');
      return;
    }

    const validIngredients = ingredients.filter(i => i.name.trim().length > 0);
    if (validIngredients.length === 0) {
      setError('Please add at least one valid ingredient');
      return;
    }

    const validSteps = steps.filter(s => s.instruction.trim().length > 0);
    if (validSteps.length === 0) {
      setError('Please add at least one cooking instruction step');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagInput
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const nutritionObj: NutritionInfo = {};
      if (calories !== '' && !isNaN(Number(calories))) nutritionObj.calories = Number(calories);
      if (protein.trim()) nutritionObj.protein = protein.trim();
      if (carbs.trim()) nutritionObj.carbs = carbs.trim();
      if (fat.trim()) nutritionObj.fat = fat.trim();

      if (isEdit && editingRecipe) {
        const res = await api.updateRecipe(editingRecipe.id, {
          title: title.trim(),
          description: description.trim(),
          media: media.trim(),
          ingredients: validIngredients,
          steps: validSteps.map((s, idx) => ({ ...s, step_number: idx + 1 })),
          preparation_time: Number(prepTime) || 0,
          cooking_time: Number(cookTime) || 0,
          servings: Number(servings) || 1,
          nutrition: nutritionObj,
          tags: parsedTags,
        });

        showToast('🎉 Recipe updated successfully!');
        onPublished(res.recipe);
        return;
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        media: media.trim(),
        ingredients: validIngredients,
        steps: validSteps.map((s, idx) => ({ ...s, step_number: idx + 1 })),
        preparation_time: Number(prepTime) || 0,
        cooking_time: Number(cookTime) || 0,
        servings: Number(servings) || 1,
        nutrition: nutritionObj,
        tags: parsedTags,
        parent_recipe_id: forkParentRecipe ? forkParentRecipe.id : null,
        authorProfile: currentUser || undefined,
      };

      const res = await api.createRecipe(payload);

      // Celebrate fork / recipe creation!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // silent
      }

      showToast(isFork ? '🎉 Fork published with preserved lineage!' : '🎉 Recipe published to the community!');
      onPublished(res.recipe);
    } catch (err: any) {
      setError(err.message || 'Failed to publish recipe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="recipe-editor-container" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {/* Top Bar / Back */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <BackButton id="editor-back-btn" onClick={onCancel} label="Cancel & Exit" />

        <div className="flex items-center gap-2">
          <button
            id="editor-toggle-preview"
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              previewMode
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewMode ? 'Edit Mode' : 'Preview Recipe'}</span>
          </button>
        </div>
      </div>

      {/* Editing Recipe Banner */}
      {isEdit && editingRecipe && (
        <div id="edit-notice-banner" className="mb-6 p-4.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-2 border-amber-300 dark:border-amber-800 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Edit2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                Edit Recipe Mode
              </span>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                Editing "{editingRecipe.title}"
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-relaxed">
                Update recipe details, remove or replace your cover photo/cooking video, or modify ingredients and steps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forking Parent Lineage Banner */}
      {isFork && (
        <div id="fork-notice-banner" className="mb-6 p-4.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-2 border-orange-300 dark:border-orange-800 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <GitFork className="w-5 h-5 rotate-180" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold uppercase tracking-wider text-orange-900 dark:text-orange-300">
                  Forking Recipe Mode
                </span>
                <span className="text-[11px] bg-orange-200/80 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200 px-2 py-0.5 rounded-full font-bold">
                  Preserving Lineage
                </span>
              </div>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1">
                Branching from "{forkParentRecipe.title}" by Chef {forkParentRecipe.author?.name}
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-relaxed">
                Adjust ingredients (e.g. switch proteins, adjust dairy), adapt spice levels, or refine cooking steps. The original recipe stays untouched, and your fork will proudly reference this parent.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div id="editor-error-banner" className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* PREVIEW VIEW */}
      {previewMode ? (
        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                {isFork ? 'Forked Recipe Preview' : 'New Recipe Preview'}
              </span>
              <h2 className="text-2xl font-bold font-heading text-stone-900 dark:text-stone-100 mt-1">
                {title || 'Untitled Recipe'}
              </h2>
            </div>
            <div className="text-xs text-stone-500 dark:text-stone-400">By Chef {currentUser?.name}</div>
          </div>

          <div className="aspect-16/9 rounded-2xl overflow-hidden bg-stone-900 flex items-center justify-center">
            {media ? (
              isVideoUrl(media) ? (
                <video src={media} controls playsInline className="w-full h-full object-contain" />
              ) : (
                <img src={media} alt={title} className="w-full h-full object-cover" />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-stone-400 p-6 text-center">
                <ImageIcon className="w-10 h-10 mb-2 opacity-40 text-stone-400" />
                <span className="text-xs">No media uploaded yet. Use the buttons below to attach a photo or video.</span>
              </div>
            )}
          </div>

          <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed">{description || 'No description provided.'}</p>

          <div className="grid grid-cols-3 gap-3 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-center">
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Prep Time</div>
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{prepTime} mins</div>
            </div>
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Cook Time</div>
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{cookTime} mins</div>
            </div>
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Servings</div>
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{servings}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-3">Ingredients</h3>
              <ul className="space-y-2 text-sm text-stone-700 dark:text-stone-300">
                {ingredients.filter(i => i.name.trim()).map((ing, i) => (
                  <li key={i} className="flex items-center justify-between py-1 border-b border-stone-100 dark:border-stone-800">
                    <span>{ing.name}</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">{ing.quantity} {ing.unit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-3">Preparation Steps</h3>
              <ol className="space-y-3">
                {steps.filter(s => s.instruction.trim()).map((s, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-stone-700 dark:text-stone-300">
                    <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{s.instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isFork ? 'Publish This Fork' : 'Publish Recipe'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* FORM EDITING VIEW */
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Information */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-6 sm:p-8 shadow-2xs space-y-5">
            <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span>1. Basic Recipe Details</span>
            </h2>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                Recipe Title *
              </label>
              <input
                id="recipe-title-input"
                type="text"
                required
                placeholder="Enter recipe title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                Description / Culinary Story
              </label>
              <textarea
                id="recipe-description-input"
                rows={3}
                placeholder="Enter recipe description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Cover Photo or Cooking Video Upload */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  Recipe Media (Photo or Cooking Video)
                </label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold cursor-pointer transition-colors">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFile}
                      disabled={isUploadingPhoto || isUploadingVideo}
                      className="hidden"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-900 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-xs font-semibold cursor-pointer transition-colors">
                    <Video className="w-3.5 h-3.5 text-orange-700 dark:text-orange-400" />
                    <span>{isUploadingVideo ? 'Uploading...' : 'Upload Cooking Video'}</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFile}
                      disabled={isUploadingPhoto || isUploadingVideo}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="recipe-media-input"
                  type="url"
                  placeholder="Upload a recipe photo or cooking video"
                  value={media}
                  onChange={(e) => setMedia(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>

              {media ? (
                <div className="mt-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-stone-900 overflow-hidden shrink-0 flex items-center justify-center border border-stone-200 dark:border-stone-700 shadow-2xs">
                      {isVideoUrl(media) ? (
                        <video src={media} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={media} alt="Recipe media preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-200">
                        {isVideoUrl(media) ? (
                          <>
                            <Video className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                            <span>Cooking Video Attached</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Recipe Photo Attached</span>
                          </>
                        )}
                      </div>
                      <span className="text-stone-400 dark:text-stone-500 font-mono text-[11px] block truncate max-w-xs sm:max-w-md mt-0.5">
                        {media}
                      </span>
                    </div>
                  </div>

                  <button
                    id="editor-remove-media-btn"
                    type="button"
                    onClick={() => {
                      if (isEdit && editingRecipe) {
                        setShowRemoveConfirm(true);
                      } else {
                        handleRemoveMedia();
                      }
                    }}
                    disabled={isRemovingMedia || isUploadingPhoto || isUploadingVideo}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {isRemovingMedia ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isVideoUrl(media) ? 'Remove Video' : 'Remove Photo'}</span>
                  </button>
                </div>
              ) : (
                <div className="mt-2.5 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-dashed border-stone-300 dark:border-stone-700 flex items-center gap-2.5 text-xs text-stone-500 dark:text-stone-400">
                  <ChefHat className="w-4 h-4 text-stone-400 shrink-0" />
                  <span>No media attached. Choose a photo or cooking video above to upload.</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Ingredients */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-6 sm:p-8 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-100">
                  2. Ingredients List
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Specify ingredients and precise quantities for fellow home chefs
                </p>
              </div>
              <button
                id="add-ingredient-btn"
                type="button"
                onClick={addIngredient}
                className="px-3.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 text-xs font-bold border border-orange-200 dark:border-orange-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Ingredient</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs text-stone-400 font-bold w-5 text-right">{idx + 1}.</span>
                  <input
                    id={`ingredient-name-${idx}`}
                    type="text"
                    placeholder="Enter ingredient"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                    className="flex-3 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    id={`ingredient-qty-${idx}`}
                    type="text"
                    placeholder="Enter quantity"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    id={`ingredient-unit-${idx}`}
                    type="text"
                    placeholder="Enter unit"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    className="p-2 text-stone-400 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                    title="Remove ingredient"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Cooking Specs & Steps */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-6 sm:p-8 shadow-2xs space-y-6">
            <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-100">
              3. Cooking Metrics & Step-by-Step Instructions
            </h2>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                  Prep Time (Mins)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    id="recipe-preptime-input"
                    type="number"
                    min="1"
                    placeholder="Enter prep time"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                  Cook Time (Mins)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    id="recipe-cooktime-input"
                    type="number"
                    min="0"
                    placeholder="Enter cook time"
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                  Servings
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    id="recipe-servings-input"
                    type="number"
                    min="1"
                    placeholder="Enter servings"
                    value={servings}
                    onChange={(e) => setServings(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Cooking Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Step-by-Step Instructions
                </span>
                <button
                  id="add-step-btn"
                  type="button"
                  onClick={addStep}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 text-xs font-bold border border-orange-200 dark:border-orange-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="space-y-3">
                {steps.map((step, idx) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center justify-center shrink-0 mt-1">
                      {idx + 1}
                    </span>
                    <textarea
                      id={`step-instruction-${idx}`}
                      rows={2}
                      placeholder="Enter cooking instruction"
                      value={step.instruction}
                      onChange={(e) => updateStep(idx, e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="p-2 text-stone-400 hover:text-rose-600 transition-colors shrink-0 mt-1 cursor-pointer"
                      title="Remove step"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Tags & Nutrition */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/90 dark:border-stone-800 p-6 sm:p-8 shadow-2xs space-y-5">
            <h2 className="text-lg font-bold font-heading text-stone-900 dark:text-stone-100">
              4. Categories & Nutrition (Per Serving)
            </h2>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1.5">
                Categories / Tags (comma-separated)
              </label>
              <input
                id="recipe-tags-input"
                type="text"
                placeholder="Enter categories or tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Calories (kcal)</label>
                <input
                  type="number"
                  placeholder="Enter calories"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Protein</label>
                <input
                  type="text"
                  placeholder="Enter protein"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Carbs</label>
                <input
                  type="text"
                  placeholder="Enter carbs"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">Fat</label>
                <input
                  type="text"
                  placeholder="Enter fat"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Submission Bar */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-md">
            <button
              id="editor-preview-bottom-btn"
              type="button"
              onClick={() => setPreviewMode(true)}
              className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Preview Recipe</span>
            </button>

            <button
              id="publish-recipe-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    {isEdit
                      ? 'Save Changes'
                      : (isFork ? 'Publish Forked Recipe' : 'Publish to Community')}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Remove Media Confirmation Modal (when editing a published recipe) */}
      {showRemoveConfirm && (
        <div
          id="editor-remove-media-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => !isRemovingMedia && setShowRemoveConfirm(false)}
        >
          <div
            id="editor-remove-media-modal"
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
                  {isEdit && editingRecipe ? `Recipe: "${editingRecipe.title}"` : 'Current recipe draft'}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Are you sure you want to remove this photo/video from the recipe?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="cancel-editor-remove-media-btn"
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={isRemovingMedia}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-editor-remove-media-btn"
                type="button"
                onClick={handleRemoveMedia}
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
    </div>
  );
};
