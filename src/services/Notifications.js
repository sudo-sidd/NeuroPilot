import notifee, { TimestampTrigger, TriggerType, AndroidImportance } from '@notifee/react-native';

let defaultChannelId = null;

export const ensureDefaultChannel = async () => {
  if (defaultChannelId) return defaultChannelId;
  defaultChannelId = await notifee.createChannel({
    id: 'default',
    name: 'Default',
    importance: AndroidImportance.DEFAULT,
  });
  return defaultChannelId;
};

export const requestNotificationPermission = async () => {
  const settings = await notifee.requestPermission();
  return settings;
};

export const getPermissionStatus = async () => {
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus;
};

export const displayNotification = async (title, body) => {
  const channelId = await ensureDefaultChannel();
  await notifee.displayNotification({
    title,
    body,
    android: { channelId, smallIcon: 'ic_launcher' }
  });
};

// Phase 4: schedule simple task due reminder (timestamp trigger)
export const scheduleTaskReminder = async ({ taskId, title, body, fireDate }) => {
  const channelId = await ensureDefaultChannel();
  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: fireDate.getTime(),
    alarmManager: true
  };
  return notifee.createTriggerNotification(
    {
      title,
      body,
      android: { channelId, smallIcon: 'ic_launcher', pressAction: { id: 'default' }, groupId: 'tasks' },
      data: { taskId: String(taskId) }
    },
    trigger
  );
};

export const cancelTaskReminder = async (notificationId) => {
  await notifee.cancelNotification(notificationId);
};

export const cancelAllTaskReminders = async () => {
  await notifee.cancelDisplayedNotifications();
};