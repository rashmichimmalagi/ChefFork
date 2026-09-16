import React, { useEffect, useState, useCallback } from 'react';
import { Bell, Heart, MessageSquare, GitFork, UserPlus, CheckCheck, Clock } from 'lucide-react';
import { NotificationItem } from '../types';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Avatar } from '../components/Avatar';

interface NotificationsPageProps {
  onOpenRecipe: (id: string) => void;
  onOpenProfile: (userId: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  onOpenRecipe,
  onOpenProfile,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadNotifications = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch (err: any) {
      console.warn('Notifications fetch error:', err);
      showToast(err.message || 'Could not load notifications', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast('All notifications marked as read');
    } catch (err: any) {
      showToast(err.message || 'Failed to update notifications', 'error');
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      try {
        await api.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch (e) {
        // ignore
      }
    }

    if (notif.recipe_id) {
      onOpenRecipe(notif.recipe_id);
    } else if (notif.sender_id) {
      onOpenProfile(notif.sender_id);
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'fork':
        return <GitFork className="w-4 h-4 text-orange-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bell className="w-4 h-4 text-stone-500" />;
    }
  };

  return (
    <div id="notifications-page" className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-600" />
            <span>Activity & Notifications</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Likes, comments, forks, and new followers
          </p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5 text-orange-600" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-16 rounded-xl bg-stone-200 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      ) : !currentUser ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
          <Bell className="w-12 h-12 mx-auto text-stone-400 mb-3" />
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Sign in for Activity</h3>
          <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">
            Log in to see who forked your recipes, left notes, or followed your culinary adventures.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="mt-4 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm transition-colors cursor-pointer"
          >
            Log In
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
          <Bell className="w-12 h-12 mx-auto text-stone-400 mb-3" />
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">No Notifications Yet</h3>
          <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">
            When chefs like, comment on, or fork your creations, your updates will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                notif.read
                  ? 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300'
                  : 'bg-orange-50/60 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/60 text-stone-900 dark:text-stone-100 font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <Avatar src={notif.sender?.avatar} name={notif.sender?.name} sizeClassName="w-10 h-10" />
                  <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-stone-900 shadow-xs">
                    {getIcon(notif.type)}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-bold">{notif.sender?.name || 'A chef'}</span>{' '}
                    <span className="text-stone-600 dark:text-stone-400 font-normal">
                      {notif.type === 'like' && 'liked your recipe'}
                      {notif.type === 'comment' && 'commented on'}
                      {notif.type === 'fork' && 'forked your recipe'}
                      {notif.type === 'follow' && 'started following you'}
                    </span>{' '}
                    {notif.recipeTitle && <span className="font-semibold text-orange-600 dark:text-orange-400">&ldquo;{notif.recipeTitle}&rdquo;</span>}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-stone-400 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(notif.created_at || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {!notif.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-orange-600 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
