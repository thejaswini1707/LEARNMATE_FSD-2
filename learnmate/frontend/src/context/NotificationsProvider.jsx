import { useCallback, useMemo } from "react";
import { NotificationsContext } from "./contexts";
import { KEYS, getNotifications } from "../services/api";
import { useAsync } from "../hooks/useAsync";
import { useAuth } from "../hooks/useAuth";

/*
  Loads the signed-in user's notification feed ONCE and shares it with the bell, the sidebar
  "Chat" badge and the mobile bottom navigation. It refreshes whenever Socket.IO reports a change,
  from any page of the app, so badges stay correct without a reload.
*/
export default function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const load = useCallback(() => getNotifications(user), [user]);
  const { data, reload } = useAsync(load, [
    KEYS.notifications, KEYS.bookings, KEYS.reviews, KEYS.mateup, KEYS.chats, KEYS.notifSeen(user.email),
  ]);

  const value = useMemo(() => {
    const items = data?.items ?? [];
    const unreadMessages = data?.unreadMessages ?? 0;
    const unread = data?.unread ?? 0;
    return {
      items,
      seenAt: data?.seenAt ?? 0,
      unread,
      unreadMessages,
      /* unread items that opening the bell clears (chat messages are cleared by opening the chat) */
      unseenInBell: unread - unreadMessages,
      loaded: Boolean(data),
      reload,
    };
  }, [data, reload]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
