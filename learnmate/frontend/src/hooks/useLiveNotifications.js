import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { onLiveNotification } from "../services/socket";
import { useToast } from "./useToast";

/*
  Shows a toast the moment the server pushes a new notification, on ANY page. The one exception is
  a chat message for the conversation you already have open - you can see it arrive.
*/
export function useLiveNotifications() {
  const toast = useToast();
  const location = useLocation();

  useEffect(() => onLiveNotification((n) => {
    if (n.kind === "message" && location.pathname === "/chat") {
      const openWith = new URLSearchParams(location.search).get("with");
      if (openWith && openWith === n.fromEmail) return;
    }
    toast.info(n.preview ? `${n.text}: ${n.preview}` : n.text);
  }), [toast, location.pathname, location.search]);
}
