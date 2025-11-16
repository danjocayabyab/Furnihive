import { useEffect, useState } from "react";
import { subscribe, getUnreadCount, addNotification, markRead, markAllRead, clearAll } from "./notifications";

export default function useSellerNotifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    return subscribe((list) => {
      setItems(list);
      setUnread(getUnreadCount());
    });
  }, []);

  return {
    items,
    unread,
    addNotification,
    markRead,
    markAllRead,
    clearAll,
  };
}
