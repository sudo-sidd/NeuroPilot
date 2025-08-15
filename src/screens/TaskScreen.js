import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { getTasks, createTask, updateTask, deleteTask } from '../services/Database';
import { palette, spacing, typography } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';

const TaskScreen = ({ navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [name, setName] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.topBar}> 
          <Text style={styles.header}>Tasks</Text>
          <TouchableOpacity onPress={() => setDrawerVisible(true)}><Text style={{ fontSize:22 }}>☰</Text></TouchableOpacity>
        </View>
        <Card style={styles.section}>
          <SectionHeader title="Create" />
          <View style={styles.row}> 
            <Input placeholder="New task" value={name} onChangeText={setName} style={styles.flex} />
            <PrimaryButton small title="Add" onPress={add} />
          </View>
        </Card>
        <Card style={styles.section}>
          <SectionHeader title="All Tasks" />
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.task_id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => toggle(item)} onLongPress={() => remove(item)}>
                <Text style={[styles.text, item.completed && styles.completed]}>• {item.name}</Text>
                {item.due_date && <Text style={styles.due}>{item.due_date}</Text>}
              </TouchableOpacity>
            )}
          />
          <Text style={styles.hint}>Tap to toggle, long-press to delete.</Text>
        </Card>
      </ScrollView>
      <OptionsDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigate={(route) => navigation.navigate(route)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(x => !x)}
        simpleMode={simpleMode}
        onToggleSimple={() => setSimpleMode(x => !x)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor: palette.background },
  screen: { flex: 1, backgroundColor: palette.background },
  container: { padding: spacing(4), paddingBottom: spacing(12) },
  header: { ...typography.h1, color: palette.text },
  section: { marginTop: spacing(4) },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: spacing(2), marginBottom: spacing(3) },
  flex: { flex: 1 },
  sep: { height: 1, backgroundColor: palette.border },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing(2) },
  text: { fontSize: 14, color: palette.text },
  completed: { textDecorationLine: 'line-through', color: palette.textLight },
  due: { fontSize: 11, color: palette.textLight },
  hint: { fontSize: 11, color: palette.textLight, marginTop: spacing(3) },
  topBar: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' }
});

export default TaskScreen;
