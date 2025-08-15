import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import TaskScreen from '../screens/TaskScreen';
import DailyFormScreen from '../screens/DailyFormScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import DatabaseScreen from '../screens/DatabaseScreen';
import { palette } from '../constants/theme';
import { Text } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => (
  <Tab.Navigator
    initialRouteName="HomeTab"
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: palette.primary,
      tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e2e8f0' },
      tabBarLabelStyle: { fontSize: 12, fontWeight: '600' }
    }}
  >
    <Tab.Screen name="TasksTab" component={TaskScreen} options={{ title: 'Tasks', tabBarIcon: () => <Text>🗂️</Text> }} />
    <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Action', tabBarIcon: () => <Text>⚡</Text> }} />
    <Tab.Screen name="JournalTab" component={DailyFormScreen} options={{ title: 'Journal', tabBarIcon: () => <Text>📝</Text> }} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Activity" component={ActivityScreen} />
        <Stack.Screen name="Database" component={DatabaseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;