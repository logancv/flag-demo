import { getFlag } from "./flags";

interface Notification {
  userId: string;
  type: string;
  message: string;
  timestamp: number;
}

export function sendNotification(notification: Notification) {
  if (getFlag("improved_notifications")) {
    return enqueueForDigest(notification);
  }
  return sendImmediately(notification);
}

function enqueueForDigest(notification: Notification) {
  digestQueue.push(notification);
  scheduleDigestDelivery(notification.userId);
}

function sendImmediately(notification: Notification) {
  return emailService.send(notification.userId, notification.message);
}

export function getNotificationPreferences(userId: string) {
  if (getFlag("improved_notifications")) {
    return {
      digestEnabled: true,
      digestFrequency: getUserDigestFrequency(userId),
      channels: ["email", "in_app", "push"],
    };
  }
  return { channels: ["email"] };
}
