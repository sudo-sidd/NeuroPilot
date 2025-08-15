import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import DatabaseScreen from '../screens/DatabaseScreen';
import TaskScreen from '../screens/TaskScreen';
import ActivityScreen from '../screens/ActivityScreen';
import DailyFormScreen from '../screens/DailyFormScreen';
import ReportsScreen from '../screens/ReportsScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="DailyForm" component={DailyFormScreen} />
        <Stack.Screen name="Tasks" component={TaskScreen} />
        <Stack.Screen name="Activity" component={ActivityScreen} />
        <Stack.Screen name="Reports" component={ReportsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Database" component={DatabaseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;