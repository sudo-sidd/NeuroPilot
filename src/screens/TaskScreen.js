import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { getTasks, createTask, updateTask, deleteTask } from '../services/Database';
import { useTheme } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';

const TaskScreen = ({ navigation }) => {
  const { palette, typography, spacing } = useTheme();
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
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(12) }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}> 
          <Text style={{ ...typography.h1, color: palette.text }}>Tasks</Text>
          <TouchableOpacity onPress={() => setDrawerVisible(true)}><Text style={{ fontSize:22, color: palette.text }}>☰</Text></TouchableOpacity>
        </View>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Create" />
          <View style={{ flexDirection:'row', alignItems:'center', marginTop: spacing(2), marginBottom: spacing(3) }}> 
            <Input placeholder="New task" value={name} onChangeText={setName} style={{ flex:1 }} />
            <PrimaryButton small title="Add" onPress={add} />
          </View>
        </Card>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="All Tasks" />
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.task_id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height:1, backgroundColor: palette.border }} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical: spacing(2) }} onPress={() => toggle(item)} onLongPress={() => remove(item)}>
                <Text style={[{ fontSize:14, color: palette.text }, item.completed && { textDecorationLine:'line-through', color: palette.textLight }]}>• {item.name}</Text>
                {item.due_date && <Text style={{ fontSize:11, color: palette.textLight }}>{item.due_date}</Text>}
              </TouchableOpacity>
            )}
          />
          <Text style={{ fontSize:11, color: palette.textLight, marginTop: spacing(3) }}>Tap to toggle, long-press to delete.</Text>
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

// retain styles shell
const styles = StyleSheet.create({ safe:{}, screen:{}, container:{}, header:{}, section:{}, row:{}, flex:{}, sep:{}, item:{}, text:{}, completed:{}, due:{}, hint:{}, topBar:{} });

export default TaskScreen;
