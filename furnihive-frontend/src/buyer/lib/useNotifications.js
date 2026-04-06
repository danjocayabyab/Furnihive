import { useEffect, useState } from "react";
import { subscribe, getUnreadCount, addNotification, markRead, markAllRead, clearAll, fetchNotificationsFromSupabase, subscribeToRealtimeNotifications } from "./notifications";
import { useAuth } from "../../components/contexts/AuthContext";

export default function useBuyerNotifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    // Subscribe to local notification state
    const unsubscribe = subscribe((list) => {
      setItems(list);
      setUnread(getUnreadCount());
    });

    // Fetch existing notifications from Supabase
    if (user?.id) {
      fetchNotificationsFromSupabase(user.id);
    }

    // Subscribe to realtime notifications
    const unsubscribeRealtime = user?.id ? subscribeToRealtimeNotifications(user.id) : () => {};

    return () => {
      unsubscribe();
      unsubscribeRealtime();
    };
  }, [user?.id]);

  return {
    items,
    unread,
    addNotification,
    markRead,
    markAllRead,
    clearAll,
  };
}
