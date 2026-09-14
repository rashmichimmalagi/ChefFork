-- ==============================================================================
-- ChefConnect / ChefFork PostgreSQL Hardened Schema for InsForge
-- Project URL: https://did2k7x3.ap-southeast.insforge.app/
-- Run this script in the InsForge SQL Editor (Database -> SQL Editor)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. Tables Creation
-- ==============================================================================

-- Profiles: tied to InsForge auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipes: contains parent_recipe_id for infinite forking / lineage tracking
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  media TEXT DEFAULT '',
  preparation_time INTEGER DEFAULT 0,
  cooking_time INTEGER DEFAULT 0,
  servings INTEGER DEFAULT 1,
  nutrition JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}'::text[],
  parent_recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe Ingredients: order-indexed ingredients for a recipe
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0
);

-- Recipe Steps: numbered instructions for a recipe
CREATE TABLE IF NOT EXISTS public.recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL
);

-- Likes: unique per recipe and user
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_recipe_like UNIQUE(recipe_id, user_id)
);

-- Comments: discussion threads per recipe
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follows: social graph between chefs
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_follow UNIQUE(follower_id, following_id)
);

-- Notifications: activity feed for likes, comments, forks, and follows
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. Performance Indexes
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_recipes_author ON public.recipes(author_id);
CREATE INDEX IF NOT EXISTS idx_recipes_parent ON public.recipes(parent_recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created ON public.recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe ON public.recipe_steps(recipe_id);
CREATE INDEX IF NOT EXISTS idx_likes_recipe ON public.likes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_recipe ON public.comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- ==============================================================================
-- 3. Enable Row Level Security (RLS) on all tables
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. Granular Role Grants (Least Privilege)
-- ==============================================================================

-- Anon (unauthenticated) role: ONLY SELECT on public data; NO access to notifications or write operations
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.recipes TO anon;
GRANT SELECT ON public.recipe_ingredients TO anon;
GRANT SELECT ON public.recipe_steps TO anon;
GRANT SELECT ON public.likes TO anon;
GRANT SELECT ON public.comments TO anon;
GRANT SELECT ON public.follows TO anon;

-- Authenticated role: SELECT and mutation permissions governed strictly by RLS policies below
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Revoke all default table writes from anon
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;

-- ==============================================================================
-- 5. Row Level Security Policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Public read: Anyone (anon or authenticated) can view chef public profiles
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

-- Insert: Users can only create their own profile matching auth.uid()
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update: Users can only modify their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Delete: Users can only delete their own profile
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- RECIPES POLICIES
-- ------------------------------------------------------------------------------
-- Public read: Anyone can browse public recipes and their lineage
CREATE POLICY "recipes_select_public"
  ON public.recipes FOR SELECT
  USING (true);

-- Insert: Authenticated users can publish recipes where author_id is their own UID
CREATE POLICY "recipes_insert_authenticated"
  ON public.recipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Update: Only the recipe author can update their recipe
CREATE POLICY "recipes_update_owner"
  ON public.recipes FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Delete: Only the recipe author can delete their recipe
CREATE POLICY "recipes_delete_owner"
  ON public.recipes FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- ------------------------------------------------------------------------------
-- RECIPE INGREDIENTS POLICIES
-- ------------------------------------------------------------------------------
-- Public read: Ingredients are readable with the recipe
CREATE POLICY "recipe_ingredients_select_public"
  ON public.recipe_ingredients FOR SELECT
  USING (true);

-- Insert: Only the owner of the recipe can add ingredients
CREATE POLICY "recipe_ingredients_insert_owner"
  ON public.recipe_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.author_id = auth.uid()
    )
  );

-- Update: Only the owner of the recipe can modify ingredients
CREATE POLICY "recipe_ingredients_update_owner"
  ON public.recipe_ingredients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.author_id = auth.uid()
    )
  );

-- Delete: Only the owner of the recipe can delete ingredients
CREATE POLICY "recipe_ingredients_delete_owner"
  ON public.recipe_ingredients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_ingredients.recipe_id
        AND recipes.author_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- RECIPE STEPS POLICIES
-- ------------------------------------------------------------------------------
-- Public read: Steps are readable with the recipe
CREATE POLICY "recipe_steps_select_public"
  ON public.recipe_steps FOR SELECT
  USING (true);

-- Insert: Only the owner of the recipe can add steps
CREATE POLICY "recipe_steps_insert_owner"
  ON public.recipe_steps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_steps.recipe_id
        AND recipes.author_id = auth.uid()
    )
  );

-- Update: Only the owner of the recipe can modify steps
CREATE POLICY "recipe_steps_update_owner"
  ON public.recipe_steps FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_steps.recipe_id
        AND recipes.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_steps.recipe_id
        AND recipes.author_id = auth.uid()
    )
  );

-- Delete: Only the owner of the recipe can delete steps
CREATE POLICY "recipe_steps_delete_owner"
  ON public.recipe_steps FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_steps.recipe_id
        AND recipes.author_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- LIKES POLICIES
-- ------------------------------------------------------------------------------
-- Public read: Likes are visible to show like counts and community engagement
CREATE POLICY "likes_select_public"
  ON public.likes FOR SELECT
  USING (true);

-- Insert: Users can only create likes for themselves (user_id = auth.uid())
CREATE POLICY "likes_insert_own"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Delete: Users can only delete/unlike their own likes
CREATE POLICY "likes_delete_own"
  ON public.likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- COMMENTS POLICIES
-- ------------------------------------------------------------------------------
-- Public read: Comments are visible under recipes
CREATE POLICY "comments_select_public"
  ON public.comments FOR SELECT
  USING (true);

-- Insert: Users can only post comments authored by themselves (user_id = auth.uid())
CREATE POLICY "comments_insert_own"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update: Users can only edit their own comments
CREATE POLICY "comments_update_own"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete: Users can only delete their own comments
CREATE POLICY "comments_delete_own"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- FOLLOWS POLICIES
-- ------------------------------------------------------------------------------
-- Public read: Social relationships and counts are publicly readable
CREATE POLICY "follows_select_public"
  ON public.follows FOR SELECT
  USING (true);

-- Insert: Users can only follow others as themselves (follower_id = auth.uid())
CREATE POLICY "follows_insert_own"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

-- Delete: Users can only unfollow relationships they created (follower_id = auth.uid())
CREATE POLICY "follows_delete_own"
  ON public.follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- ------------------------------------------------------------------------------
-- NOTIFICATIONS POLICIES
-- ------------------------------------------------------------------------------
-- Select: Users can ONLY read notifications addressed to them (user_id = auth.uid())
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert: Authenticated users can dispatch notifications where sender_id is their own UID
CREATE POLICY "notifications_insert_sender"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Update: Users can mark their own notifications as read
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete: Users can dismiss/delete their own notifications
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
