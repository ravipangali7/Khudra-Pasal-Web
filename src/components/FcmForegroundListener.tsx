import { useEffect } from "react";
import { subscribeForegroundPushNotifications } from "@/lib/firebaseMessaging";
import { toast } from "@/components/ui/sonner";

/**
 * Shows in-app toasts for FCM messages while the tab is in the foreground.
 */
export default function FcmForegroundListener() {
  useEffect(() => {
    const unsubscribe = subscribeForegroundPushNotifications(({ title, body }) => {
      toast(title, { description: body || undefined });
    });
    return unsubscribe;
  }, []);

  return null;
}
