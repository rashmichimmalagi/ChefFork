import { insforge } from './lib/insforge';
import {
  User,
  UserStats,
  FollowerChef,
  Recipe,
  RecipeDetailData,
  NotificationItem,
  Comment,
  Ingredient,
  RecipeStep,
  ParentRecipeSummary,
} from './types';

const TOKEN_KEY = 'insforge_access_token';

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }
    try {
      insforge.setAccessToken(token);
    } catch {
      // ignore
    }
    return token;
  },
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      if (!token || token === 'undefined' || token === 'null') {
        localStorage.removeItem(TOKEN_KEY);
        try {
          insforge.setAccessToken(null);
        } catch (e) {
          console.warn('Could not clear access token on InsForge client:', e);
        }
        return;
      }
      localStorage.setItem(TOKEN_KEY, token);
      try {
        insforge.setAccessToken(token);
      } catch (e) {
        console.warn('Could not set access token on InsForge client:', e);
      }
    }
  },
  clearToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      try {
        insforge.setAccessToken(null);
      } catch (e) {
        console.warn('Could not clear access token on InsForge client:', e);
      }
    }
  },
};

// Initialize token on client boot
if (typeof window !== 'undefined') {
  const initialToken = authStorage.getToken();
  if (initialToken) {
    try {
      insforge.setAccessToken(initialToken);
    } catch {
      // ignore
    }
  }
}

// Helpers to normalize data from InsForge database
function parseTags(tags: any): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
}

function parseNutrition(nutrition: any) {
  if (nutrition && typeof nutrition === 'object') return nutrition;
  if (typeof nutrition === 'string') {
    try {
      return JSON.parse(nutrition);
    } catch {
      return {};
    }
  }
  return {};
}

export function isTableMissing(error: any, status?: number): boolean {
  if (!error && !status) return false;
  if (status === 404) return true;
  if (error?.status === 404) return true;
  if (error?.code === '42P01' || error?.code === 'PGRST204' || error?.code === 'PGRST200') return true;
  const msg = typeof error === 'string' ? error : error?.message;
  return typeof msg === 'string' && (
    msg.includes('does not exist') ||
    msg.includes('42P01') ||
    msg.includes('relation') ||
    msg.includes('Not Found') ||
    msg.includes('404')
  );
}

export function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.m4v') ||
    url.includes('video/') ||
    url.includes('format=video')
  );
}

export function extractStorageKey(mediaUrl?: string, bucketName = 'recipe-media'): string | null {
  if (!mediaUrl || typeof mediaUrl !== 'string') return null;
  const trimmed = mediaUrl.trim();
  if (!trimmed) return null;

  // Match /api/storage/buckets/<bucketName>/objects/<key>
  const regex = new RegExp(`/api/storage/buckets/${bucketName}/objects/([^?#]+)`);
  const match = trimmed.match(regex);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  // If it's a web URL outside this bucket or local asset, it's external / seeded
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/media/') ||
    trimmed.startsWith('/')
  ) {
    return null;
  }

  // Bare object key without URL scheme or slashes
  if (!trimmed.includes('/') && trimmed.length > 3) {
    return trimmed;
  }

  return null;
}

const DEFAULT_AVATAR = '';

// Helper to decode user ID from JWT token synchronously and reliably
export function getUserIdFromJwt(token: string): string | undefined {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed.sub || parsed.user_id || parsed.id || undefined;
  } catch {
    return undefined;
  }
}

// Helper to safely get the current authenticated user ID without throwing or calling auth endpoint when not logged in
async function getSafeCurrentUserId(): Promise<string | undefined> {
  const token = authStorage.getToken();
  if (!token) return undefined;

  // Keep SDK client access token in sync
  try {
    insforge.setAccessToken(token);
  } catch {
    // ignore
  }

  // First try extracting subject from token directly (fast & reliable)
  const tokenUserId = getUserIdFromJwt(token);
  if (tokenUserId) {
    return tokenUserId;
  }

  try {
    const { data } = await insforge.auth.getCurrentUser();
    return data?.user?.id;
  } catch {
    return undefined;
  }
}

export const api = {
  // ==========================================================================
  // REAL INSFORGE AUTHENTICATION
  // ==========================================================================

  async signup(payload: { name: string; username?: string; email: string; password: string }) {
    const { data, error } = await insforge.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
      name: payload.name.trim(),
    });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Sign up failed: No response from authentication service');
    }

    const accessToken = data.accessToken || null;
    const rawUser = (data.user as any) || null;

    if (!accessToken || !rawUser || !rawUser.id) {
      return {
        user: null,
        token: null,
        requireEmailVerification: true,
      };
    }

    authStorage.setToken(accessToken);
    const userId = rawUser.id;
    const username = payload.username?.trim() || payload.email.split('@')[0];

    const user: User = {
      id: userId,
      email: rawUser.email,
      name: payload.name || rawUser.name || username,
      username: username,
      avatar: DEFAULT_AVATAR,
      bio: '',
      createdAt: rawUser.createdAt || new Date().toISOString(),
    };

    const { error: profileError } = await insforge.database.from('profiles').upsert({
      id: userId,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatar: user.avatar,
    });
    if (profileError) {
      console.warn('Could not sync user profile table:', profileError);
    }

    return {
      user,
      token: accessToken,
      requireEmailVerification: false,
    };
  },

  async verifyEmail(email: string, otp: string) {
    const { data, error } = await insforge.auth.verifyEmail({
      email: email.trim(),
      otp,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Unable to verify email. Please try again.');
    }

    return data;
  },

  async resendVerificationEmail(email: string) {
    const { data, error } = await insforge.auth.resendVerificationEmail({
      email: email.trim(),
    });

    if (error || !data) {
      throw new Error(error?.message || 'Unable to resend verification code. Please try again.');
    }

    return data;
  },

  async sendPasswordResetEmail(email: string) {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      throw new Error('Please enter your email address.');
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!isEmail) {
      throw new Error('Please enter a valid email address.');
    }

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { data, error } = await insforge.auth.sendResetPasswordEmail({
      email: cleanEmail,
      redirectTo,
    });

    if (error) {
      const msg = error.message || '';
      if (error.statusCode === 429 || msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('too many')) {
        throw new Error('Too many requests. Please wait a moment before trying again.');
      }
      throw new Error(msg || 'Unable to send password reset email. Please try again.');
    }

    return data;
  },

  async exchangeResetPasswordCode(email: string, code: string): Promise<string> {
    const cleanEmail = email.trim();
    const cleanCode = code.trim();
    if (!cleanEmail) {
      throw new Error('Please enter your email address.');
    }
    if (!cleanCode) {
      throw new Error('Please enter the reset code from your email.');
    }

    const { data, error } = await insforge.auth.exchangeResetPasswordToken({
      email: cleanEmail,
      code: cleanCode,
    });

    if (error || !data?.token) {
      throw new Error(error?.message || 'Invalid or expired reset code. Please check your email or request a new code.');
    }

    return data.token;
  },

  async resetPassword(tokenOrOtp: string, newPassword: string) {
    const cleanOtp = tokenOrOtp.trim();
    if (!newPassword) {
      throw new Error('Please enter a new password.');
    }
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (!cleanOtp) {
      throw new Error('Reset token or verification code is missing.');
    }

    const { data, error } = await insforge.auth.resetPassword({
      otp: cleanOtp,
      newPassword,
    });

    if (error) {
      throw new Error(error.message || 'Failed to reset password. The link or code may be expired.');
    }

    return data;
  },

  async login(payload: { login?: string; email?: string; password: string }) {
    const identifier = (payload.email || payload.login || '').trim();
    if (!identifier || !payload.password) {
      throw new Error('Please enter your email or username and password');
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    if (identifier.includes('@') && !isEmail) {
      throw new Error('Please enter a valid email address or username');
    }

    let data: any;
    let error: any;
    if (isEmail) {
      ({ data, error } = await insforge.auth.signInWithPassword({
        email: identifier,
        password: payload.password,
      }));
    } else {
      const response = await fetch('/api/auth/login-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password: payload.password }),
      });
      const responseData = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responseData?.message || 'Invalid username or password');
      }
      data = responseData;
      error = null;
    }

    if (error || !data) {
      throw new Error(error?.message || 'Invalid email or password');
    }

    if (data.accessToken) {
      authStorage.setToken(data.accessToken);
    }

    const rawUser = data.user as any;
    if (!rawUser || !rawUser.id) {
      throw new Error('Authentication succeeded, but no valid user was returned.');
    }
    const userId = rawUser.id;

    // Fetch user profile from InsForge database
    let profile: any = null;
    try {
      const res = await insforge.database.from('profiles').select('*').eq('id', userId).single();
      profile = res.data;
    } catch {
      // fallback
    }

    const user: User = {
      id: userId,
      email: rawUser.email,
      name: profile?.name || rawUser.name || rawUser.email.split('@')[0],
      username: profile?.username || rawUser.email.split('@')[0],
      avatar: profile?.avatar || DEFAULT_AVATAR,
      bio: profile?.bio || '',
      createdAt: profile?.created_at || rawUser.createdAt || new Date().toISOString(),
    };

    return { user, token: data.accessToken };
  },

  async getMe() {
    const token = authStorage.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await insforge.auth.getCurrentUser();
    if (error || !data?.user) {
      throw new Error('Not authenticated');
    }

    const rawUser = data.user as any;
    if (!rawUser || !rawUser.id) {
      throw new Error('Authentication succeeded, but no valid user was returned.');
    }
    const userId = rawUser.id;

    // Fetch profile
    let profile: any = null;
    try {
      const res = await insforge.database.from('profiles').select('*').eq('id', userId).single();
      profile = res.data;
    } catch {
      // fallback
    }

    // Fetch stats
    let recipesCount = 0;
    let forksCount = 0;
    let followersCount = 0;
    let followingCount = 0;

    try {
      const [recipesRes, forksRes, followersRes, followingRes] = await Promise.all([
        insforge.database.from('recipes').select('id').eq('author_id', userId),
        insforge.database.from('recipes').select('id').eq('author_id', userId).not('parent_recipe_id', 'is', null),
        insforge.database.from('follows').select('id').eq('following_id', userId),
        insforge.database.from('follows').select('id').eq('follower_id', userId),
      ]);

      recipesCount = recipesRes.data?.length || 0;
      forksCount = forksRes.data?.length || 0;
      followersCount = followersRes.data?.length || 0;
      followingCount = followingRes.data?.length || 0;
    } catch (statsErr) {
      console.warn('Could not compute profile stats:', statsErr);
    }

    const user: User = {
      id: userId,
      email: rawUser.email,
      name: profile?.name || rawUser.name || rawUser.email.split('@')[0],
      username: profile?.username || rawUser.email.split('@')[0],
      avatar: profile?.avatar || DEFAULT_AVATAR,
      bio: profile?.bio || '',
      createdAt: profile?.created_at || rawUser.createdAt || new Date().toISOString(),
    };

    const stats: UserStats = {
      recipesCount,
      forksCount,
      followersCount,
      followingCount,
      totalPosts: recipesCount,
    };

    return { user, stats };
  },

  async logout() {
    const { error } = await insforge.auth.signOut();
    if (error) {
      throw new Error(error.message || 'Logout failed');
    }
    authStorage.clearToken();
  },

  async updateProfile(updates: { name?: string; bio?: string; avatar?: string }) {
    const { data: authData, error: authError } = await insforge.auth.getCurrentUser();
    if (authError || !authData?.user) {
      throw new Error('Not authenticated');
    }

    const userId = authData.user.id;
    const { data, error } = await insforge.database
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update profile');
    }

    const user: User = {
      id: data.id,
      name: data.name,
      username: data.username,
      email: data.email,
      bio: data.bio || '',
      avatar: data.avatar || DEFAULT_AVATAR,
      createdAt: data.created_at,
    };

    return { user };
  },

  // ==========================================================================
  // REAL INSFORGE STORAGE: PHOTOS & COOKING VIDEOS
  // ==========================================================================

  async uploadMedia(file: File): Promise<string> {
    try {
      const bucket = insforge.storage.from('recipe-media');
      const { data, error } = await bucket.uploadAuto(file);

      if (error || !data) {
        throw new Error(error?.message || 'Storage upload failed. Please verify the "recipe-media" bucket exists in InsForge Storage.');
      }

      if (data.url) {
        return data.url;
      }

      const publicUrlRes = bucket.getPublicUrl(data.key);
      return publicUrlRes.data?.publicUrl || '';
    } catch (err: any) {
      console.error('Failed to upload media to InsForge storage:', err);
      throw new Error(err.message || 'Media upload to InsForge storage failed');
    }
  },

  async uploadImage(file: File): Promise<string> {
    return this.uploadMedia(file);
  },

  // ==========================================================================
  // REAL INSFORGE DATABASE: USERS & PROFILES
  // ==========================================================================

  async getUser(id: string) {
    const currentUserId = await getSafeCurrentUserId();
    let authenticatedUser: any = null;
    if (currentUserId) {
      try {
        const { data } = await insforge.auth.getCurrentUser();
        authenticatedUser = data?.user;
      } catch {
        // ignore
      }
    }

    const { data: profileData, error } = await insforge.database
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    let profile = profileData;

    if ((!profile || error) && authenticatedUser && currentUserId === id) {
      const email = authenticatedUser.email || '';
      const profilePayload = {
        id: authenticatedUser.id,
        name: authenticatedUser.name || authenticatedUser.profile?.name || email.split('@')[0],
        username: authenticatedUser.profile?.username || email.split('@')[0],
        email,
        bio: '',
        avatar: DEFAULT_AVATAR,
      };
      const { data: syncedProfile, error: syncError } = await insforge.database
        .from('profiles')
        .upsert(profilePayload)
        .select()
        .single();

      if (!syncError && syncedProfile) {
        profile = syncedProfile;
      }
    }

    if (!profile) {
      throw new Error('User profile not found');
    }

    const user: User = {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      email: profile.email,
      bio: profile.bio || '',
      avatar: profile.avatar || DEFAULT_AVATAR,
      createdAt: profile.created_at,
    };

    // Follow status
    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      const { data: followRecord } = await insforge.database
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', id)
        .limit(1);
      isFollowing = !!(followRecord && followRecord.length > 0);
    }

    // Counts
    const [recipesRes, forksRes, followersRes, followingRes] = await Promise.all([
      insforge.database.from('recipes').select('id').eq('author_id', id),
      insforge.database.from('recipes').select('id').eq('author_id', id).not('parent_recipe_id', 'is', null),
      insforge.database.from('follows').select('id').eq('following_id', id),
      insforge.database.from('follows').select('id').eq('follower_id', id),
    ]);

    let savedCount = 0;
    if (currentUserId && currentUserId === id) {
      try {
        const { data: savedData } = await insforge.database
          .from('saved_recipes')
          .select('id')
          .eq('user_id', id);
        savedCount = savedData?.length || 0;
      } catch {
        savedCount = 0;
      }
    }

    const stats: UserStats = {
      recipesCount: recipesRes.data?.length || 0,
      forksCount: forksRes.data?.length || 0,
      followersCount: followersRes.data?.length || 0,
      followingCount: followingRes.data?.length || 0,
      savedCount,
      totalPosts: recipesRes.data?.length || 0,
      isFollowing,
    };

    // User's recipes
    const { recipes } = await this.getRecipes({ author_id: id });

    return { user, stats, recipes };
  },

  async searchUsers(query?: string) {
    let builder = insforge.database.from('profiles').select('*').limit(20);

    if (query?.trim()) {
      builder = builder.or(`name.ilike.%${query.trim()}%,username.ilike.%${query.trim()}%`);
    }

    const { data, error } = await builder;
    if (error) {
      if (isTableMissing(error)) {
        return { users: [] };
      }
      throw new Error(error.message || 'Failed to search users');
    }

    const usersWithStats = await Promise.all(
      (data || []).map(async (p: any) => {
        const [rRes, fRes, flwRes] = await Promise.all([
          insforge.database.from('recipes').select('id').eq('author_id', p.id),
          insforge.database.from('recipes').select('id').eq('author_id', p.id).not('parent_recipe_id', 'is', null),
          insforge.database.from('follows').select('id').eq('following_id', p.id),
        ]);

        return {
          id: p.id,
          name: p.name,
          username: p.username,
          email: p.email,
          bio: p.bio || '',
          avatar: p.avatar || DEFAULT_AVATAR,
          createdAt: p.created_at,
          recipesCount: rRes.data?.length || 0,
          forksCount: fRes.data?.length || 0,
          followersCount: flwRes.data?.length || 0,
        };
      })
    );

    return { users: usersWithStats };
  },

  async toggleFollow(targetUserId: string, currentUser?: User | null) {
    const token = authStorage.getToken();
    if (!token) {
      throw new Error('Authentication required to follow chefs');
    }
    try {
      insforge.setAccessToken(token);
    } catch {
      // ignore
    }

    let currentUserId = currentUser?.id;
    if (!currentUserId) {
      currentUserId = await getSafeCurrentUserId();
    }
    if (!currentUserId) {
      try {
        const { data: currentAuth } = await insforge.auth.getCurrentUser();
        currentUserId = currentAuth?.user?.id;
      } catch {
        // ignore
      }
    }

    if (!currentUserId) {
      throw new Error('Authentication required to follow chefs');
    }

    if (currentUserId === targetUserId) {
      throw new Error('You cannot follow yourself');
    }

    // Check if currently following in the REAL InsForge follows table
    const { data: existing, error: checkError } = await insforge.database
      .from('follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .limit(1);

    if (checkError) {
      console.warn('Error checking existing follow record in InsForge:', checkError);
    }

    const isFollowing = existing && existing.length > 0;

    if (isFollowing) {
      const { error: deleteError } = await insforge.database
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId);

      if (deleteError) {
        console.error('Failed to delete follow record in InsForge database:', deleteError);
        throw new Error(deleteError.message || 'Failed to unfollow chef');
      }
    } else {
      const { error: insertError } = await insforge.database.from('follows').insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      });

      if (insertError) {
        // Code 23505 is PostgreSQL unique constraint violation (already followed)
        if (insertError.code !== '23505') {
          console.error('Failed to insert follow record into InsForge database:', insertError);
          throw new Error(insertError.message || 'Failed to follow chef');
        }
      }

      // Notify target user (non-blocking)
      try {
        const { data: senderProfile } = await insforge.database
          .from('profiles')
          .select('name')
          .eq('id', currentUserId)
          .single();

        await insforge.database.from('notifications').insert({
          user_id: targetUserId,
          sender_id: currentUserId,
          type: 'follow',
          message: `${senderProfile?.name || 'A chef'} started following you`,
          read: false,
        });
      } catch {
        // notification non-blocking
      }
    }

    // Query REAL InsForge database to verify true state and count
    const [verifyFollowRes, followersRes] = await Promise.all([
      insforge.database
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
        .limit(1),
      insforge.database
        .from('follows')
        .select('id')
        .eq('following_id', targetUserId),
    ]);

    const verifiedIsFollowing = !!(verifyFollowRes.data && verifyFollowRes.data.length > 0);
    const followersCount = followersRes.data?.length || 0;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cheffork:follow-updated', {
          detail: {
            targetUserId,
            currentUserId,
            isFollowing: verifiedIsFollowing,
            followersCount,
          },
        })
      );
    }

    return {
      isFollowing: verifiedIsFollowing,
      followersCount,
    };
  },

  async checkIsFollowing(targetUserId: string, currentUserId?: string): Promise<boolean> {
    const token = authStorage.getToken();
    if (!token) return false;

    const uid = currentUserId || (await getSafeCurrentUserId());
    if (!uid || uid === targetUserId) {
      return false;
    }

    try {
      const { data, error } = await insforge.database
        .from('follows')
        .select('id')
        .eq('follower_id', uid)
        .eq('following_id', targetUserId)
        .limit(1);

      if (error) {
        console.warn('Could not query follow status in InsForge database:', error);
        return false;
      }
      return !!(data && data.length > 0);
    } catch {
      return false;
    }
  },

  async unfollowUser(targetUserId: string): Promise<void> {
    const token = authStorage.getToken();
    if (!token) {
      throw new Error('Authentication required to unfollow chefs');
    }
    const currentUserId = await getSafeCurrentUserId();
    if (!currentUserId) {
      throw new Error('Could not identify current authenticated user');
    }

    const { error: deleteError } = await insforge.database
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);

    if (deleteError) {
      console.error('Failed to unfollow chef in InsForge follows table:', deleteError);
      throw new Error(deleteError.message || 'Failed to unfollow chef');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cheffork:follow-updated', {
          detail: {
            targetUserId,
            currentUserId,
            isFollowing: false,
          },
        })
      );
    }
  },

  async getFollowersCount(targetUserId: string): Promise<number> {
    if (!targetUserId) return 0;
    try {
      const { data, error } = await insforge.database
        .from('follows')
        .select('id')
        .eq('following_id', targetUserId);
      if (error) {
        console.warn('Error fetching followers count from InsForge follows table:', error);
        return 0;
      }
      return data?.length || 0;
    } catch {
      return 0;
    }
  },

  async getFollowingCount(targetUserId: string): Promise<number> {
    if (!targetUserId) return 0;
    try {
      const { data, error } = await insforge.database
        .from('follows')
        .select('id')
        .eq('follower_id', targetUserId);
      if (error) {
        console.warn('Error fetching following count from InsForge follows table:', error);
        return 0;
      }
      return data?.length || 0;
    } catch {
      return 0;
    }
  },

  async getFollowers(
    targetUserId: string,
    viewerUserId?: string
  ): Promise<{
    users: FollowerChef[];
    totalCount: number;
  }> {
    if (!targetUserId) {
      return { users: [], totalCount: 0 };
    }

    // 1. Query REAL follows table where following_id = targetUserId
    // Followers are users who follow targetUserId
    const { data: followRecords, error: followErr } = await insforge.database
      .from('follows')
      .select('follower_id, created_at')
      .eq('following_id', targetUserId)
      .order('created_at', { ascending: false });

    if (followErr) {
      if (isTableMissing(followErr)) {
        return { users: [], totalCount: 0 };
      }
      console.error('Error querying followers from InsForge follows table:', followErr);
      throw new Error(followErr.message || 'Failed to query followers');
    }

    if (!followRecords || followRecords.length === 0) {
      return { users: [], totalCount: 0 };
    }

    const followerIds: string[] = followRecords
      .map((f: any) => f.follower_id)
      .filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0);

    if (followerIds.length === 0) {
      return { users: [], totalCount: followRecords.length };
    }

    // 2. Fetch public profile information for each follower from public.profiles
    const { data: profiles, error: profileErr } = await insforge.database
      .from('profiles')
      .select('id, name, username, bio, avatar, created_at')
      .in('id', followerIds);

    if (profileErr) {
      console.error('Error querying profiles table for followers:', profileErr);
      throw new Error(profileErr.message || 'Failed to load follower profiles');
    }

    // 3. Determine if current viewer (authenticated user) is following each follower
    const currentViewerId = viewerUserId !== undefined ? viewerUserId : await getSafeCurrentUserId();
    const followedByViewer = new Set<string>();

    if (currentViewerId) {
      try {
        const { data: viewerFollows } = await insforge.database
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentViewerId)
          .in('following_id', followerIds);

        if (viewerFollows) {
          viewerFollows.forEach((f: any) => {
            if (f.following_id) followedByViewer.add(f.following_id);
          });
        }
      } catch (e) {
        console.warn('Could not verify viewer follow status for followers list:', e);
      }
    }

    // 4. Batch query recipe and follower counts for all users in one go
    const recipesCountMap = new Map<string, number>();
    const followersCountMap = new Map<string, number>();

    try {
      const [{ data: recipesData }, { data: followersData }] = await Promise.all([
        insforge.database.from('recipes').select('id, author_id').in('author_id', followerIds),
        insforge.database.from('follows').select('id, following_id').in('following_id', followerIds),
      ]);

      if (recipesData) {
        recipesData.forEach((r: any) => {
          if (r.author_id) {
            recipesCountMap.set(r.author_id, (recipesCountMap.get(r.author_id) || 0) + 1);
          }
        });
      }

      if (followersData) {
        followersData.forEach((f: any) => {
          if (f.following_id) {
            followersCountMap.set(f.following_id, (followersCountMap.get(f.following_id) || 0) + 1);
          }
        });
      }
    } catch {
      // Non-critical count queries
    }

    const profileMap = new Map<string, any>();
    if (profiles) {
      profiles.forEach((p: any) => profileMap.set(p.id, p));
    }

    // Preserve follower recency order
    const followerList: FollowerChef[] = followerIds.map((fId: string) => {
      const p = profileMap.get(fId);
      return {
        id: fId,
        name: p?.name || p?.username || 'Chef',
        username: p?.username || `chef_${fId.slice(0, 6)}`,
        email: '', // Never expose private email
        bio: p?.bio || '',
        avatar: p?.avatar || DEFAULT_AVATAR,
        createdAt: p?.created_at || new Date().toISOString(),
        recipesCount: recipesCountMap.get(fId) || 0,
        followersCount: followersCountMap.get(fId) || 0,
        followingCount: 0,
        isFollowing: followedByViewer.has(fId),
      };
    });

    return { users: followerList, totalCount: followRecords.length };
  },

  async getFollowedUsers(
    userId?: string,
    viewerUserId?: string
  ): Promise<{
    users: FollowerChef[];
    totalCount: number;
  }> {
    const targetUserId = userId || (await getSafeCurrentUserId());
    if (!targetUserId) {
      return { users: [], totalCount: 0 };
    }

    // 1. Query REAL follows table where follower_id = targetUserId
    const { data: followRecords, error: followErr } = await insforge.database
      .from('follows')
      .select('following_id, created_at')
      .eq('follower_id', targetUserId)
      .order('created_at', { ascending: false });

    if (followErr) {
      if (isTableMissing(followErr)) {
        return { users: [], totalCount: 0 };
      }
      console.error('Error querying follows table:', followErr);
      throw new Error(followErr.message || 'Failed to query followed chefs');
    }

    if (!followRecords || followRecords.length === 0) {
      return { users: [], totalCount: 0 };
    }

    const followingIds: string[] = followRecords
      .map((f: any) => f.following_id)
      .filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0);

    if (followingIds.length === 0) {
      return { users: [], totalCount: followRecords.length };
    }

    // 2. Fetch public profile information for each followed user
    const { data: profiles, error: profileErr } = await insforge.database
      .from('profiles')
      .select('id, name, username, bio, avatar, created_at')
      .in('id', followingIds);

    if (profileErr) {
      console.error('Error querying profiles table for followed chefs:', profileErr);
      throw new Error(profileErr.message || 'Failed to load followed chef profiles');
    }

    const currentViewerId = viewerUserId !== undefined ? viewerUserId : await getSafeCurrentUserId();
    const followedByViewer = new Set<string>();

    if (currentViewerId) {
      if (currentViewerId === targetUserId) {
        // The viewer is viewing their own following list, so they follow all of them
        followingIds.forEach((id: string) => followedByViewer.add(id));
      } else {
        try {
          const { data: viewerFollows } = await insforge.database
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentViewerId)
            .in('following_id', followingIds);

          if (viewerFollows) {
            viewerFollows.forEach((f: any) => {
              if (f.following_id) followedByViewer.add(f.following_id);
            });
          }
        } catch (e) {
          console.warn('Could not check viewer follow status in followed list:', e);
        }
      }
    }

    // 3. Batch query recipe and follower counts for all followed users
    const recipesCountMap = new Map<string, number>();
    const followersCountMap = new Map<string, number>();

    try {
      const [{ data: recipesData }, { data: followersData }] = await Promise.all([
        insforge.database.from('recipes').select('id, author_id').in('author_id', followingIds),
        insforge.database.from('follows').select('id, following_id').in('following_id', followingIds),
      ]);

      if (recipesData) {
        recipesData.forEach((r: any) => {
          if (r.author_id) {
            recipesCountMap.set(r.author_id, (recipesCountMap.get(r.author_id) || 0) + 1);
          }
        });
      }

      if (followersData) {
        followersData.forEach((f: any) => {
          if (f.following_id) {
            followersCountMap.set(f.following_id, (followersCountMap.get(f.following_id) || 0) + 1);
          }
        });
      }
    } catch {
      // Non-critical count queries
    }

    const profileMap = new Map<string, any>();
    if (profiles) {
      profiles.forEach((p: any) => profileMap.set(p.id, p));
    }

    // Preserve following order (most recent first)
    const followedList: FollowerChef[] = followingIds.map((id: string) => {
      const p = profileMap.get(id);
      return {
        id,
        name: p?.name || p?.username || 'Chef',
        username: p?.username || `chef_${id.slice(0, 6)}`,
        email: '', // Never expose private email
        bio: p?.bio || '',
        avatar: p?.avatar || DEFAULT_AVATAR,
        createdAt: p?.created_at || new Date().toISOString(),
        recipesCount: recipesCountMap.get(id) || 0,
        followersCount: followersCountMap.get(id) || 0,
        followingCount: 0,
        isFollowing: followedByViewer.has(id),
      };
    });

    return { users: followedList, totalCount: followRecords.length };
  },

  // ==========================================================================
  // REAL INSFORGE DATABASE: RECIPES & FORKS
  // ==========================================================================

  async getAllRecipeTags(): Promise<string[]> {
    try {
      const { data, error } = await insforge.database
        .from('recipes')
        .select('tags')
        .limit(100);

      if (error || !data) return [];
      const tagSet = new Set<string>();
      data.forEach((row: any) => {
        const parsed = parseTags(row.tags);
        parsed.forEach((t: string) => {
          if (t && t.trim()) tagSet.add(t.trim());
        });
      });
      return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
    } catch {
      return [];
    }
  },

  async getRecipes(params?: {
    search?: string;
    tag?: string;
    tags?: string[];
    cookingTimeRange?: 'all' | '<15' | '15-30' | '30-60' | '>60';
    prepTimeRange?: 'all' | '<15' | '15-30' | '30-60' | '>60';
    servingsRange?: 'all' | '1-2' | '3-4' | '5+';
    caloriesRange?: 'all' | '<300' | '300-500' | '500-800' | '>800';
    maxTotalTime?: number;
    maxCalories?: number;
    author_id?: string;
    authorId?: string;
    only_forks?: boolean;
    sort?: 'newest' | 'oldest' | 'popular' | 'forked' | 'quickest' | 'calories' | 'recent' | string;
    tab?: string;
    limit?: number;
  }) {
    const authorIdFilter = params?.author_id || params?.authorId;
    const currentUserId = await getSafeCurrentUserId();

    const isOldestSort = params?.sort === 'oldest';
    let query = insforge.database
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: isOldestSort });

    // Handle "Following" community feed tab with real InsForge follows table
    if (params?.tab === 'following') {
      if (!currentUserId) {
        return { recipes: [] };
      }

      const { data: followRecords, error: followErr } = await insforge.database
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      if (followErr) {
        console.error('Error fetching followed chefs from InsForge follows table:', followErr);
        return { recipes: [] };
      }

      if (!followRecords || followRecords.length === 0) {
        return { recipes: [] };
      }

      const followedChefIds = followRecords
        .map((f: any) => f.following_id)
        .filter((id: string) => Boolean(id));

      if (followedChefIds.length === 0) {
        return { recipes: [] };
      }

      query = query.in('author_id', followedChefIds);
    }

    if (authorIdFilter) {
      query = query.eq('author_id', authorIdFilter);
    }
    if (params?.only_forks === true) {
      query = query.not('parent_recipe_id', 'is', null);
    } else if (params?.only_forks === false) {
      query = query.is('parent_recipe_id', null);
    }

    if (params?.tag && params.tag !== 'All') {
      query = query.contains('tags', [params.tag]);
    }

    // Cooking time range filter at database level
    if (params?.cookingTimeRange && params.cookingTimeRange !== 'all') {
      if (params.cookingTimeRange === '<15') {
        query = query.lt('cooking_time', 15);
      } else if (params.cookingTimeRange === '15-30') {
        query = query.gte('cooking_time', 15).lte('cooking_time', 30);
      } else if (params.cookingTimeRange === '30-60') {
        query = query.gte('cooking_time', 30).lte('cooking_time', 60);
      } else if (params.cookingTimeRange === '>60') {
        query = query.gt('cooking_time', 60);
      }
    }

    // Preparation time range filter at database level
    if (params?.prepTimeRange && params.prepTimeRange !== 'all') {
      if (params.prepTimeRange === '<15') {
        query = query.lt('preparation_time', 15);
      } else if (params.prepTimeRange === '15-30') {
        query = query.gte('preparation_time', 15).lte('preparation_time', 30);
      } else if (params.prepTimeRange === '30-60') {
        query = query.gte('preparation_time', 30).lte('preparation_time', 60);
      } else if (params.prepTimeRange === '>60') {
        query = query.gt('preparation_time', 60);
      }
    }

    // Servings range filter at database level
    if (params?.servingsRange && params.servingsRange !== 'all') {
      if (params.servingsRange === '1-2') {
        query = query.gte('servings', 1).lte('servings', 2);
      } else if (params.servingsRange === '3-4') {
        query = query.gte('servings', 3).lte('servings', 4);
      } else if (params.servingsRange === '5+') {
        query = query.gte('servings', 5);
      }
    }

    // Search functionality across title, description, chef name, username, and recipe tags
    if (params?.search?.trim()) {
      const searchTerm = params.search.trim();
      const cleanTerm = searchTerm.replace(/[,%()]/g, ' ').trim();

      // Look up matching chefs in profiles table to include their recipes
      let matchingAuthorIds: string[] = [];
      try {
        if (cleanTerm) {
          const { data: authors } = await insforge.database
            .from('profiles')
            .select('id')
            .or(`name.ilike.%${cleanTerm}%,username.ilike.%${cleanTerm}%`)
            .limit(30);

          if (authors && authors.length > 0) {
            matchingAuthorIds = authors.map((a: any) => a.id).filter(Boolean);
          }
        }
      } catch (authorLookupErr) {
        console.warn('Author lookup warning during recipe search:', authorLookupErr);
      }

      // Check if search term matches any real tags in the database
      let matchingTags: string[] = [];
      try {
        const dbTags = await this.getAllRecipeTags();
        const searchLower = searchTerm.toLowerCase();
        matchingTags = dbTags.filter((t) => t.toLowerCase().includes(searchLower));
      } catch {
        // non-blocking tag lookup
      }

      const orClauses: string[] = [];
      if (cleanTerm) {
        orClauses.push(`title.ilike.%${cleanTerm}%`);
        orClauses.push(`description.ilike.%${cleanTerm}%`);
      }
      if (matchingAuthorIds.length > 0) {
        orClauses.push(`author_id.in.(${matchingAuthorIds.join(',')})`);
      }
      if (matchingTags.length > 0) {
        const formattedTags = matchingTags.map((t) => JSON.stringify(t)).join(',');
        orClauses.push(`tags.ov.{${formattedTags}}`);
      }

      if (orClauses.length > 0) {
        query = query.or(orClauses.join(','));
      }
    }

    if (params?.limit && params.limit > 0) {
      query = query.limit(params.limit);
    }

    let rawRecipes: any[] | null = null;
    const { data: initialRecipes, error } = await query;
    rawRecipes = initialRecipes;

    if (error) {
      if (isTableMissing(error)) {
        console.warn('InsForge database table public.recipes does not exist yet. Please execute insforge-schema.sql in the InsForge SQL editor.');
        return { recipes: [], schemaPending: true };
      }
      const errString = typeof error === 'string' ? error : JSON.stringify(error);
      if (errString.includes('AUTH_INVALID_CREDENTIALS') || (error as any)?.statusCode === 401) {
        console.warn('Invalid or expired token detected while fetching recipes, clearing token and retrying:', error);
        authStorage.clearToken();
        // Retry query anonymously
        try {
          const retryRes = await insforge.database.from('recipes').select('*').order('created_at', { ascending: false }).limit(params?.limit || 20);
          rawRecipes = retryRes.data || [];
        } catch {
          rawRecipes = [];
        }
      } else {
        console.error('Error fetching recipes from InsForge:', error);
        throw new Error(error.message || 'Failed to fetch recipes');
      }
    }

    if (!rawRecipes || rawRecipes.length === 0) {
      return { recipes: [] };
    }

    // Pre-fetch saved recipe IDs for current user to populate hasSaved
    let savedRecipeIds = new Set<string>();
    if (currentUserId) {
      try {
        const { data: savedList } = await insforge.database
          .from('saved_recipes')
          .select('recipe_id')
          .eq('user_id', currentUserId);
        if (savedList && Array.isArray(savedList)) {
          savedRecipeIds = new Set(savedList.map((s: any) => s.recipe_id));
        }
      } catch {
        // non-blocking
      }
    }

    // Hydrate author profiles, likes, comments, forks, and parent recipes
    let recipes: Recipe[] = await Promise.all(
      rawRecipes.map(async (r: any) => {
        // Fetch author
        const { data: authorProfile } = await insforge.database
          .from('profiles')
          .select('*')
          .eq('id', r.author_id)
          .single();

        const author: User = {
          id: r.author_id,
          name: authorProfile?.name || 'Chef',
          username: authorProfile?.username || 'chef',
          email: authorProfile?.email || '',
          bio: authorProfile?.bio || '',
          avatar: authorProfile?.avatar || DEFAULT_AVATAR,
          createdAt: authorProfile?.created_at || r.created_at,
        };

        // Likes count & status
        const { data: likesData } = await insforge.database
          .from('likes')
          .select('user_id')
          .eq('recipe_id', r.id);

        const likeCount = likesData?.length || 0;
        const hasLiked = currentUserId ? !!likesData?.some((l: any) => l.user_id === currentUserId) : false;

        // Comments count
        const { data: commentsData } = await insforge.database
          .from('comments')
          .select('id')
          .eq('recipe_id', r.id);
        const commentCount = commentsData?.length || 0;

        // Forks count
        const { data: forksData } = await insforge.database
          .from('recipes')
          .select('id')
          .eq('parent_recipe_id', r.id);
        const forkCount = forksData?.length || 0;

        // Parent recipe summary if this is a fork
        let parentRecipe: ParentRecipeSummary | null = null;
        if (r.parent_recipe_id) {
          try {
            const { data: parentData } = await insforge.database
              .from('recipes')
              .select('id, title, description, media, author_id')
              .eq('id', r.parent_recipe_id)
              .single();

            if (parentData) {
              const { data: parentAuthor } = await insforge.database
                .from('profiles')
                .select('*')
                .eq('id', parentData.author_id)
                .single();

              parentRecipe = {
                id: parentData.id,
                title: parentData.title,
                description: parentData.description,
                media: parentData.media,
                authorName: parentAuthor?.name || 'Chef',
                author: parentAuthor
                  ? {
                      id: parentAuthor.id,
                      name: parentAuthor.name,
                      username: parentAuthor.username,
                      email: parentAuthor.email,
                      bio: parentAuthor.bio || '',
                      avatar: parentAuthor.avatar || DEFAULT_AVATAR,
                      createdAt: parentAuthor.created_at,
                    }
                  : null,
              };
            }
          } catch {
            // silent parent recipe hydrate failure
          }
        }

        // Follow status of recipe author
        let isFollowingAuthor = false;
        if (currentUserId && currentUserId !== r.author_id) {
          const { data: followRecord } = await insforge.database
            .from('follows')
            .select('id')
            .eq('follower_id', currentUserId)
            .eq('following_id', r.author_id)
            .limit(1);
          isFollowingAuthor = !!(followRecord && followRecord.length > 0);
        }

        return {
          id: r.id,
          author_id: r.author_id,
          title: r.title,
          description: r.description || '',
          media: r.media || '',
          ingredients: [],
          steps: [],
          preparation_time: r.preparation_time || 15,
          cooking_time: r.cooking_time || 20,
          servings: r.servings || 4,
          nutrition: parseNutrition(r.nutrition),
          tags: parseTags(r.tags),
          parent_recipe_id: r.parent_recipe_id || null,
          created_at: r.created_at,
          updated_at: r.updated_at,
          author,
          likeCount,
          commentCount,
          forkCount,
          hasLiked,
          hasSaved: savedRecipeIds.has(r.id),
          isFollowingAuthor,
          parentRecipe,
        };
      })
    );

    // Apply Client-Side Filter refinements for maximum precision across JSON & array fields
    if (params?.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      recipes = recipes.filter((rec) => {
        const titleMatch = (rec.title || '').toLowerCase().includes(q);
        const descMatch = (rec.description || '').toLowerCase().includes(q);
        const authorNameMatch = (rec.author?.name || '').toLowerCase().includes(q);
        const usernameMatch = (rec.author?.username || '').toLowerCase().includes(q);
        const tagsMatch = (rec.tags || []).some((t) => t.toLowerCase().includes(q));
        return titleMatch || descMatch || authorNameMatch || usernameMatch || tagsMatch;
      });
    }

    if (params?.tag && params.tag !== 'All') {
      const target = params.tag.toLowerCase();
      recipes = recipes.filter((rec) =>
        (rec.tags || []).some((t) => t.toLowerCase() === target)
      );
    }

    if (params?.tags && params.tags.length > 0) {
      const targetTags = params.tags.map((t) => t.toLowerCase());
      recipes = recipes.filter((rec) => {
        const recTags = (rec.tags || []).map((t) => t.toLowerCase());
        return targetTags.some((target) => recTags.includes(target));
      });
    }

    // Cooking Time Filter: Under 15m, 15-30m, 30-60m, Over 60m
    if (params?.cookingTimeRange && params.cookingTimeRange !== 'all') {
      recipes = recipes.filter((rec) => {
        const cook = Number(rec.cooking_time) || 0;
        if (params.cookingTimeRange === '<15') return cook < 15;
        if (params.cookingTimeRange === '15-30') return cook >= 15 && cook <= 30;
        if (params.cookingTimeRange === '30-60') return cook >= 30 && cook <= 60;
        if (params.cookingTimeRange === '>60') return cook > 60;
        return true;
      });
    }

    // Preparation Time Filter: Under 15m, 15-30m, 30-60m, Over 60m
    if (params?.prepTimeRange && params.prepTimeRange !== 'all') {
      recipes = recipes.filter((rec) => {
        const prep = Number(rec.preparation_time) || 0;
        if (params.prepTimeRange === '<15') return prep < 15;
        if (params.prepTimeRange === '15-30') return prep >= 15 && prep <= 30;
        if (params.prepTimeRange === '30-60') return prep >= 30 && prep <= 60;
        if (params.prepTimeRange === '>60') return prep > 60;
        return true;
      });
    }

    // Servings Filter: 1-2, 3-4, 5+
    if (params?.servingsRange && params.servingsRange !== 'all') {
      recipes = recipes.filter((rec) => {
        const s = Number(rec.servings) || 1;
        if (params.servingsRange === '1-2') return s >= 1 && s <= 2;
        if (params.servingsRange === '3-4') return s >= 3 && s <= 4;
        if (params.servingsRange === '5+') return s >= 5;
        return true;
      });
    }

    // Calories Filter: Under 300 kcal, 300-500 kcal, 500-800 kcal, Over 800 kcal
    if (params?.caloriesRange && params.caloriesRange !== 'all') {
      recipes = recipes.filter((rec) => {
        const rawCalories = rec.nutrition?.calories;
        if (rawCalories === undefined || rawCalories === null || isNaN(Number(rawCalories))) {
          // If a recipe does not contain usable nutrition/calorie information:
          // handle it gracefully, do not invent a calorie value, and exclude from specific calorie ranges
          return false;
        }
        const cal = Number(rawCalories);
        if (cal <= 0) return false;
        if (params.caloriesRange === '<300') return cal < 300;
        if (params.caloriesRange === '300-500') return cal >= 300 && cal <= 500;
        if (params.caloriesRange === '500-800') return cal >= 500 && cal <= 800;
        if (params.caloriesRange === '>800') return cal > 800;
        return true;
      });
    }

    // Backward-compatible time and calorie filters
    if (params?.maxTotalTime && params.maxTotalTime > 0) {
      recipes = recipes.filter((rec) => {
        const total = (rec.preparation_time || 0) + (rec.cooking_time || 0);
        return total <= params.maxTotalTime!;
      });
    }

    if (params?.maxCalories && params.maxCalories > 0) {
      recipes = recipes.filter((rec) => {
        const cal = Number(rec.nutrition?.calories) || 0;
        return cal > 0 && cal <= params.maxCalories!;
      });
    }

    // Sorting: Newest, Oldest, Most Liked, etc.
    if (params?.sort === 'popular') {
      // Most Liked: using REAL data from public.likes
      recipes.sort((a, b) => {
        const diff = (b.likeCount || 0) - (a.likeCount || 0);
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (params?.sort === 'oldest') {
      // Oldest: real created_at ascending
      recipes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (params?.sort === 'forked') {
      recipes.sort((a, b) => (b.forkCount || 0) - (a.forkCount || 0));
    } else if (params?.sort === 'quickest') {
      recipes.sort((a, b) => {
        const totalA = (a.preparation_time || 0) + (a.cooking_time || 0);
        const totalB = (b.preparation_time || 0) + (b.cooking_time || 0);
        return totalA - totalB;
      });
    } else if (params?.sort === 'calories') {
      recipes.sort((a, b) => {
        const calA = Number(a.nutrition?.calories) || 999999;
        const calB = Number(b.nutrition?.calories) || 999999;
        return calA - calB;
      });
    } else {
      // Default: 'newest' / 'recent' (real created_at descending)
      recipes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return { recipes };
  },

  async getRecipe(id: string): Promise<{ recipe: RecipeDetailData }> {
    const currentUserId = await getSafeCurrentUserId();

    // Fetch primary recipe record
    const { data: r, error } = await insforge.database
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !r) {
      throw new Error('Recipe not found in InsForge database');
    }

    // Fetch ingredients
    const { data: rawIngredients } = await insforge.database
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', id)
      .order('order_index', { ascending: true });

    const ingredients: Ingredient[] = (rawIngredients || []).map((i: any) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity || '',
      unit: i.unit || '',
    }));

    // Fetch steps
    const { data: rawSteps } = await insforge.database
      .from('recipe_steps')
      .select('*')
      .eq('recipe_id', id)
      .order('step_number', { ascending: true });

    const steps: RecipeStep[] = (rawSteps || []).map((s: any) => ({
      id: s.id,
      step_number: s.step_number,
      instruction: s.instruction,
    }));

    // Fetch author profile
    const { data: authorProfile } = await insforge.database
      .from('profiles')
      .select('*')
      .eq('id', r.author_id)
      .single();

    const author: User = {
      id: r.author_id,
      name: authorProfile?.name || 'Chef',
      username: authorProfile?.username || 'chef',
      email: authorProfile?.email || '',
      bio: authorProfile?.bio || '',
      avatar: authorProfile?.avatar || DEFAULT_AVATAR,
      createdAt: authorProfile?.created_at || r.created_at,
    };

    // Likes
    const { data: likesData } = await insforge.database
      .from('likes')
      .select('user_id')
      .eq('recipe_id', id);

    const likeCount = likesData?.length || 0;
    const hasLiked = currentUserId ? !!likesData?.some((l: any) => l.user_id === currentUserId) : false;

    // Saved status
    let hasSaved = false;
    if (currentUserId) {
      try {
        const { data: savedRecord } = await insforge.database
          .from('saved_recipes')
          .select('id')
          .eq('recipe_id', id)
          .eq('user_id', currentUserId)
          .limit(1);
        hasSaved = !!(savedRecord && savedRecord.length > 0);
      } catch {
        hasSaved = false;
      }
    }

    // Follow status
    let isFollowingAuthor = false;
    if (currentUserId && currentUserId !== r.author_id) {
      const { data: followRecord } = await insforge.database
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', r.author_id)
        .limit(1);
      isFollowingAuthor = !!(followRecord && followRecord.length > 0);
    }

    // Comments
    const { data: rawComments } = await insforge.database
      .from('comments')
      .select('*')
      .eq('recipe_id', id)
      .order('created_at', { ascending: false });

    const comments: Comment[] = await Promise.all(
      (rawComments || []).map(async (c: any) => {
        const { data: commenterProfile } = await insforge.database
          .from('profiles')
          .select('*')
          .eq('id', c.user_id)
          .single();

        return {
          id: c.id,
          recipe_id: c.recipe_id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          author: commenterProfile
            ? {
                id: commenterProfile.id,
                name: commenterProfile.name,
                username: commenterProfile.username,
                email: commenterProfile.email,
                bio: commenterProfile.bio || '',
                avatar: commenterProfile.avatar || DEFAULT_AVATAR,
                createdAt: commenterProfile.created_at,
              }
            : null,
        };
      })
    );

    // Direct forks
    const { data: rawDirectForks } = await insforge.database
      .from('recipes')
      .select('*')
      .eq('parent_recipe_id', id)
      .order('created_at', { ascending: false });

    const directForks = await Promise.all(
      (rawDirectForks || []).map(async (df: any) => {
        const { data: forkAuthorProfile } = await insforge.database
          .from('profiles')
          .select('*')
          .eq('id', df.author_id)
          .single();

        return {
          id: df.id,
          title: df.title,
          description: df.description || '',
          media: df.media || '',
          createdAt: df.created_at,
          author: {
            id: df.author_id,
            name: forkAuthorProfile?.name || 'Chef',
            username: forkAuthorProfile?.username || 'chef',
            email: forkAuthorProfile?.email || '',
            bio: forkAuthorProfile?.bio || '',
            avatar: forkAuthorProfile?.avatar || DEFAULT_AVATAR,
            createdAt: forkAuthorProfile?.created_at || df.created_at,
          },
        };
      })
    );

    // Ancestor lineage chain
    const ancestors: { id: string; title: string; authorName: string; created_at: string }[] = [];
    let currentParentId = r.parent_recipe_id;
    let depth = 0;
    while (currentParentId && depth < 10) {
      try {
        const { data: ancestorData } = await insforge.database
          .from('recipes')
          .select('id, title, author_id, parent_recipe_id, created_at')
          .eq('id', currentParentId)
          .single();

        if (!ancestorData) break;

        const { data: ancestorAuthor } = await insforge.database
          .from('profiles')
          .select('name')
          .eq('id', ancestorData.author_id)
          .single();

        ancestors.unshift({
          id: ancestorData.id,
          title: ancestorData.title,
          authorName: ancestorAuthor?.name || 'Chef',
          created_at: ancestorData.created_at,
        });

        currentParentId = ancestorData.parent_recipe_id;
        depth++;
      } catch {
        break;
      }
    }

    // Parent recipe summary
    let parentRecipe: ParentRecipeSummary | null = null;
    if (r.parent_recipe_id) {
      try {
        const { data: parentData } = await insforge.database
          .from('recipes')
          .select('id, title, description, media, author_id')
          .eq('id', r.parent_recipe_id)
          .single();

        if (parentData) {
          const { data: parentAuthor } = await insforge.database
            .from('profiles')
            .select('*')
            .eq('id', parentData.author_id)
            .single();

          parentRecipe = {
            id: parentData.id,
            title: parentData.title,
            description: parentData.description,
            media: parentData.media,
            authorName: parentAuthor?.name || 'Chef',
            author: parentAuthor
              ? {
                  id: parentAuthor.id,
                  name: parentAuthor.name,
                  username: parentAuthor.username,
                  email: parentAuthor.email,
                  bio: parentAuthor.bio || '',
                  avatar: parentAuthor.avatar || DEFAULT_AVATAR,
                  createdAt: parentAuthor.created_at,
                }
              : null,
          };
        }
      } catch {
        // silent
      }
    }

    const recipeDetail: RecipeDetailData = {
      id: r.id,
      author_id: r.author_id,
      title: r.title,
      description: r.description || '',
      media: r.media || '',
      ingredients,
      steps,
      preparation_time: r.preparation_time || 15,
      cooking_time: r.cooking_time || 20,
      servings: r.servings || 4,
      nutrition: parseNutrition(r.nutrition),
      tags: parseTags(r.tags),
      parent_recipe_id: r.parent_recipe_id || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
      author,
      likeCount,
      commentCount: comments.length,
      forkCount: directForks.length,
      hasLiked,
      hasSaved,
      isFollowingAuthor,
      parentRecipe,
      comments,
      directForks,
      ancestors,
    };

    return { recipe: recipeDetail };
  },

  async createRecipe(payload: Partial<Recipe> & { title: string; ingredients: any[]; steps: any[]; authorProfile?: User }) {
    const { data: currentAuth, error: authErr } = await insforge.auth.getCurrentUser();
    if (authErr || !currentAuth?.user) {
      throw new Error('Please log in to publish a recipe');
    }
    const currentUserId = currentAuth.user.id;

    const { data: profileRow } = await insforge.database
      .from('profiles')
      .select('id')
      .eq('id', currentUserId)
      .single();

    if (!profileRow) {
      const profileSource = payload.authorProfile;
      if (!profileSource || profileSource.id !== currentUserId) {
        throw new Error('Your authenticated profile is not ready. Please log in again before publishing a recipe.');
      }

      const { error: profileError } = await insforge.database.from('profiles').upsert({
        id: currentUserId,
        name: profileSource.name,
        username: profileSource.username,
        email: profileSource.email,
        bio: profileSource.bio || '',
        avatar: profileSource.avatar || DEFAULT_AVATAR,
      });
      if (profileError) {
        throw new Error('Your authenticated profile is not ready. Please log in again before publishing a recipe.');
      }
    }

    // Insert recipe record
    const { data: recipeRecord, error: recipeErr } = await insforge.database
      .from('recipes')
      .insert({
        author_id: currentUserId,
        title: payload.title,
        description: payload.description || '',
        media: payload.media || '',
        preparation_time: payload.preparation_time ?? 0,
        cooking_time: payload.cooking_time ?? 0,
        servings: payload.servings ?? 1,
        nutrition: payload.nutrition || {},
        tags: payload.tags || [],
        parent_recipe_id: payload.parent_recipe_id || null,
      })
      .select()
      .single();

    if (recipeErr || !recipeRecord) {
      console.error('Failed to create recipe in InsForge database:', recipeErr);
      throw new Error(recipeErr?.message || 'Failed to save recipe');
    }

    const recipeId = recipeRecord.id;

    // Insert ingredients
    if (payload.ingredients && payload.ingredients.length > 0) {
      const ingredientRows = payload.ingredients.map((ing: any, idx: number) => ({
        recipe_id: recipeId,
        name: ing.name,
        quantity: ing.quantity || '',
        unit: ing.unit || '',
        order_index: idx,
      }));
      await insforge.database.from('recipe_ingredients').insert(ingredientRows);
    }

    // Insert steps
    if (payload.steps && payload.steps.length > 0) {
      const stepRows = payload.steps.map((step: any, idx: number) => ({
        recipe_id: recipeId,
        step_number: step.step_number || idx + 1,
        instruction: step.instruction,
      }));
      await insforge.database.from('recipe_steps').insert(stepRows);
    }

    // If this recipe is a fork, notify the parent author
    if (payload.parent_recipe_id) {
      try {
        const { data: parentData } = await insforge.database
          .from('recipes')
          .select('author_id, title')
          .eq('id', payload.parent_recipe_id)
          .single();

        if (parentData && parentData.author_id !== currentUserId) {
          const { data: chefProfile } = await insforge.database
            .from('profiles')
            .select('name')
            .eq('id', currentUserId)
            .single();

          await insforge.database.from('notifications').insert({
            user_id: parentData.author_id,
            sender_id: currentUserId,
            type: 'fork',
            recipe_id: recipeId,
            message: `${chefProfile?.name || 'A chef'} forked your recipe "${parentData.title}" into "${payload.title}"`,
            read: false,
          });
        }
      } catch (notifErr) {
        console.warn('Could not dispatch fork notification:', notifErr);
      }
    }

    // Return the newly created recipe
    const { recipe } = await this.getRecipe(recipeId);
    return { recipe };
  },

  async deleteRecipe(id: string) {
    const { data: currentAuth } = await insforge.auth.getCurrentUser();
    const currentUserId = currentAuth?.user?.id || (await getSafeCurrentUserId());
    if (!currentUserId) {
      throw new Error('Please log in to delete this recipe');
    }

    // 1. Fetch current recipe to verify existence, ownership, media, and parent_recipe_id
    const { data: recipe, error: fetchErr } = await insforge.database
      .from('recipes')
      .select('id, author_id, media, parent_recipe_id')
      .eq('id', id)
      .single();

    if (fetchErr || !recipe) {
      throw new Error('Recipe not found');
    }

    if (recipe.author_id !== currentUserId) {
      throw new Error('Unauthorized: You can only delete recipes you own');
    }

    // 2. Clean up all dependent records safely to respect database foreign-key constraints
    // - recipe_ingredients
    try {
      await insforge.database.from('recipe_ingredients').delete().eq('recipe_id', id);
    } catch (ingErr) {
      console.warn('Notice while deleting recipe_ingredients:', ingErr);
    }

    // - recipe_steps
    try {
      await insforge.database.from('recipe_steps').delete().eq('recipe_id', id);
    } catch (stepErr) {
      console.warn('Notice while deleting recipe_steps:', stepErr);
    }

    // - likes
    try {
      await insforge.database.from('likes').delete().eq('recipe_id', id);
    } catch (likeErr) {
      console.warn('Notice while deleting likes:', likeErr);
    }

    // - comments
    try {
      await insforge.database.from('comments').delete().eq('recipe_id', id);
    } catch (commErr) {
      console.warn('Notice while deleting comments:', commErr);
    }

    // - notifications referencing this recipe
    try {
      await insforge.database.from('notifications').delete().eq('recipe_id', id);
    } catch (notifErr) {
      console.warn('Notice while deleting notifications:', notifErr);
    }

    // - Any child recipes that forked from this recipe:
    // Safely decouple parent_recipe_id so the child forks remain intact and foreign keys do not restrict deletion
    try {
      await insforge.database.from('recipes').update({ parent_recipe_id: null }).eq('parent_recipe_id', id);
    } catch (forkErr) {
      console.warn('Notice while decoupling child forks:', forkErr);
    }

    // 3. Delete the recipe row itself (enforcing author_id matches the authenticated user)
    const { error: delError } = await insforge.database
      .from('recipes')
      .delete()
      .eq('id', id)
      .eq('author_id', currentUserId);

    if (delError) {
      throw new Error(delError.message || 'Failed to delete recipe from database');
    }

    // 4. Safe Storage Cleanup:
    // Only delete media if this recipe actually owns the media object and no other recipe references it
    if (recipe.media) {
      const storageKey = extractStorageKey(recipe.media, 'recipe-media');
      if (storageKey) {
        try {
          // Check if parent recipe has this media (if this recipe is a fork)
          let isParentMedia = false;
          if (recipe.parent_recipe_id) {
            const { data: parent } = await insforge.database
              .from('recipes')
              .select('id, media')
              .eq('id', recipe.parent_recipe_id)
              .single();
            if (parent && parent.media && (parent.media === recipe.media || parent.media.includes(storageKey))) {
              isParentMedia = true;
            }
          }

          if (!isParentMedia) {
            // Check if ANY other recipe in the entire recipes table references this media
            const { data: otherMatches } = await insforge.database
              .from('recipes')
              .select('id')
              .neq('id', id)
              .or(`media.eq.${recipe.media},media.ilike.%${storageKey}%`)
              .limit(1);

            if (!otherMatches || otherMatches.length === 0) {
              const bucket = insforge.storage.from('recipe-media');
              const { error: storageErr } = await bucket.remove(storageKey);
              if (storageErr) {
                console.warn(`Storage removal notice for key "${storageKey}":`, storageErr);
              }
            } else {
              console.info(`Preserving storage object "${storageKey}" because another recipe/fork references it.`);
            }
          } else {
            console.info(`Preserving parent recipe media "${storageKey}".`);
          }
        } catch (storageErr) {
          console.warn('Non-blocking storage removal issue:', storageErr);
        }
      }
    }

    // Notify application views to remove this recipe from feeds/profile/explore
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cheffork:recipe-deleted', { detail: { recipeId: id } }));
    }

    return { success: true };
  },

  async removeRecipeMedia(recipeId: string): Promise<{ success: boolean; mediaType: 'photo' | 'video' }> {
    const { data: currentAuth, error: authErr } = await insforge.auth.getCurrentUser();
    const currentUserId = currentAuth?.user?.id || (await getSafeCurrentUserId());
    if (authErr || !currentUserId) {
      throw new Error('Please log in to remove recipe media');
    }

    // 1. Fetch current recipe to verify ownership and get media path & parent
    const { data: recipe, error: fetchErr } = await insforge.database
      .from('recipes')
      .select('id, author_id, media, parent_recipe_id')
      .eq('id', recipeId)
      .single();

    if (fetchErr || !recipe) {
      throw new Error('Recipe not found');
    }

    // 2. Ownership check: Only author can remove media
    if (recipe.author_id !== currentUserId) {
      throw new Error('Unauthorized: You can only remove media from recipes you own');
    }

    const currentMedia = recipe.media;
    if (!currentMedia) {
      return { success: true, mediaType: 'photo' };
    }

    const mediaType: 'photo' | 'video' = isVideoUrl(currentMedia) ? 'video' : 'photo';
    const storageKey = extractStorageKey(currentMedia, 'recipe-media');

    // 3. Safe Storage Deletion FIRST:
    // Verify whether parent or any other recipe references this storage file
    if (storageKey) {
      let isParentMedia = false;
      if (recipe.parent_recipe_id) {
        const { data: parent } = await insforge.database
          .from('recipes')
          .select('id, media')
          .eq('id', recipe.parent_recipe_id)
          .single();
        if (parent && parent.media && (parent.media === currentMedia || parent.media.includes(storageKey))) {
          isParentMedia = true;
        }
      }

      if (!isParentMedia) {
        // Check if other recipes reference this media
        const { data: otherMatches } = await insforge.database
          .from('recipes')
          .select('id')
          .neq('id', recipeId)
          .or(`media.eq.${currentMedia},media.ilike.%${storageKey}%`)
          .limit(1);

        if (!otherMatches || otherMatches.length === 0) {
          const bucket = insforge.storage.from('recipe-media');
          const { error: storageErr } = await bucket.remove(storageKey);
          // If storage delete failed and wasn't already gone (404), fail fast without touching database
          if (storageErr) {
            const status = (storageErr as any)?.statusCode || (storageErr as any)?.status;
            const message = storageErr.message || '';
            if (status !== 404 && !message.toLowerCase().includes('not found')) {
              console.error('Storage deletion failed for object:', storageKey, storageErr);
              throw new Error(storageErr.message || 'Failed to remove media from storage');
            }
          }
        } else {
          console.info(`Preserving storage object "${storageKey}" because another recipe/fork references it.`);
        }
      } else {
        console.info(`Preserving parent recipe media "${storageKey}".`);
      }
    }

    // 4. Only after successful storage operation, update database to clear media reference
    const { data: updateData, error: updateErr } = await insforge.database
      .from('recipes')
      .update({
        media: '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', recipeId)
      .eq('author_id', currentUserId)
      .select();

    if (updateErr) {
      throw new Error(updateErr.message || 'Failed to update recipe in database');
    }

    if (!updateData || updateData.length === 0) {
      throw new Error('Failed to remove media: Unauthorized or recipe not found');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cheffork:recipe-updated', { detail: { recipe: { id: recipeId, media: '' } } }));
    }

    return { success: true, mediaType };
  },

  async updateRecipeMedia(recipeId: string, newMediaUrl: string): Promise<{ success: boolean; recipe: RecipeDetailData }> {
    const { data: currentAuth, error: authErr } = await insforge.auth.getCurrentUser();
    const currentUserId = currentAuth?.user?.id || (await getSafeCurrentUserId());
    if (authErr || !currentUserId) {
      throw new Error('Please log in to update recipe media');
    }

    // Verify ownership
    const { data: existing, error: fetchErr } = await insforge.database
      .from('recipes')
      .select('id, author_id, media, parent_recipe_id')
      .eq('id', recipeId)
      .single();

    if (fetchErr || !existing) {
      throw new Error('Recipe not found');
    }

    if (existing.author_id !== currentUserId) {
      throw new Error('Unauthorized: You can only update recipes you own');
    }

    const previousMedia = existing.media;

    const { error: updateErr } = await insforge.database
      .from('recipes')
      .update({
        media: newMediaUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recipeId)
      .eq('author_id', currentUserId);

    if (updateErr) {
      throw new Error(updateErr.message || 'Failed to update recipe media');
    }

    // Clean up replaced media if unreferenced
    if (previousMedia && previousMedia !== newMediaUrl) {
      const oldKey = extractStorageKey(previousMedia, 'recipe-media');
      if (oldKey) {
        try {
          let isParentMedia = false;
          if (existing.parent_recipe_id) {
            const { data: parent } = await insforge.database
              .from('recipes')
              .select('id, media')
              .eq('id', existing.parent_recipe_id)
              .single();
            if (parent && parent.media && (parent.media === previousMedia || parent.media.includes(oldKey))) {
              isParentMedia = true;
            }
          }

          if (!isParentMedia) {
            const { data: otherMatches } = await insforge.database
              .from('recipes')
              .select('id')
              .neq('id', recipeId)
              .or(`media.eq.${previousMedia},media.ilike.%${oldKey}%`)
              .limit(1);

            if (!otherMatches || otherMatches.length === 0) {
              await insforge.storage.from('recipe-media').remove(oldKey);
            }
          }
        } catch {
          // non-blocking
        }
      }
    }

    const { recipe } = await this.getRecipe(recipeId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cheffork:recipe-updated', { detail: { recipe } }));
    }
    return { success: true, recipe };
  },

  async deleteDraftMedia(mediaUrl: string) {
    const storageKey = extractStorageKey(mediaUrl, 'recipe-media');
    if (!storageKey) return;
    try {
      const { data: matchingRecipes } = await insforge.database
        .from('recipes')
        .select('id')
        .or(`media.eq.${mediaUrl},media.ilike.%${storageKey}%`)
        .limit(1);

      if (!matchingRecipes || matchingRecipes.length === 0) {
        await insforge.storage.from('recipe-media').remove(storageKey);
      }
    } catch {
      // non-blocking
    }
  },

  async updateRecipe(
    id: string,
    payload: {
      title: string;
      description?: string;
      media?: string;
      preparation_time?: number;
      cooking_time?: number;
      servings?: number;
      nutrition?: any;
      tags?: string[];
      ingredients: any[];
      steps: any[];
    }
  ): Promise<{ recipe: RecipeDetailData }> {
    const { data: currentAuth, error: authErr } = await insforge.auth.getCurrentUser();
    const currentUserId = currentAuth?.user?.id || (await getSafeCurrentUserId());
    if (authErr || !currentUserId) {
      throw new Error('Please log in to edit this recipe');
    }

    // 1. Verify ownership and get existing record (including parent_recipe_id and media)
    const { data: existing, error: existErr } = await insforge.database
      .from('recipes')
      .select('id, author_id, media, parent_recipe_id')
      .eq('id', id)
      .single();

    if (existErr || !existing) {
      throw new Error('Recipe not found');
    }

    if (existing.author_id !== currentUserId) {
      throw new Error('Unauthorized: You can only edit recipes you own');
    }

    const previousMedia = existing.media;
    const newMedia = payload.media !== undefined ? payload.media.trim() : previousMedia;

    // 2. Safe Media Replacement / Cleanup:
    // If media was removed or changed, clean up previous file from storage if unreferenced
    if (previousMedia && previousMedia !== newMedia) {
      const oldKey = extractStorageKey(previousMedia, 'recipe-media');
      if (oldKey) {
        try {
          let isParentMedia = false;
          if (existing.parent_recipe_id) {
            const { data: parent } = await insforge.database
              .from('recipes')
              .select('id, media')
              .eq('id', existing.parent_recipe_id)
              .single();
            if (parent && parent.media && (parent.media === previousMedia || parent.media.includes(oldKey))) {
              isParentMedia = true;
            }
          }

          if (!isParentMedia) {
            const { data: otherMatches } = await insforge.database
              .from('recipes')
              .select('id')
              .neq('id', id)
              .or(`media.eq.${previousMedia},media.ilike.%${oldKey}%`)
              .limit(1);

            if (!otherMatches || otherMatches.length === 0) {
              await insforge.storage.from('recipe-media').remove(oldKey);
            }
          }
        } catch {
          // non-blocking
        }
      }
    }

    // 3. Update recipe row (preserving id, author_id, and parent_recipe_id!)
    const { error: updateErr } = await insforge.database
      .from('recipes')
      .update({
        title: payload.title.trim(),
        description: payload.description !== undefined ? payload.description.trim() : '',
        media: newMedia,
        preparation_time: payload.preparation_time ?? 0,
        cooking_time: payload.cooking_time ?? 0,
        servings: payload.servings ?? 1,
        nutrition: payload.nutrition || {},
        tags: payload.tags || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('author_id', currentUserId);

    if (updateErr) {
      throw new Error(updateErr.message || 'Failed to update recipe');
    }

    // 4. Sync ingredients: Remove old, insert updated with order_index
    try {
      await insforge.database.from('recipe_ingredients').delete().eq('recipe_id', id);
    } catch (delIngErr) {
      console.warn('Notice deleting ingredients:', delIngErr);
    }

    if (payload.ingredients && payload.ingredients.length > 0) {
      const ingredientRows = payload.ingredients
        .filter((ing: any) => ing.name && ing.name.trim().length > 0)
        .map((ing: any, idx: number) => ({
          recipe_id: id,
          name: ing.name.trim(),
          quantity: ing.quantity ? String(ing.quantity).trim() : '',
          unit: ing.unit ? String(ing.unit).trim() : '',
          order_index: idx,
        }));
      if (ingredientRows.length > 0) {
        const { error: insIngErr } = await insforge.database
          .from('recipe_ingredients')
          .insert(ingredientRows);
        if (insIngErr) {
          console.warn('Warning inserting updated ingredients:', insIngErr);
        }
      }
    }

    // 5. Sync steps: Remove old, insert updated with step_number
    try {
      await insforge.database.from('recipe_steps').delete().eq('recipe_id', id);
    } catch (delStepErr) {
      console.warn('Notice deleting steps:', delStepErr);
    }

    if (payload.steps && payload.steps.length > 0) {
      const stepRows = payload.steps
        .filter((step: any) => step.instruction && step.instruction.trim().length > 0)
        .map((step: any, idx: number) => ({
          recipe_id: id,
          step_number: idx + 1,
          instruction: step.instruction.trim(),
        }));
      if (stepRows.length > 0) {
        const { error: insStepsErr } = await insforge.database
          .from('recipe_steps')
          .insert(stepRows);
        if (insStepsErr) {
          console.warn('Warning inserting updated steps:', insStepsErr);
        }
      }
    }

    const { recipe } = await this.getRecipe(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cheffork:recipe-updated', { detail: { recipe } }));
    }
    return { recipe };
  },

  async toggleLike(recipeId: string, authorProfile?: User) {
    const { data: currentAuth } = await insforge.auth.getCurrentUser();
    if (!currentAuth?.user) {
      throw new Error('Authentication required to like recipes');
    }
    const currentUserId = currentAuth.user.id;

    const { data: profileRow } = await insforge.database
      .from('profiles')
      .select('id')
      .eq('id', currentUserId)
      .single();
    if (!profileRow) {
      if (!authorProfile || authorProfile.id !== currentUserId) {
        throw new Error('Your authenticated profile is not ready. Please log in again before liking recipes.');
      }
      const { error: profileError } = await insforge.database.from('profiles').upsert({
        id: currentUserId,
        name: authorProfile.name,
        username: authorProfile.username,
        email: authorProfile.email,
        bio: authorProfile.bio || '',
        avatar: authorProfile.avatar || DEFAULT_AVATAR,
      });
      if (profileError) {
        throw new Error('Your authenticated profile is not ready. Please log in again before liking recipes.');
      }
    }

    // Check if liked
    const { data: existing } = await insforge.database
      .from('likes')
      .select('id')
      .eq('recipe_id', recipeId)
      .eq('user_id', currentUserId)
      .limit(1);

    const hasLiked = existing && existing.length > 0;

    if (hasLiked) {
      const { error: deleteError } = await insforge.database
        .from('likes')
        .delete()
        .eq('recipe_id', recipeId)
        .eq('user_id', currentUserId);
      if (deleteError) throw new Error(deleteError.message || 'Failed to unlike recipe');
    } else {
      const { error: insertError } = await insforge.database.from('likes').insert({
        recipe_id: recipeId,
        user_id: currentUserId,
      });
      if (insertError) throw new Error(insertError.message || 'Failed to like recipe');

      // Notify recipe author if not self
      try {
        const { data: recData } = await insforge.database
          .from('recipes')
          .select('author_id, title')
          .eq('id', recipeId)
          .single();

        if (recData && recData.author_id !== currentUserId) {
          const { data: likerProfile } = await insforge.database
            .from('profiles')
            .select('name')
            .eq('id', currentUserId)
            .single();

          await insforge.database.from('notifications').insert({
            user_id: recData.author_id,
            sender_id: currentUserId,
            type: 'like',
            recipe_id: recipeId,
            message: `${likerProfile?.name || 'A chef'} liked your recipe "${recData.title}"`,
            read: false,
          });
        }
      } catch {
        // notification non-blocking
      }
    }

    const { data: currentLike, error: currentLikeError } = await insforge.database
      .from('likes')
      .select('id')
      .eq('recipe_id', recipeId)
      .eq('user_id', currentUserId)
      .limit(1);
    const { data: allLikes, error: countError } = await insforge.database
      .from('likes')
      .select('id')
      .eq('recipe_id', recipeId);
    if (currentLikeError || countError) {
      throw new Error(currentLikeError?.message || countError?.message || 'Failed to refresh like state');
    }

    const isLiked = !!currentLike?.length;
    const totalLikes = allLikes?.length || 0;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cheffork:recipe-liked', {
          detail: {
            recipeId,
            isLiked,
            likeCount: totalLikes,
            userId: currentUserId,
          },
        })
      );
    }

    return {
      liked: isLiked,
      totalLikes,
    };
  },

  /**
   * Fetch all real users who liked a specific recipe from public.likes and public.profiles.
   * Computes follow status from public.follows relative to viewerUserId or current authenticated user.
   */
  async getRecipeLikes(
    recipeId: string,
    viewerUserId?: string
  ): Promise<{
    users: FollowerChef[];
    totalCount: number;
  }> {
    if (!recipeId) {
      return { users: [], totalCount: 0 };
    }

    // 1. Query REAL public.likes table where likes.recipe_id = recipeId
    const { data: likeRecords, error: likeErr } = await insforge.database
      .from('likes')
      .select('id, user_id, created_at')
      .eq('recipe_id', recipeId)
      .order('created_at', { ascending: false });

    if (likeErr) {
      if (isTableMissing(likeErr)) {
        return { users: [], totalCount: 0 };
      }
      console.error('Error querying likes from InsForge likes table:', likeErr);
      throw new Error(likeErr.message || 'Unable to load likes.');
    }

    if (!likeRecords || likeRecords.length === 0) {
      return { users: [], totalCount: 0 };
    }

    // 2. Extract real user IDs
    const userIds: string[] = likeRecords
      .map((l: any) => l.user_id)
      .filter((id: any): id is string => typeof id === 'string' && id.trim().length > 0);

    if (userIds.length === 0) {
      return { users: [], totalCount: likeRecords.length };
    }

    // Preserve order while deduplicating
    const orderedUniqueUserIds = Array.from(new Set(userIds));

    // 3. Fetch public profile information for each user from public.profiles
    // Strictly public fields only (NO email addresses, NO private tokens)
    const { data: profiles, error: profileErr } = await insforge.database
      .from('profiles')
      .select('id, name, username, bio, avatar, created_at')
      .in('id', orderedUniqueUserIds);

    if (profileErr) {
      console.error('Error querying profiles table for recipe likes:', profileErr);
      throw new Error(profileErr.message || 'Unable to load liker profiles.');
    }

    const profilesMap = new Map<string, any>();
    if (profiles) {
      profiles.forEach((p: any) => {
        if (p.id) profilesMap.set(p.id, p);
      });
    }

    // 4. Determine if current viewer (authenticated user) is following each liker
    const currentViewerId = viewerUserId !== undefined ? viewerUserId : await getSafeCurrentUserId();
    const followedByViewer = new Set<string>();

    if (currentViewerId) {
      try {
        const { data: viewerFollows } = await insforge.database
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentViewerId)
          .in('following_id', orderedUniqueUserIds);

        if (viewerFollows) {
          viewerFollows.forEach((f: any) => {
            if (f.following_id) followedByViewer.add(f.following_id);
          });
        }
      } catch (e) {
        console.warn('Could not verify viewer follow status for recipe likes list:', e);
      }
    }

    // 5. Query basic counts (recipes count and followers count) for each user
    const recipesCountMap = new Map<string, number>();
    const followersCountMap = new Map<string, number>();

    try {
      const [{ data: recipesData }, { data: followersData }] = await Promise.all([
        insforge.database.from('recipes').select('id, author_id').in('author_id', orderedUniqueUserIds),
        insforge.database.from('follows').select('id, following_id').in('following_id', orderedUniqueUserIds),
      ]);

      if (recipesData) {
        recipesData.forEach((r: any) => {
          if (r.author_id) {
            recipesCountMap.set(r.author_id, (recipesCountMap.get(r.author_id) || 0) + 1);
          }
        });
      }

      if (followersData) {
        followersData.forEach((f: any) => {
          if (f.following_id) {
            followersCountMap.set(f.following_id, (followersCountMap.get(f.following_id) || 0) + 1);
          }
        });
      }
    } catch {
      // non-blocking count enrichment
    }

    // 6. Build the FollowerChef objects in the order of likes
    const users: FollowerChef[] = orderedUniqueUserIds.map((userId) => {
      const p = profilesMap.get(userId);
      return {
        id: userId,
        name: p?.name || 'Chef',
        username: p?.username || 'chef',
        email: '', // Never expose email
        bio: p?.bio || '',
        avatar: p?.avatar || DEFAULT_AVATAR,
        createdAt: p?.created_at || '',
        recipesCount: recipesCountMap.get(userId) || 0,
        followersCount: followersCountMap.get(userId) || 0,
        isFollowing: followedByViewer.has(userId),
      };
    });

    return {
      users,
      totalCount: likeRecords.length,
    };
  },

  // ==========================================================================
  // REAL INSFORGE DATABASE: SAVED / BOOKMARKED RECIPES
  // ==========================================================================

  async saveRecipe(recipeId: string): Promise<{ success: boolean; isSaved: boolean }> {
    const token = authStorage.getToken();
    if (!token) {
      throw new Error('Authentication required to save recipes');
    }
    const currentUserId = await getSafeCurrentUserId();
    if (!currentUserId) {
      throw new Error('Could not identify current authenticated user');
    }

    // Ensure user profile exists in profiles table
    try {
      const { data: profileRow } = await insforge.database
        .from('profiles')
        .select('id')
        .eq('id', currentUserId)
        .single();
      if (!profileRow) {
        await insforge.database
          .from('profiles')
          .insert({
            id: currentUserId,
            name: 'Chef',
            username: `chef_${currentUserId.slice(0, 8)}`,
            email: '',
          });
      }
    } catch {
      // ignore
    }

    // Insert into saved_recipes table
    const { data: insertedData, error, status, statusText } = await insforge.database
      .from('saved_recipes')
      .insert({
        user_id: currentUserId,
        recipe_id: recipeId,
      })
      .select();

    if (error || (status && status >= 400)) {
      if (status === 404 || isTableMissing(error, status)) {
        console.error('[ChefFork Save Recipe Error] InsForge table public.saved_recipes does not exist in database:', {
          status,
          statusText,
          error,
          currentUserId,
          recipeId,
        });
        throw new Error('Database table public.saved_recipes does not exist. Please run insforge-schema.sql in your InsForge SQL editor.');
      }
      // If already saved (unique violation), treat as success
      const errStr = typeof error === 'string' ? error : JSON.stringify(error || {});
      if (error?.code === '23505' || errStr.includes('unique') || errStr.includes('duplicate')) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cheffork:recipe-saved', { detail: { recipeId, isSaved: true } }));
        }
        return { success: true, isSaved: true };
      }
      console.error('[ChefFork Save Recipe Error]:', { error, status, statusText, currentUserId, recipeId });
      throw new Error(error?.message || statusText || 'Failed to save recipe');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cheffork:recipe-saved', { detail: { recipeId, isSaved: true } }));
    }

    return { success: true, isSaved: true };
  },

  async unsaveRecipe(recipeId: string): Promise<{ success: boolean; isSaved: boolean }> {
    const token = authStorage.getToken();
    if (!token) {
      throw new Error('Authentication required to unsave recipes');
    }
    const currentUserId = await getSafeCurrentUserId();
    if (!currentUserId) {
      throw new Error('Could not identify current authenticated user');
    }

    const { error, status, statusText } = await insforge.database
      .from('saved_recipes')
      .delete()
      .eq('user_id', currentUserId)
      .eq('recipe_id', recipeId);

    if (error || (status && status >= 400)) {
      if (status === 404 || isTableMissing(error, status)) {
        return { success: true, isSaved: false };
      }
      console.error('[ChefFork Unsave Recipe Error]:', { error, status, statusText, currentUserId, recipeId });
      throw new Error(error?.message || statusText || 'Failed to remove saved recipe');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cheffork:recipe-saved', { detail: { recipeId, isSaved: false } }));
    }

    return { success: true, isSaved: false };
  },

  async toggleSaveRecipe(recipeId: string): Promise<{ success: boolean; isSaved: boolean }> {
    const token = authStorage.getToken();
    if (!token) {
      throw new Error('Please log in to save recipes to your collection');
    }
    const currentUserId = await getSafeCurrentUserId();
    if (!currentUserId) {
      throw new Error('Authentication required');
    }

    // Check current saved state
    const { data: existing, error, status } = await insforge.database
      .from('saved_recipes')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('recipe_id', recipeId)
      .limit(1);

    if (status === 404 || (error && isTableMissing(error, status))) {
      console.error('[ChefFork Save Recipe Error] Table public.saved_recipes missing');
      throw new Error('Database table public.saved_recipes does not exist. Please run insforge-schema.sql in your InsForge SQL editor.');
    }

    if (existing && existing.length > 0) {
      return await this.unsaveRecipe(recipeId);
    } else {
      return await this.saveRecipe(recipeId);
    }
  },

  async checkIsSaved(recipeId: string, userId?: string): Promise<boolean> {
    const currentUserId = userId || (await getSafeCurrentUserId());
    if (!currentUserId) return false;

    try {
      const { data, error } = await insforge.database
        .from('saved_recipes')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('recipe_id', recipeId)
        .limit(1);

      if (error || !data) return false;
      return data.length > 0;
    } catch {
      return false;
    }
  },

  async getSavedRecipes(params?: { limit?: number }): Promise<{ recipes: Recipe[]; totalCount: number }> {
    const currentUserId = await getSafeCurrentUserId();
    if (!currentUserId) {
      return { recipes: [], totalCount: 0 };
    }

    let query = insforge.database
      .from('saved_recipes')
      .select('recipe_id, created_at')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (params?.limit && params.limit > 0) {
      query = query.limit(params.limit);
    }

    const { data: savedRows, error: savedErr } = await query;

    if (savedErr) {
      if (isTableMissing(savedErr)) {
        return { recipes: [], totalCount: 0 };
      }
      console.error('Error querying saved_recipes:', savedErr);
      throw new Error(savedErr.message || 'Failed to load saved recipes');
    }

    if (!savedRows || savedRows.length === 0) {
      return { recipes: [], totalCount: 0 };
    }

    const recipeIds = savedRows
      .map((r: any) => r.recipe_id)
      .filter((id: any) => typeof id === 'string' && id.trim().length > 0);

    if (recipeIds.length === 0) {
      return { recipes: [], totalCount: 0 };
    }

    // Query recipes table for these IDs
    const { data: rawRecipes, error: recipeErr } = await insforge.database
      .from('recipes')
      .select('*')
      .in('id', recipeIds);

    if (recipeErr) {
      console.error('Error fetching bookmarked recipes from recipes table:', recipeErr);
      throw new Error(recipeErr.message || 'Failed to load recipe details');
    }

    if (!rawRecipes || rawRecipes.length === 0) {
      return { recipes: [], totalCount: 0 };
    }

    // Map recipes preserving the saved_recipes order
    const recipeMap = new Map<string, any>();
    rawRecipes.forEach((r: any) => recipeMap.set(r.id, r));

    const orderedRecipes = recipeIds
      .map((id: string) => recipeMap.get(id))
      .filter(Boolean);

    // Hydrate each recipe
    const recipes: Recipe[] = await Promise.all(
      orderedRecipes.map(async (r: any) => {
        const { data: authorProfile } = await insforge.database
          .from('profiles')
          .select('*')
          .eq('id', r.author_id)
          .single();

        const author: User = {
          id: r.author_id,
          name: authorProfile?.name || 'Chef',
          username: authorProfile?.username || 'chef',
          email: authorProfile?.email || '',
          bio: authorProfile?.bio || '',
          avatar: authorProfile?.avatar || DEFAULT_AVATAR,
          createdAt: authorProfile?.created_at || r.created_at,
        };

        const { data: likesData } = await insforge.database
          .from('likes')
          .select('user_id')
          .eq('recipe_id', r.id);

        const likeCount = likesData?.length || 0;
        const hasLiked = currentUserId ? !!likesData?.some((l: any) => l.user_id === currentUserId) : false;

        const { data: commentsData } = await insforge.database
          .from('comments')
          .select('id')
          .eq('recipe_id', r.id);
        const commentCount = commentsData?.length || 0;

        const { data: forksData } = await insforge.database
          .from('recipes')
          .select('id')
          .eq('parent_recipe_id', r.id);
        const forkCount = forksData?.length || 0;

        let isFollowingAuthor = false;
        if (currentUserId && currentUserId !== r.author_id) {
          const { data: followRecord } = await insforge.database
            .from('follows')
            .select('id')
            .eq('follower_id', currentUserId)
            .eq('following_id', r.author_id)
            .limit(1);
          isFollowingAuthor = !!(followRecord && followRecord.length > 0);
        }

        return {
          id: r.id,
          author_id: r.author_id,
          title: r.title,
          description: r.description || '',
          media: r.media || '',
          ingredients: [],
          steps: [],
          preparation_time: r.preparation_time || 15,
          cooking_time: r.cooking_time || 20,
          servings: r.servings || 4,
          nutrition: parseNutrition(r.nutrition),
          tags: parseTags(r.tags),
          parent_recipe_id: r.parent_recipe_id || null,
          created_at: r.created_at,
          updated_at: r.updated_at,
          author,
          likeCount,
          commentCount,
          forkCount,
          hasLiked,
          hasSaved: true,
          isFollowingAuthor,
          parentRecipe: null,
        };
      })
    );

    return { recipes, totalCount: recipes.length };
  },

  // ==========================================================================
  // REAL INSFORGE DATABASE: COMMENTS
  // ==========================================================================

  async addComment(recipeId: string, content: string, authorProfile?: User) {
    const { data: currentAuth } = await insforge.auth.getCurrentUser();
    if (!currentAuth?.user) {
      throw new Error('Authentication required to comment');
    }
    const currentUserId = currentAuth.user.id;

    const { data: profileRow } = await insforge.database
      .from('profiles')
      .select('id')
      .eq('id', currentUserId)
      .single();

    if (!profileRow) {
      if (!authorProfile || authorProfile.id !== currentUserId) {
        throw new Error('Your authenticated profile is not ready. Please log in again before commenting.');
      }

      const { error: profileError } = await insforge.database.from('profiles').upsert({
        id: currentUserId,
        name: authorProfile.name,
        username: authorProfile.username,
        email: authorProfile.email,
        bio: authorProfile.bio || '',
        avatar: authorProfile.avatar || DEFAULT_AVATAR,
      });
      if (profileError) {
        throw new Error('Your authenticated profile is not ready. Please log in again before commenting.');
      }
    }

    const { data: commentRecord, error } = await insforge.database
      .from('comments')
      .insert({
        recipe_id: recipeId,
        user_id: currentUserId,
        content: content.trim(),
      })
      .select()
      .single();

    if (error || !commentRecord) {
      throw new Error(error?.message || 'Failed to post comment');
    }

    // Fetch author profile
    const { data: profile } = await insforge.database
      .from('profiles')
      .select('*')
      .eq('id', currentUserId)
      .single();

    // Dispatch notification to recipe author if not self
    try {
      const { data: recData } = await insforge.database
        .from('recipes')
        .select('author_id, title')
        .eq('id', recipeId)
        .single();

      if (recData && recData.author_id !== currentUserId) {
        await insforge.database.from('notifications').insert({
          user_id: recData.author_id,
          sender_id: currentUserId,
          type: 'comment',
          recipe_id: recipeId,
          message: `${profile?.name || 'A chef'} commented on "${recData.title}": "${content.slice(0, 50)}"`,
          read: false,
        });
      }
    } catch {
      // non-blocking
    }

    const comment: Comment = {
      id: commentRecord.id,
      recipe_id: commentRecord.recipe_id,
      user_id: commentRecord.user_id,
      content: commentRecord.content,
      created_at: commentRecord.created_at,
      author: profile
        ? {
            id: profile.id,
            name: profile.name,
            username: profile.username,
            email: profile.email,
            bio: profile.bio || '',
            avatar: profile.avatar || DEFAULT_AVATAR,
            createdAt: profile.created_at,
          }
        : null,
    };

    return { comment };
  },

  async deleteComment(recipeId: string, commentId: string) {
    const { data: currentAuth } = await insforge.auth.getCurrentUser();
    if (!currentAuth?.user) {
      throw new Error('Authentication required');
    }

    const { error } = await insforge.database
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', currentAuth.user.id);

    if (error) {
      throw new Error(error.message || 'Failed to delete comment');
    }

    return { success: true };
  },

  async updateComment(commentId: string, content: string) {
    const { data: currentAuth } = await insforge.auth.getCurrentUser();
    if (!currentAuth?.user) {
      throw new Error('Authentication required');
    }

    const { data, error } = await insforge.database
      .from('comments')
      .update({
        content: content.trim(),
      })
      .eq('id', commentId)
      .eq('user_id', currentAuth.user.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update comment');
    }

    return { success: true, comment: data };
  },

  // ==========================================================================
  // REAL INSFORGE DATABASE: NOTIFICATIONS
  // ==========================================================================

  async getNotifications() {
    const { data: currentAuth } = await insforge.auth.getCurrentUser();
    if (!currentAuth?.user) {
      return { notifications: [] };
    }
    const currentUserId = currentAuth.user.id;

    const { data: rawNotifs, error } = await insforge.database
      .from('notifications')
      .select('*')
      .eq('user_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error || !rawNotifs) {
      return { notifications: [] };
    }

    const notifications: NotificationItem[] = await Promise.all(
      rawNotifs.map(async (n: any) => {
        const { data: senderProfile } = await insforge.database
          .from('profiles')
          .select('*')
          .eq('id', n.sender_id)
          .single();

        let recipeTitle: string | undefined;
        if (n.recipe_id) {
          const { data: recData } = await insforge.database
            .from('recipes')
            .select('title')
            .eq('id', n.recipe_id)
            .single();
          recipeTitle = recData?.title;
        }

        return {
          id: n.id,
          user_id: n.user_id,
          sender_id: n.sender_id,
          type: n.type,
          recipe_id: n.recipe_id,
          recipeTitle,
          message: n.message,
          read: !!n.read,
          created_at: n.created_at,
          sender: {
            id: n.sender_id,
            name: senderProfile?.name || 'A chef',
            username: senderProfile?.username || 'chef',
            email: senderProfile?.email || '',
            bio: senderProfile?.bio || '',
            avatar: senderProfile?.avatar || DEFAULT_AVATAR,
            createdAt: senderProfile?.created_at || n.created_at,
          },
        };
      })
    );

    return { notifications };
  },

  async markNotificationRead(id: string) {
    const { data: currentAuth } = await insforge.auth.getCurrentUser();
    if (!currentAuth?.user) {
      return { success: false };
    }

    await insforge.database
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', currentAuth.user.id);

    return { success: true };
  },

  async markAllNotificationsRead() {
    const { data: currentAuth } = await insforge.auth.getCurrentUser();
    if (!currentAuth?.user) {
      return { success: false };
    }

    await insforge.database
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentAuth.user.id);

    return { success: true };
  },
};
