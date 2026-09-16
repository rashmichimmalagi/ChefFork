import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './pages/LandingPage';
import { VideoIntroPage } from './pages/VideoIntroPage';
import { AboutPage } from './pages/AboutPage';
import { HomeFeed } from './pages/HomeFeed';
import { ExplorePage } from './pages/ExplorePage';
import { RecipeEditor } from './pages/RecipeEditor';
import { RecipeDetail } from './pages/RecipeDetail';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { FollowingPage } from './pages/FollowingPage';
import { SavedRecipesPage } from './pages/SavedRecipesPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { LikedByModal } from './components/LikedByModal';
import { ActivePage, Recipe } from './types';
import { api } from './api';
import { useToast } from './components/Toast';

function getInitialPage(): ActivePage {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    const search = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith('#')
      ? new URLSearchParams(window.location.hash.slice(1))
      : new URLSearchParams();

    if (
      pathname.includes('/reset-password') ||
      search.get('insforge_type') === 'reset_password' ||
      search.get('type') === 'recovery' ||
      search.has('token') ||
      search.has('otp') ||
      hash.has('token') ||
      hash.has('otp')
    ) {
      return 'reset-password';
    }

    if (window.history.state?.chefForkPage) {
      return window.history.state.chefForkPage;
    }
  }
  return 'intro';
}

function MainLayout() {
  const { currentUser, isLoading, openAuthModal, logout } = useAuth();
  const { showToast } = useToast();

  const [activePage, setActivePage] = useState<ActivePage>(getInitialPage);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(() => window.history.state?.recipeId || null);
  const [forkParentRecipe, setForkParentRecipe] = useState<Recipe | null>(() => window.history.state?.forkParentRecipe || null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(() => window.history.state?.editingRecipe || null);
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(() => window.history.state?.profileUserId || null);
  const [exploreSearchQuery, setExploreSearchQuery] = useState<string>(() => window.history.state?.initialSearch || '');

  // Liked By modal state
  const [likedByRecipeId, setLikedByRecipeId] = useState<string | null>(null);
  const [likedByRecipeTitle, setLikedByRecipeTitle] = useState<string>('');

  const handleOpenLikedBy = (recipeId: string, recipeTitle?: string) => {
    setLikedByRecipeId(recipeId);
    setLikedByRecipeTitle(recipeTitle || '');
  };

  useEffect(() => {
    const handleOpenLikedByEvent = (e: any) => {
      const { recipeId, recipeTitle } = e?.detail || {};
      if (recipeId) {
        setLikedByRecipeId(recipeId);
        setLikedByRecipeTitle(recipeTitle || '');
      }
    };
    window.addEventListener('cheffork:open-liked-by', handleOpenLikedByEvent);
    return () => window.removeEventListener('cheffork:open-liked-by', handleOpenLikedByEvent);
  }, []);

  const applyNavigationState = (state: any) => {
    if (!state?.chefForkPage) return;
    if (!currentUser && (state.chefForkPage === 'create' || state.chefForkPage === 'notifications' || state.chefForkPage === 'following' || state.chefForkPage === 'saved' || (state.chefForkPage === 'profile' && !state.profileUserId))) {
      setActivePage('landing');
      setSelectedRecipeId(null);
      return;
    }
    setActivePage(state.chefForkPage);
    setSelectedRecipeId(state.recipeId || null);
    setViewProfileUserId(state.profileUserId || null);
    setForkParentRecipe(state.forkParentRecipe || null);
    setEditingRecipe(state.editingRecipe || null);
    setExploreSearchQuery(state.initialSearch || '');
  };

  useEffect(() => {
    if (!window.history.state?.chefForkPage) {
      window.history.replaceState({ chefForkPage: activePage, chefForkDepth: 0 }, '');
    }
    const handlePopState = (event: PopStateEvent) => applyNavigationState(event.state);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  const navigateTo = (page: ActivePage, state: Record<string, unknown> = {}) => {
    const currentDepth = Number(window.history.state?.chefForkDepth || 0);
    const nextState = { chefForkPage: page, chefForkDepth: currentDepth + 1, ...state };
    window.history.pushState(nextState, '');
    applyNavigationState(nextState);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = (fallback: ActivePage = currentUser ? 'feed' : 'landing') => {
    if (Number(window.history.state?.chefForkDepth || 0) > 0) {
      window.history.back();
      return;
    }
    navigateTo(fallback);
  };

  const handleLogout = async () => {
    try {
      // Call real SDK signOut & clear token
      await logout();

      // Clear recipe/editor/profile state immediately
      setSelectedRecipeId(null);
      setForkParentRecipe(null);
      setEditingRecipe(null);
      setViewProfileUserId(null);

      // Reset navigation to the public landing page
      setActivePage('landing');
      if (typeof window !== 'undefined') {
        window.history.replaceState({ chefForkPage: 'landing', chefForkDepth: 0 }, '', '/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      showToast('Logged out successfully');
    } catch (err: any) {
      console.error('Logout error:', err);
      showToast(err?.message || 'Failed to log out', 'error');
    }
  };

  // Default page logic based on auth
  useEffect(() => {
    if (!isLoading) {
      if (!currentUser && activePage === 'feed') {
        setActivePage('intro');
        if (Number(window.history.state?.chefForkDepth || 0) === 0) {
          window.history.replaceState({ ...window.history.state, chefForkPage: 'intro' }, '');
        }
      } else if (currentUser && (activePage === 'landing' || activePage === 'intro')) {
        setActivePage('feed');
        if (Number(window.history.state?.chefForkDepth || 0) === 0) {
          window.history.replaceState({ ...window.history.state, chefForkPage: 'feed' }, '');
        }
      }
    }
  }, [currentUser, isLoading]);

  useEffect(() => {
    if (!isLoading && !currentUser && (
      activePage === 'create' ||
      activePage === 'notifications' ||
      activePage === 'following' ||
      activePage === 'saved' ||
      (activePage === 'profile' && !viewProfileUserId)
    )) {
      navigateTo('landing');
    }
  }, [activePage, currentUser, isLoading, viewProfileUserId]);

  // Handlers for navigation
  const handleOpenRecipe = (recipeId: string) => {
    navigateTo('recipe', { recipeId });
  };

  const handleForkRecipe = async (parentRecipe: Recipe) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    try {
      const { recipe } = await api.getRecipe(parentRecipe.id);
      navigateTo('create', { forkParentRecipe: recipe });
    } catch (err: any) {
      showToast(err.message || 'Failed to load the original recipe for forking', 'error');
    }
  };

  const handleOpenProfile = (userId: string) => {
    navigateTo('profile', { profileUserId: userId });
  };

  const handleOpenCreate = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    navigateTo('create', { forkParentRecipe: null, editingRecipe: null });
  };

  const handleEditRecipe = async (recipe: Recipe) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    try {
      const { recipe: fullRecipe } = await api.getRecipe(recipe.id);
      navigateTo('create', { editingRecipe: fullRecipe, forkParentRecipe: null });
    } catch (err: any) {
      showToast(err.message || 'Failed to load recipe for editing', 'error');
    }
  };

  const handleDeleteRecipe = (deletedRecipeId: string) => {
    if (selectedRecipeId === deletedRecipeId) {
      setSelectedRecipeId(null);
    }
    navigateTo('feed');
  };

  const handleNavigation = (page: ActivePage) => {
    if (page === 'explore') {
      setExploreSearchQuery('');
    }
    navigateTo(page, page === 'profile' ? { profileUserId: null } : page === 'explore' ? { initialSearch: '' } : {});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50/20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-stone-600 tracking-wider uppercase font-heading">
            Warming up ChefFork...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5ef] text-stone-900 dark:bg-[#111315] dark:text-stone-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Header Navigation (hidden on full-screen Video Intro) */}
      {activePage !== 'intro' && (
        <Navbar
          activePage={activePage}
          onNavigate={handleNavigation}
          onOpenCreate={handleOpenCreate}
          onSearch={(query) => {
            setExploreSearchQuery(query);
            navigateTo('explore', { initialSearch: query });
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Main View Area */}
      <main className="flex-1">
        {activePage === 'intro' && (
          <VideoIntroPage
            onEnter={() => navigateTo('landing')}
          />
        )}

        {activePage === 'reset-password' && (
          <ResetPasswordPage
            onGoToLogin={() => {
              setActivePage(currentUser ? 'feed' : 'landing');
              openAuthModal('login');
            }}
          />
        )}

        {activePage === 'landing' && (
          <LandingPage
            onOpenRecipe={handleOpenRecipe}
            onExplore={() => navigateTo('explore')}
            onBackToIntro={() => navigateTo('intro')}
            onNavigateAbout={() => navigateTo('about')}
          />
        )}

        {activePage === 'about' && (
          <AboutPage
            onBack={() => goBack(currentUser ? 'feed' : 'landing')}
            onExplore={() => navigateTo('explore')}
          />
        )}

        {activePage === 'feed' && (
          <HomeFeed
            onOpenRecipe={handleOpenRecipe}
            onForkRecipe={handleForkRecipe}
            onOpenProfile={handleOpenProfile}
            onOpenCreate={handleOpenCreate}
            onOpenLikedBy={handleOpenLikedBy}
          />
        )}

        {activePage === 'explore' && (
          <ExplorePage
            initialSearch={exploreSearchQuery}
            onOpenRecipe={handleOpenRecipe}
            onForkRecipe={handleForkRecipe}
            onOpenProfile={handleOpenProfile}
            onOpenLikedBy={handleOpenLikedBy}
          />
        )}

        {activePage === 'create' && (
          <RecipeEditor
            forkParentRecipe={forkParentRecipe}
            editingRecipe={editingRecipe}
            onCancel={() => {
              setEditingRecipe(null);
              setForkParentRecipe(null);
              goBack('feed');
            }}
            onPublished={(recipe) => {
              setEditingRecipe(null);
              setForkParentRecipe(null);
              handleOpenRecipe(recipe.id);
            }}
            onOpenRecipe={handleOpenRecipe}
          />
        )}

        {activePage === 'recipe' && selectedRecipeId && (
          <RecipeDetail
            recipeId={selectedRecipeId}
            onBack={() => goBack('feed')}
            onForkRecipe={handleForkRecipe}
            onOpenRecipe={handleOpenRecipe}
            onOpenProfile={handleOpenProfile}
            onEditRecipe={handleEditRecipe}
            onDeleteRecipe={handleDeleteRecipe}
            onOpenLikedBy={handleOpenLikedBy}
          />
        )}

        {activePage === 'profile' && (
          <ProfilePage
            userId={viewProfileUserId}
            onOpenRecipe={handleOpenRecipe}
            onForkRecipe={handleForkRecipe}
            onOpenProfile={handleOpenProfile}
            onOpenCreate={handleOpenCreate}
            onBack={() => goBack(currentUser && !viewProfileUserId ? 'feed' : 'landing')}
            onOpenLikedBy={handleOpenLikedBy}
          />
        )}

        {activePage === 'notifications' && (
          <NotificationsPage
            onOpenRecipe={handleOpenRecipe}
            onOpenProfile={handleOpenProfile}
          />
        )}

        {activePage === 'following' && (
          <FollowingPage
            onOpenProfile={handleOpenProfile}
            onExplore={() => navigateTo('explore')}
            onBack={() => goBack('feed')}
          />
        )}

        {activePage === 'saved' && (
          <SavedRecipesPage
            onOpenRecipe={handleOpenRecipe}
            onForkRecipe={handleForkRecipe}
            onOpenProfile={handleOpenProfile}
            onExplore={() => navigateTo('explore')}
            onBack={() => goBack('feed')}
            onOpenLikedBy={handleOpenLikedBy}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation (hidden on full-screen Video Intro) */}
      {activePage !== 'intro' && (
        <MobileNav
          activePage={activePage}
          onNavigate={handleNavigation}
          onOpenCreate={handleOpenCreate}
        />
      )}

      {/* Global Liked By Modal */}
      <LikedByModal
        isOpen={likedByRecipeId !== null}
        onClose={() => setLikedByRecipeId(null)}
        recipeId={likedByRecipeId}
        recipeTitle={likedByRecipeTitle}
        onOpenProfile={handleOpenProfile}
      />

      {/* Global Auth Modal */}
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ToastProvider>
  );
}
