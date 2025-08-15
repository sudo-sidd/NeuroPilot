import { requestNotificationPermission, displayNotification } from '../services/Notifications';
import notifee from '@notifee/react-native';

jest.mock('@notifee/react-native', () => ({
  requestPermission: jest.fn(() => Promise.resolve()),
  createChannel: jest.fn(() => Promise.resolve('default')),
  displayNotification: jest.fn(() => Promise.resolve()),
}));

describe('Notifications', () => {
  it('should request notification permission', async () => {
    await requestNotificationPermission();
    expect(notifee.requestPermission).toHaveBeenCalled();
  });

  it('should display a notification', async () => {
    const title = 'Test Title';
    const body = 'Test Body';
    await displayNotification(title, body);
    expect(notifee.createChannel).toHaveBeenCalledWith({
      id: 'default',
      name: 'Default Channel',
    });
    expect(notifee.displayNotification).toHaveBeenCalledWith({
      title,
      body,
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
      },
    });
  });
});