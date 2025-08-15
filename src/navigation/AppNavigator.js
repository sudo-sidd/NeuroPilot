import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TaskScreen from '../screens/TaskScreen';
import DailyFormScreen from '../screens/DailyFormScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import DatabaseScreen from '../screens/DatabaseScreen';
import FAB from '../components/ui/FAB';
import { useTheme } from '../constants/theme';
import { Text } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { palette } = useTheme();
  return (
    <Tab.Navigator
      initialRouteName="ActivityTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
      }}
    >
      <Tab.Screen name="ActivityTab" component={ActivityScreen} options={{ title: 'Activity', tabBarIcon: () => <Text>⏱️</Text> }} />
      <Tab.Screen name="TasksTab" component={TaskScreen} options={{ title: 'Tasks', tabBarIcon: () => <Text>🗂️</Text> }} />
      <Tab.Screen name="JournalTab" component={DailyFormScreen} options={{ title: 'Journal', tabBarIcon: () => <Text>📝</Text> }} />
      <Tab.Screen name="ReportsTab" component={ReportsScreen} options={{ title: 'Reports', tabBarIcon: () => <Text>📊</Text> }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings', tabBarIcon: () => <Text>⚙️</Text> }} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      {/* existing stack screens remain for deep links / non-tab navigations */}
      <Stack.Screen name="Activity" component={ActivityScreen} />
      <Stack.Screen name="Database" component={DatabaseScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;