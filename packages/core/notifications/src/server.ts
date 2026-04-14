export { notify, type NotifyInput } from './service';
export {
  createNotification,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUserPreferences,
  setPreference,
  isNotificationEnabled,
} from './queries';
export {
  sendEmail,
  bookingConfirmationEmail,
  welcomeEmail,
  passwordResetEmail,
  type SendEmailInput,
} from './email';
