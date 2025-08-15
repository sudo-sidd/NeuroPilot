import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { getActionClasses, getCurrentActivity, getTodaysActivities, startActivity, stopCurrentActivity, getTasks, createTask, updateTask } from '../services/Database';
import { palette, spacing, typography } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';
import Chip from '../components/ui/Chip';

const HomeScreen = ({ navigation }) => {
  const [actionClasses, setActionClasses] = useState([]);
  const [current, setCurrent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [taskName, setTaskName] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      const [classes, curr, todays, tks] = await Promise.all([
        getActionClasses(),
        getCurrentActivity(),
        getTodaysActivities(),
        getTasks({ includeCompleted: true })
      ]);
      setActionClasses(classes);
      setCurrent(curr);
      setActivities(todays);
      setTasks(tks);
    } catch (e) {
      console.log('Error refreshing data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleStart = async (cls) => {
    await startActivity(cls.action_class_id);
    refresh();
  };

  const handleStop = async () => {
    await stopCurrentActivity();
    refresh();
  };

  const addTask = async () => {
    if (!taskName.trim()) return;
    await createTask({ name: taskName.trim() });
    setTaskName('');
    refresh();
  };

  const toggleTask = async (task) => {
    await updateTask(task.task_id, { completed: task.completed ? 0 : 1 });
    refresh();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>NeuroPilot</Text>
        <View style={styles.topActions}>
          <PrimaryButton small title="Reports" onPress={() => navigation.navigate('Reports')} />
          <PrimaryButton small title="Daily" onPress={() => navigation.navigate('DailyForm')} />
        </View>
      </View>

      <Card style={styles.section}>
        <SectionHeader title={current ? 'Current Activity' : 'Start an Activity'} />
        {current ? (
          <View style={styles.currentRow}>
            <Text style={styles.currentText}>{current.action_class_name}</Text>
            <PrimaryButton small title="Stop" onPress={handleStop} />
          </View>
        ) : (
          <View style={styles.classWrap}>
            {actionClasses.map(cls => (
              <Chip key={cls.action_class_id} label={cls.name} color={cls.color || palette.primary} onPress={() => handleStart(cls)} />
            ))}
          </View>
        )}
      </Card>

      <Card style={styles.section}>
        <SectionHeader title="Today's Log" />
        {loading ? <Text style={styles.muted}>Loading...</Text> : (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.activity_id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => (
              <View style={styles.activityItem}>
                <Text style={styles.activityName}>{item.action_class_name}</Text>
                <Text style={styles.activityTime}>{new Date(item.start_time).toLocaleTimeString()} {item.end_time ? ' - ' + new Date(item.end_time).toLocaleTimeString() : '(running)'}</Text>
              </View>
            )}
          />
        )}
      </Card>

      <Card style={styles.section}>
        <SectionHeader title="Tasks" />
        <View style={styles.taskAddRow}>
          <Input placeholder="New task" value={taskName} onChangeText={setTaskName} style={styles.flex} />
          <PrimaryButton small title="Add" onPress={addTask} />
        </View>
        <FlatList
          data={tasks}
            keyExtractor={(item) => item.task_id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.taskRow} onPress={() => toggleTask(item)}>
                <Text style={[styles.taskText, item.completed && styles.completed]}>• {item.name}</Text>
                {item.due_date && <Text style={styles.dueDate}>{item.due_date}</Text>}
              </TouchableOpacity>
            )}
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  container: { padding: spacing(4), paddingBottom: spacing(12) },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(4) },
  appTitle: { ...typography.h1, color: palette.text },
  topActions: { flexDirection: 'row', gap: spacing(2) },
  section: { marginTop: spacing(4) },
  classWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  currentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currentText: { ...typography.h2, color: palette.primary },
  muted: { color: palette.textLight, fontSize: 12 },
  sep: { height: 1, backgroundColor: palette.border },
  activityItem: { paddingVertical: spacing(2) },
  activityName: { fontWeight: '600', color: palette.text },
  activityTime: { fontSize: 12, color: palette.textLight, marginTop: 2 },
  taskAddRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing(3) },
  taskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing(2) },
  taskText: { fontSize: 14, color: palette.text },
  completed: { textDecorationLine: 'line-through', color: palette.textLight },
  dueDate: { fontSize: 11, color: palette.textLight },
  flex: { flex: 1 }
});

export default HomeScreen;