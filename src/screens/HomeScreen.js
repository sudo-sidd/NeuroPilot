import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { getActionClasses, getCurrentActivity, getTodaysActivities, startActivity, stopCurrentActivity, getTasks, createTask, updateTask } from '../services/Database';

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
    <View style={styles.container}>
      <Text style={styles.header}>Activity Tracker (Phase 1)</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Button title="Reports" onPress={() => navigation.navigate('Reports')} />
        <Button title="Daily Form" onPress={() => navigation.navigate('DailyForm')} />
      </View>
      {current ? (
        <View style={styles.currentBox}>
          <Text style={styles.currentText}>Running: {current.action_class_name}</Text>
          <Button title="Stop" onPress={handleStop} />
        </View>
      ) : (
        <Text style={styles.idle}>No active activity</Text>
      )}
      <Text style={styles.subHeader}>Start New:</Text>
      <View style={styles.row}>
        {actionClasses.map(cls => (
          <View key={cls.action_class_id} style={styles.classBtn}>
            <Button color={cls.color || '#2196F3'} title={cls.name} onPress={() => handleStart(cls)} />
          </View>
        ))}
      </View>
      <Text style={styles.subHeader}>Today</Text>
      {loading ? <Text>Loading...</Text> : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.activity_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text>{item.action_class_name}</Text>
              <Text style={styles.itemTime}>{new Date(item.start_time).toLocaleTimeString()} {item.end_time ? ' - ' + new Date(item.end_time).toLocaleTimeString() : '(running)'}</Text>
            </View>
          )}
        />
      )}
      <Text style={styles.subHeader}>Tasks</Text>
      <View style={styles.taskRow}>
        <TextInput style={styles.taskInput} placeholder="New task" value={taskName} onChangeText={setTaskName} />
        <Button title="Add" onPress={addTask} />
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.task_id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.taskItem} onPress={() => toggleTask(item)}>
            <Text style={[styles.taskText, item.completed ? styles.taskCompleted : null]}>• {item.name}</Text>
            {item.due_date && <Text style={styles.dueDate}>{item.due_date}</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  subHeader: { marginTop: 16, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  classBtn: { marginRight: 8, marginTop: 8 },
  currentBox: { padding: 12, backgroundColor: '#eef', borderRadius: 6 },
  currentText: { fontSize: 16, marginBottom: 4 },
  idle: { fontStyle: 'italic' },
  item: { paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  itemTime: { fontSize: 12, color: '#555' },
  taskRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  taskInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', marginRight: 8, paddingHorizontal: 8, height: 40 },
  taskItem: { paddingVertical: 6, borderBottomWidth: 1, borderColor: '#eee' },
  taskText: { fontSize: 14 },
  taskCompleted: { textDecorationLine: 'line-through', color: '#777' },
  dueDate: { fontSize: 10, color: '#555' }
});

export default HomeScreen;