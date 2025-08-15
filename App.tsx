import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/Database';
import { requestNotificationPermission } from './src/services/Notifications';
import { ThemeProvider } from './src/constants/theme';
import FAB from './src/components/ui/FAB';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';

const Root = () => {
  const navRef = useNavigationContainerRef();
  const [current, setCurrent] = React.useState('');

  return (
    <ThemeProvider>
      <NavigationContainer ref={navRef} onStateChange={() => setCurrent(navRef.getCurrentRoute()?.name || '')}>
        <AppNavigator />
        <FAB
          icon={current.includes('Activity') ? '■' : current.includes('Tasks') ? '＋' : current.includes('Journal') ? '✎' : current.includes('Reports') ? '⇪' : '＋'}
          label="contextual action"
          onPress={() => { /* TODO step 3+ actions */ }}
        />
      </NavigationContainer>
    </ThemeProvider>
  );
};

const App = () => {
  useEffect(() => {
    initDatabase();
    requestNotificationPermission();
  }, []);

  return <Root />;
};

export default App;
