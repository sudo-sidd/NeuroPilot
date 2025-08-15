import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { getTasks, createTask, updateTask, deleteTask, snoozeTask } from '../services/Database';
import { useTheme, useThemeMode } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';

const TaskScreen = ({ navigation }) => {
  const { palette, typography, spacing } = useTheme();
  const { reducedMotion } = useThemeMode();
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

  const grouped = React.useMemo(() => {
    const todayISO = new Date().toISOString().slice(0,10);
    const overdue = []; const today = []; const upcoming = [];
    tasks.forEach(t => {
      if (!t.due_date) { upcoming.push(t); return; }
      if (t.due_date < todayISO && !t.completed) overdue.push(t); else if (t.due_date === todayISO) today.push(t); else upcoming.push(t);
    });
    return { overdue, today, upcoming };
  }, [tasks]);

  const snooze = async (task) => {
    const until = new Date(); until.setDate(until.getDate() + 1); // default 24h
    await snoozeTask(task.task_id, until.toISOString());
    refresh();
  };

  const SwipeRow = ({ item }) => {
    const translateX = React.useRef(new Animated.Value(0)).current;
    const released = React.useRef(false);

    const onGestureEvent = Animated.event([{ nativeEvent: { translationX: translateX } }], { useNativeDriver: false });

    const handleStateChange = ({ nativeEvent }) => {
      if (nativeEvent.oldState === State.ACTIVE && !released.current) {
        released.current = true;
        const x = nativeEvent.translationX;
        // Thresholds
        if (x > 90) { // complete toggle
          if (!reducedMotion) Animated.sequence([
            Animated.timing(translateX, { toValue: 30, duration: 120, useNativeDriver: false }),
            Animated.spring(translateX, { toValue: 0, useNativeDriver: false })
          ]).start(() => { toggle(item); released.current = false; }); else { toggle(item); Animated.timing(translateX, { toValue: 0, duration: 160, useNativeDriver: false }).start(() => { released.current = false; }); }
          return;
        } else if (x < -90) { // snooze
          snooze(item);
        }
        Animated.timing(translateX, { toValue: 0, duration: 160, useNativeDriver: false }).start(() => { released.current = false; });
      }
    };

    const rowBg = translateX.interpolate({
      inputRange: [-140, -90, 0, 90, 140],
      outputRange: ['#FFC94D', '#FFC94D', 'transparent', '#6BCB77', '#6BCB77'],
      extrapolate: 'clamp'
    });

    const icon = translateX.interpolate({
      inputRange: [-140, -90, -30, 30, 90, 140],
      outputRange: ['⏰','⏰','', '', '✔️','✔️'],
      extrapolate: 'clamp'
    });

    return (
      <View style={{ overflow:'hidden' }}>
        <Animated.View style={{ position:'absolute', left:0, right:0, top:0, bottom:0, backgroundColor: rowBg, flexDirection:'row', alignItems:'center', justifyContent:'center' }}>
          <Animated.Text style={{ fontSize:18 }}>{icon}</Animated.Text>
        </Animated.View>
        <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={handleStateChange} activeOffsetX={[-15,15]}>
          <Animated.View style={{ transform:[{ translateX }], paddingVertical: spacing(2), flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={[{ fontSize:14, color: palette.text }, item.completed && { textDecorationLine:'line-through', color: palette.textLight }]}>• {item.name}</Text>
            {item.due_date && <Text style={{ fontSize:11, color: palette.textLight }}>{item.due_date}</Text>}
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  };

  const renderTask = useCallback((item) => (
    <SwipeRow key={item.task_id} item={item} />
  ), [toggle]);

  const Section = ({ title, data, empty }) => (
    <Card style={{ marginTop: spacing(4) }}>
      <SectionHeader title={title} />
      {data.length === 0 ? <Text style={{ fontSize:12, color: palette.textLight }}>{empty}</Text> : data.map(renderTask)}
    </Card>
  );

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(12) }}>
        <View style={{ marginBottom: spacing(1) }}><Text style={{ ...typography.h1, color: palette.text }}>Tasks</Text></View>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Create" />
          <View style={{ flexDirection:'row', alignItems:'center', marginTop: spacing(2), marginBottom: spacing(3) }}> 
            <Input placeholder="New task" value={name} onChangeText={setName} style={{ flex:1 }} />
            <PrimaryButton small title="Add" onPress={add} accessibilityLabel="Add new task" />
          </View>
        </Card>
        <Section title="Overdue" data={grouped.overdue} empty="No overdue tasks" />
        <Section title="Today" data={grouped.today} empty="Nothing scheduled for today" />
        <Section title="Upcoming" data={grouped.upcoming} empty="No upcoming tasks" />
      </ScrollView>
    </SafeAreaView>
  );
};

// retain styles shell
const styles = StyleSheet.create({ safe:{}, screen:{}, container:{}, header:{}, section:{}, row:{}, flex:{}, sep:{}, item:{}, text:{}, completed:{}, due:{}, hint:{}, topBar:{} });

export default TaskScreen;
