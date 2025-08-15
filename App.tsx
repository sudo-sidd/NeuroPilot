
import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/Database';
import { requestNotificationPermission } from './src/services/Notifications';

const App = () => {
  useEffect(() => {
    initDatabase();
    requestNotificationPermission();
  }, []);

  return <AppNavigator />;
};

export default App;
