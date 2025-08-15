import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { getTasks, createTask, updateTask, deleteTask } from '../services/Database';

const TaskScreen = () => {
  const [tasks, setTasks] = useState([]);
  const [name, setName] = useState('');

  const refresh = async () => {
    const t = await getTasks({ includeCompleted: true });
    setTasks(t);
  };

  useEffect(() => { refresh(); }, []);

  const add = async () => {
    if (!name.trim()) return; await createTask({ name: name.trim() }); setName(''); refresh();
  };

  const toggle = async (task) => { await updateTask(task.task_id, { completed: task.completed ? 0 : 1 }); refresh(); };
  const remove = async (task) => { await deleteTask(task.task_id); refresh(); };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tasks</Text>
      <View style={styles.row}>
        <TextInput style={styles.input} placeholder="New task" value={name} onChangeText={setName} />
        <Button title="Add" onPress={add} />
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.task_id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => toggle(item)} onLongPress={() => remove(item)}>
            <Text style={[styles.text, item.completed ? styles.completed : null]}>• {item.name}</Text>
            {item.due_date && <Text style={styles.due}>{item.due_date}</Text>}
          </TouchableOpacity>
        )}
      />
      <Text style={styles.hint}>Tap to toggle, long-press to delete.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', marginRight: 8, paddingHorizontal: 8, height: 40 },
  item: { paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  text: { fontSize: 14 },
  completed: { textDecorationLine: 'line-through', color: '#777' },
  due: { fontSize: 10, color: '#555' },
  hint: { fontSize: 10, marginTop: 12, color: '#666' }
});

export default TaskScreen;
