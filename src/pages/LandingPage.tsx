import React, { useEffect, useState } from 'react';
import { ChefHat, GitFork, Heart, Sparkles, Clock, Compass, ArrowRight, ArrowLeft, Info } from 'lucide-react';
import { Recipe } from '../types';
import { api, isVideoUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';

interface LandingPageProps {
  onOpenRecipe: (id: string) => void;
  onExplore: () => void;
  onBackToIntro?: () => void;
  onNavigateAbout?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenRecipe,
  onExplore,
  onBackToIntro,
  onNavigateAbout,
}) => {
  const { openAuthModal } = useAuth();
  const [featuredRecipes, setFeaturedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    api.getRecipes({ sort: 'popular', limit: 6 })
      .then((res) => {
        if (isMounted) setFeaturedRecipes(res.recipes || []);
      })
      .catch((err) => console.warn('Could not load landing featured recipes:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div id="landing-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 pb-28">
      {/* Top Navigation Row: Subtle Back to Intro button */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        {onBackToIntro ? (
          <button
            type="button"
            id="landing-back-to-intro-btn"
            onClick={onBackToIntro}
            title="Back to Intro"
            aria-label="Back to Intro"
            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-orange-600 dark:hover:text-orange-400 border border-stone-200 dark:border-stone-800 shadow-xs text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-stone-500 dark:text-stone-400 group-hover:text-orange-500" />
            <span>Back to Intro</span>
          </button>
        ) : <div />}

        {onNavigateAbout && (
          <button
            type="button"
            id="landing-top-about-btn"
            onClick={onNavigateAbout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-stone-600 dark:text-stone-300 hover:text-orange-600 dark:hover:text-orange-400 text-xs sm:text-sm font-semibold hover:bg-white dark:hover:bg-stone-900 border border-transparent hover:border-stone-200 dark:hover:border-stone-800 transition-all cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span>About</span>
          </button>
        )}
      </div>

      {/* Hero Section: Clean Non-Video Background */}
      <section
        id="landing-hero-section"
        className="relative rounded-3xl overflow-hidden mb-16 md:mb-24 shadow-2xl border border-stone-200/90 dark:border-stone-800 bg-stone-950"
      >
        {/* Background Gradient & Glow Layers (Non-Video) */}
        <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-stone-900 to-orange-950/40 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Foreground Content */}
        <div className="relative z-10 p-6 sm:p-10 md:p-14 lg:p-16 max-w-3xl text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 text-xs font-semibold mb-6 backdrop-blur-sm">
            <ChefHat className="w-3.5 h-3.5 text-orange-400" />
            <span>The Open Kitchen for Home Chefs</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.12] drop-shadow-sm">
            Share great food. <br className="hidden sm:inline" />
            <span className="text-orange-400">Fork any recipe</span> <br className="hidden sm:inline" />
            to make it yours.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-stone-200 leading-relaxed max-w-2xl font-normal drop-shadow-xs">
            ChefFork is the open culinary network where recipes live, evolve, and connect passionate cooks across the globe. Take any dish, fork it with your secret ingredients or dietary tweaks, and watch how flavors evolve through transparent recipe lineage.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              id="landing-hero-signup-btn"
              onClick={() => openAuthModal('signup')}
              className="px-7 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-base shadow-lg shadow-orange-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Get Started
            </button>
            <button
              type="button"
              id="landing-hero-login-btn"
              onClick={() => openAuthModal('login')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white font-semibold text-base transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-xs"
            >
              <span>Log In</span>
            </button>
          </div>

          {/* Value mini-stats */}
          <div className="mt-10 pt-6 border-t border-white/15 flex items-center gap-6 sm:gap-8 text-xs text-stone-300">
            <div>
              <span className="font-extrabold text-white text-base block">100%</span>
              <span>Open Lineage</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <span className="font-extrabold text-white text-base block">Infinite</span>
              <span>Recipe Variations</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <span className="font-extrabold text-white text-base block">Free</span>
              <span>For Home Chefs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
        <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
            <GitFork className="w-6 h-6 rotate-180" />
          </div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">Interactive Forking</h3>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Fork any recipe in one click. Swap dairy for oat milk, turn up the heat with habaneros, or convert to gluten-free without losing credit to the original creator.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <ChefHat className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">Visual Recipe Lineage</h3>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Discover where famous traditions come from. Our lineage graph shows the full family tree of iterations, adaptations, and chef inspirations across generations.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">Genuine Community</h3>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Follow home cooks who share your culinary tastes, leave helpful tips, upload photos & cooking videos, and build your digital cookbook with like-minded foodies.
          </p>
        </div>
      </section>

      {/* Featured Recipes Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Popular Recipes</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Trending culinary forks and community staples</p>
          </div>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-500 dark:text-orange-400 transition-colors cursor-pointer"
          >
            <span>See all</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 rounded-2xl bg-stone-200 dark:bg-stone-800 animate-pulse" />
            ))}
          </div>
        ) : featuredRecipes.length === 0 ? (
          <div className="text-center py-16 p-8 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <ChefHat className="w-12 h-12 mx-auto text-stone-400 mb-3" />
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">Be the First to Cook!</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
              Sign up today and share your signature family recipe or favorite breakfast dish.
            </p>
            <button
              type="button"
              onClick={() => openAuthModal('signup')}
              className="mt-5 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm transition-colors cursor-pointer"
            >
              Post a Recipe
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => onOpenRecipe(recipe.id)}
                className="group rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs hover:shadow-md hover:border-orange-500 dark:hover:border-orange-500 transition-all cursor-pointer flex flex-col"
              >
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
                      <ChefHat className="w-10 h-10 opacity-40" />
                    </div>
                  )}

                  {recipe.parent_recipe_id && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500/90 text-white text-[11px] font-bold backdrop-blur-md flex items-center gap-1 shadow-sm">
                      <GitFork className="w-3 h-3 rotate-180" /> Forked
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar src={recipe.author?.avatar} name={recipe.author?.name} sizeClassName="w-6 h-6" />
                      <span className="text-xs font-medium text-stone-600 dark:text-stone-400 line-clamp-1">
                        {recipe.author?.name || 'Chef'}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                      {recipe.title}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-1">
                      {recipe.description || 'Delicious culinary creation.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{(recipe.preparation_time || 0) + (recipe.cooking_time || 0)}m</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <span>{recipe.likeCount || 0}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3.5 h-3.5 text-orange-500 rotate-180" />
                        <span>{recipe.forkCount || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Subtle, Professional Footer */}
      <footer
        id="landing-footer"
        className="mt-16 md:mt-20 pt-8 border-t border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-stone-500 dark:text-stone-400"
      >
        <div className="flex items-center gap-2">
          <p id="landing-developer-credit" className="text-stone-500 dark:text-stone-400">
            Developed by <span className="font-semibold text-stone-700 dark:text-stone-200">Rashmi M Chimmalagi</span>
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {onNavigateAbout && (
            <button
              type="button"
              id="landing-footer-about-btn"
              onClick={onNavigateAbout}
              className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium cursor-pointer"
            >
              About ChefFork
            </button>
          )}
          <span className="text-stone-300 dark:text-stone-700">•</span>
          <span>© {new Date().getFullYear()} ChefFork</span>
        </div>
      </footer>
    </div>
  );
};
