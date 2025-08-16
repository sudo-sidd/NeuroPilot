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
import { useTheme } from '../constants/theme';
import { Text, View } from 'react-native';

const ICON_SIZE = 32;
const Icon = ({ active, glyph, color }) => {
  // Guard against missing glyph (e.g., newly added tab without icon mapping)
  if (!glyph) {
    return (
      <View style={{ width: ICON_SIZE, height: ICON_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '600', color }}>{'?'}</Text>
      </View>
    );
  }
  if (glyph.type === 'custom' && typeof glyph.render === 'function') {
    return (
      <View style={{ width: ICON_SIZE, height: ICON_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        {glyph.render({ active, color, size: ICON_SIZE })}
      </View>
    );
  }
  // Fallback text glyph in standardized container
  return (
    <View style={{ width: ICON_SIZE, height: ICON_SIZE, alignItems:'center', justifyContent:'center' }}>
      <Text style={{ fontSize: glyph.fontSize || 20, fontWeight: '600', color, includeFontPadding: false }}>{active ? glyph.filled : glyph.outline}</Text>
    </View>
  );
};

// Placeholder glyphs (would be replaced by proper icon pack later)
const glyphs = {
  Settings: { outline: '⚙', filled: '⚙', fontSize: 26 },
  Reports: {
    type: 'custom',
    render: ({ active, color, size }) => {
      const stroke = color;
      const docW = size * 0.68;
      const docH = size * 0.84;
      const left = (size - docW) / 2;
      const top = (size - docH) / 2;
      const lineInset = 6; // equal margin left/right inside doc
      const lineWidth = docW - lineInset * 2;
      const lines = 3;
      const gap = (docH - 12 - lines * 2) / (lines - 1); // 12 = total height of all lines (2px each *3)
      return (
        <View style={{ width: size, height: size }}>
          {/* Document outline */}
          <View style={{ position: 'absolute', top, left, width: docW, height: docH, borderWidth: 2, borderColor: stroke, borderRadius: 6, backgroundColor: active ? stroke + '22' : 'transparent' }} />
          {/* Horizontal lines evenly spaced */}
          {Array.from({ length: lines }).map((_, i) => (
            <View
              key={i}
              style={{ position: 'absolute', top: top + 6 + i * (2 + gap), left: left + lineInset, width: lineWidth, height: 2, backgroundColor: stroke, borderRadius: 2 }}
            />
          ))}
        </View>
      );
    }
  },
  Activity: { outline: '⏱', filled: '⏱', fontSize: 26 },
  Tasks: {
    type: 'custom',
    render: ({ active, color, size }) => {
      const box = size * 0.68;
      const offset = (size - box) / 2;
      const checkColor = color;
      // Check mark geometry
      const checkLeft = offset + box * 0.22;
      const checkTop = offset + box * 0.40;
      const shortLen = box * 0.30;
      const longLen = box * 0.58;
      return (
        <View style={{ width: size, height: size }}>
          <View style={{ position: 'absolute', top: offset, left: offset, width: box, height: box, borderWidth: 2, borderColor: color, borderRadius: 6, backgroundColor: active ? color + '22' : 'transparent' }} />
          {/* Check mark (two strokes) */}
          <View style={{ position: 'absolute', top: checkTop, left: checkLeft, width: shortLen, height: 2, backgroundColor: checkColor, borderRadius: 2, transform: [{ rotate: '-45deg' }] }} />
            <View style={{ position: 'absolute', top: checkTop - box * 0.145, left: checkLeft + shortLen * 0.7, width: longLen, height: 2, backgroundColor: checkColor, borderRadius: 2, transform: [{ rotate: '45deg' }] }} />
        </View>
      );
    }
  },
  Journal: { outline: '✎', filled: '✎', fontSize: 26 },
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { palette } = useTheme();
  return (
    <Tab.Navigator
      initialRouteName="ActivityTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textLight,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const key = route.name.replace('Tab','');
          const map = { Settings: glyphs.Settings, Reports: glyphs.Reports, Activity: glyphs.Activity, Tasks: glyphs.Tasks, Journal: glyphs.Journal };
          return <Icon active={focused} glyph={map[key]} color={focused ? palette.primary : color} />;
        }
      })}
    >
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Tab.Screen name="ReportsTab" component={ReportsScreen} options={{ title: 'Reports' }} />
      <Tab.Screen name="ActivityTab" component={ActivityScreen} options={{ title: 'Activity' }} />
      <Tab.Screen name="TasksTab" component={TaskScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="JournalTab" component={DailyFormScreen} options={{ title: 'Journal' }} />
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