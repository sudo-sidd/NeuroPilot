import { initDatabase, addUser, getUsers } from '../services/Database';

describe('Database', () => {
  beforeEach(() => {
    // Clear the mock database before each test
    jest.clearAllMocks();
  });

  it('should initialize the database without errors', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    initDatabase();
    expect(consoleSpy).toHaveBeenCalledWith('Users table created successfully');
  });

  it('should add a user to the database', async () => {
    const mockInsertId = 1;
    // Mock the executeSql to simulate a successful insert
    jest.mock('react-native-sqlite-storage', () => ({
      openDatabase: jest.fn(() => ({
        transaction: jest.fn(fn => {
          fn({
            executeSql: jest.fn((sql, args, successCallback) => {
              successCallback(null, { insertId: mockInsertId });
            }),
          });
        }),
      })),
    }));

    const name = 'John Doe';
    const email = 'john.doe@example.com';
    const insertId = await addUser(name, email);
    expect(insertId).toBe(mockInsertId);
  });

  it('should retrieve users from the database', async () => {
    const mockUsers = [
      { id: 1, name: 'John Doe', email: 'john.doe@example.com' },
      { id: 2, name: 'Jane Doe', email: 'jane.doe@example.com' },
    ];
    // Mock the executeSql to simulate retrieving users
    jest.mock('react-native-sqlite-storage', () => ({
      openDatabase: jest.fn(() => ({
        transaction: jest.fn(fn => {
          fn({
            executeSql: jest.fn((sql, args, successCallback) => {
              successCallback(null, { rows: { length: mockUsers.length, item: (idx) => mockUsers[idx] } });
            }),
          });
        }),
      })),
    }));

    const users = await getUsers();
    expect(users).toEqual(mockUsers);
  });
});