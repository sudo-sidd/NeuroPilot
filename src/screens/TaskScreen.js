import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { getTasksKanban } from '../services/Database';
import { useTheme } from '../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeviceEventEmitter } from 'react-native';

const TaskScreen = ({ navigation }) => {
  const { palette, typography, spacing } = useTheme();
  const [tasks, setTasks] = useState([]);

  const refresh = async () => {
    try {
      const t = await getTasksKanban();
      setTasks(t || []);
    } catch (e) { 
      console.log('tasks load error', e); 
      setTasks([]);
    }
  };

  useEffect(() => { 
    refresh(); 
  }, []);

  useEffect(() => {
    const focusUnsub = navigation.addListener('focus', refresh);
    const evt = DeviceEventEmitter.addListener('tasksUpdated', refresh);
    return () => { 
      focusUnsub(); 
      evt.remove(); 
    };
  }, [navigation]);

  // Ultra-minimal task rendering to debug the text error
  const TaskCard = React.memo(({ item }) => {
    return (
      <View style={{ 
        marginBottom: spacing(2),
        backgroundColor: '#f5f5f5', 
        borderRadius: 8,
        padding: spacing(2)
      }}>
        <Text style={{ fontSize: 14, color: '#333' }}>
          {String(item?.name || 'No name')}
        </Text>
        <Text style={{ fontSize: 12, color: '#666' }}>
          Status: {String(item?.status || 'unknown')}
        </Text>
      </View>
    );
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: spacing(4), paddingTop: spacing(4) }}>
        <Text style={{ ...typography.h1, color: palette.text }}>Tasks</Text>
      </View>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: spacing(3), 
          paddingBottom: spacing(10), 
          paddingTop: spacing(2) 
        }}
      >
        {!Array.isArray(tasks) || tasks.length === 0 ? (
          <View style={{ 
            alignItems: 'center', 
            justifyContent: 'center', 
            paddingVertical: spacing(8) 
          }}>
            <Text style={{ 
              fontSize: 16, 
              color: palette.textLight || '#666', 
              textAlign: 'center' 
            }}>
              No tasks yet. Create one to get started!
            </Text>
          </View>
        ) : (
          tasks.map((task, index) => (
            <TaskCard key={`task-${task?.task_id || index}`} item={task} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TaskScreen;
