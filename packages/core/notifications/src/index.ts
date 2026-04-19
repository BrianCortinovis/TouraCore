export type {
  Notification,
  NotificationPreference,
  NotificationChannel,
  CreateNotificationInput,
  NotificationPreferenceInput,
} from './types'
export {
  CreateNotificationSchema,
  NotificationPreferenceSchema,
  NOTIFICATION_TYPES,
} from './types'

// Core M081+ pipeline
export { encryptJson, decryptJson, signUnsubscribeToken } from './crypto'
export { renderTemplate, renderEmail } from './render'
export {
  enqueueNotification,
  dispatchQueueItem,
  dispatchPending,
  type EnqueueInput,
  type EnqueueResult,
  type NotificationScope,
} from './pipeline'
export {
  saveProvider,
  deleteProvider,
  listProviders,
  getProviderConfig,
  type ProviderKey,
  type ProviderScope,
  type SaveProviderInput,
} from './providers'
export {
  unsubscribeByToken,
  setPreference,
  listPreferences,
} from './preferences'
export {
  createInboxEntry,
  getUnreadCount,
  listInbox,
  markAsRead,
  markAllAsRead,
  archiveEntry,
  type InboxEntry,
} from './inbox'
export {
  saveTemplate,
  listTemplates,
  type TemplateRow,
} from './templates'
export {
  resendSend,
  mailgunSend,
  twilioSmsSend,
  twilioWhatsAppSend,
  metaWhatsAppSend,
  slackSend,
  webPushSend,
  type AdapterResult,
  type Channel,
} from './adapters'
