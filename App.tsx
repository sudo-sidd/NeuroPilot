import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/Database';
import { requestNotificationPermission } from './src/services/Notifications';
import { ThemeProvider } from './src/constants/theme';

const App = () => {
  useEffect(() => {
    initDatabase();
    requestNotificationPermission();
  }, []);

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
};

export default App;
