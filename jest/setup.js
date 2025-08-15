
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(fn => {
      fn({
        executeSql: jest.fn((sql, args, successCallback, errorCallback) => {
          if (sql.includes('INSERT')) {
            successCallback(null, { insertId: 1 }); // Simulate successful insert
          } else if (sql.includes('SELECT')) {
            // Simulate returning mock users for SELECT statements
            const mockUsers = [
              { id: 1, name: 'John Doe', email: 'john.doe@example.com' },
              { id: 2, name: 'Jane Doe', email: 'jane.doe@example.com' },
            ];
            successCallback(null, { rows: { length: mockUsers.length, item: (idx) => mockUsers[idx] } });
          } else {
            successCallback();
          }
        }),
      });
    }),
  })),
}));

jest.mock('@notifee/react-native', () => ({
  requestPermission: jest.fn(() => Promise.resolve()),
  createChannel: jest.fn(() => Promise.resolve('default')),
  displayNotification: jest.fn(() => Promise.resolve()),
}));
