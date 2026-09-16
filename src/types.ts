export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string;
  avatar: string;
  createdAt: string;
}

export interface UserStats {
  recipesCount: number;
  forksCount: number;
  followersCount: number;
  followingCount: number;
  savedCount?: number;
  totalPosts?: number;
  isFollowing?: boolean;
}

export interface FollowerChef extends User {
  recipesCount?: number;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface RecipeStep {
  id: string;
  step_number: number;
  instruction: string;
}

export interface NutritionInfo {
  calories?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
}

export interface ParentRecipeSummary {
  id: string;
  title: string;
  description?: string;
  media?: string;
  authorName?: string;
  author?: User | null;
}

export interface Recipe {
  id: string;
  author_id: string;
  title: string;
  description: string;
  media: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  preparation_time: number;
  cooking_time: number;
  servings: number;
  nutrition?: NutritionInfo;
  tags: string[];
  parent_recipe_id: string | null;
  created_at: string;
  updated_at: string;
  author: User;
  likeCount: number;
  commentCount: number;
  forkCount: number;
  hasLiked: boolean;
  hasSaved?: boolean;
  isFollowingAuthor?: boolean;
  parentRecipe?: ParentRecipeSummary | null;
}

export interface Comment {
  id: string;
  recipe_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: User | null;
}

export interface RecipeDetailData extends Recipe {
  comments: Comment[];
  directForks: {
    id: string;
    title: string;
    description: string;
    media: string;
    author: User;
    createdAt: string;
  }[];
  ancestors: {
    id: string;
    title: string;
    authorName: string;
    created_at: string;
  }[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  sender_id: string;
  type: 'like' | 'comment' | 'fork' | 'follow';
  recipe_id?: string;
  recipeTitle?: string;
  message: string;
  read: boolean;
  created_at: string;
  sender: User;
}

export interface RecipeSearchParams {
  search?: string;
  tag?: string;
  tags?: string[];
  maxTotalTime?: number;
  maxCalories?: number;
  servingsRange?: '1-2' | '3-4' | '5+' | 'all';
  author_id?: string;
  authorId?: string;
  only_forks?: boolean;
  sort?: 'popular' | 'forked' | 'recent' | 'quickest' | 'calories' | string;
  tab?: string;
  limit?: number;
}

export interface ExploreFilterState {
  searchQuery: string;
  selectedCategory: string;
  selectedTags: string[];
  maxTotalTime?: number;
  maxCalories?: number;
  servingsRange: '1-2' | '3-4' | '5+' | 'all';
  forkFilter: 'all' | 'original' | 'forks';
  sortBy: 'popular' | 'forked' | 'recent' | 'quickest' | 'calories';
}

export type ActivePage = 'intro' | 'landing' | 'feed' | 'explore' | 'create' | 'recipe' | 'profile' | 'notifications' | 'reset-password' | 'following' | 'saved';
