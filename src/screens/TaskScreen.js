import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, PanResponder } from 'react-native';
import { getTasks, updateTask, deleteTask, listTaskClasses } from '../services/Database';
import { useTheme, useThemeMode } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeviceEventEmitter } from 'react-native';

const TaskScreen = ({ navigation }) => {
  const { palette, typography, spacing } = useTheme();
  const { reducedMotion } = useThemeMode();
  const [tasks, setTasks] = useState([]);
  const [taskClasses, setTaskClasses] = useState([]);
  const [filter, setFilter] = useState(null); // optional quick filter inside columns
  const [isLandscape, setIsLandscape] = useState(Dimensions.get('window').width > Dimensions.get('window').height);
  const [draggingTask, setDraggingTask] = useState(null);
  const [hoveredColumn, setHoveredColumn] = useState(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const dragStart = useRef({ x:0, y:0 });
  const columnRefs = useRef({});
  const columnLayouts = useRef({});

  const refresh = async () => {
    const t = await getTasks({ includeCompleted: true });
    setTasks(t);
    try { const cls = await listTaskClasses(); setTaskClasses(cls); } catch {}
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const focusUnsub = navigation.addListener('focus', refresh);
    const evt = DeviceEventEmitter.addListener('tasksUpdated', refresh);
    return () => { focusUnsub(); evt.remove(); };
  }, [navigation]);

  const toggle = async (task) => { await updateTask(task.task_id, { completed: task.completed ? 0 : 1 }); refresh(); };
  const remove = async (task) => { await deleteTask(task.task_id); refresh(); };

  useEffect(()=>{ const sub = Dimensions.addEventListener('change', ({ window }) => { setIsLandscape(window.width > window.height); }); return () => { sub?.remove(); }; }, []);

  const measureColumns = () => { Object.entries(columnRefs.current).forEach(([key, ref]) => { if(ref && ref.measureInWindow){ ref.measureInWindow((x,y,width,height)=> { columnLayouts.current[key] = { x,y,width,height }; }); } }); };

  useEffect(()=> { setTimeout(measureColumns, 300); }, [tasks, isLandscape]);

  const startDrag = (task) => (evt) => {
    setDraggingTask(task);
    setHoveredColumn(null);
    dragStart.current = { x: evt.nativeEvent.pageX - 50, y: evt.nativeEvent.pageY - 20 }; // offset
    pan.setValue(dragStart.current);
    measureColumns(); // ensure fresh layouts
  };

  const updateHover = (pageX, pageY) => {
    const entry = Object.entries(columnLayouts.current).find(([key, rect]) => pageX >= rect.x && pageX <= rect.x+rect.width && pageY >= rect.y && pageY <= rect.y+rect.height);
    const key = entry ? entry[0] : null;
    if(key !== hoveredColumn) setHoveredColumn(key);
  };

  const finalizeDrop = (pageX, pageY) => {
    if(!draggingTask){ return; }
    updateHover(pageX, pageY);
    if(hoveredColumn){ moveTaskToColumn(draggingTask, hoveredColumn); }
    setDraggingTask(null);
    setHoveredColumn(null);
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: () => !!draggingTask,
    onMoveShouldSetPanResponder: () => !!draggingTask,
    onMoveShouldSetPanResponderCapture: () => !!draggingTask,
    onPanResponderMove: (e, g) => { if(draggingTask){ const x = dragStart.current.x + g.dx; const y = dragStart.current.y + g.dy; pan.setValue({ x, y }); updateHover(e.nativeEvent.pageX, e.nativeEvent.pageY); } },
    onPanResponderRelease: (e) => finalizeDrop(e.nativeEvent.pageX, e.nativeEvent.pageY),
    onPanResponderTerminate: (e) => finalizeDrop(e.nativeEvent.pageX, e.nativeEvent.pageY)
  })).current;

  const moveTaskToColumn = async (task, columnKey) => {
    const todayISO = new Date().toISOString().slice(0,10);
    let patch = {};
    switch(columnKey){
      case 'todo': patch = { start_date: null, completed:0 }; break;
      case 'ongoing': patch = { start_date: task.start_date || todayISO, completed:0 }; break;
      case 'done': patch = { completed:1 }; break;
      default: break;
    }
    try { await updateTask(task.task_id, patch); refresh(); } catch {}
  };

  // define todayISO once per render before columns useMemo
  const today = new Date();
  const todayISO = today.toISOString().slice(0,10);

  const columns = React.useMemo(() => {
    const colDefs = [
      { key:'todo', title:'To-Do', filter: t => !t.completed && !t.start_date },
      { key:'ongoing', title:'Ongoing', filter: t => !t.completed && !!t.start_date },
      { key:'done', title:'Done', filter: t => t.completed }
    ];
    return colDefs.map(c => ({ ...c, items: tasks.filter(c.filter).sort((a,b)=>{
      if(a.completed!==b.completed) return a.completed - b.completed;
      if((b.priority||0)!==(a.priority||0)) return (b.priority||0)-(a.priority||0);
      return (a.start_date||'').localeCompare(b.start_date||'');
    }) }));
  }, [tasks, todayISO]);

  const TaskCard = ({ item }) => (
    <TouchableOpacity activeOpacity={0.8} onLongPress={startDrag(item)} style={{ opacity: draggingTask && draggingTask.task_id===item.task_id ? 0.25 : 1 }}>
      <View style={{ backgroundColor: palette.surfaceAlt || palette.surface, borderRadius:10, padding: spacing(2), marginBottom: spacing(2), shadowColor:'#000', shadowOpacity:0.08, shadowRadius:3, elevation:1 }}>
        <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }} numberOfLines={2}>{item.name}</Text>
        <View style={{ flexDirection:'row', alignItems:'center', marginTop:4 }}>
          {item.priority && <Text style={{ fontSize:11, color: palette.textLight, marginRight:6 }}>P{item.priority}</Text>}
          {item.start_date && <Text style={{ fontSize:11, color: palette.textLight }}>{item.start_date}</Text>}
        </View>
        <View style={{ flexDirection:'row', marginTop: spacing(1) }}>
          <TouchableOpacity onPress={()=> toggle(item)} style={{ paddingVertical:4, paddingHorizontal:8, borderRadius:6, backgroundColor: item.completed? palette.primary : palette.border, marginRight:6 }}>
            <Text style={{ fontSize:11, color: item.completed? '#fff': palette.text }}>{item.completed? 'Undo':'Done'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=> remove(item)} style={{ paddingVertical:4, paddingHorizontal:8, borderRadius:6, backgroundColor: palette.border }}>
            <Text style={{ fontSize:11, color: palette.text }}>Del</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderColumn = (col) => {
    const isHover = hoveredColumn === col.key;
    return (
    <View key={col.key} ref={r => { columnRefs.current[col.key]=r; }} onLayout={measureColumns} style={isLandscape ? { width:260, marginHorizontal: spacing(1) } : { width:'100%', marginVertical: spacing(1) }}>
      <Card style={{ padding: spacing(2), minHeight: 120, borderWidth: isHover? 2:1, borderColor: isHover? palette.primary : (palette.border||'#333'), backgroundColor: isHover? (palette.surfaceHover || palette.surface) : (palette.surface) }}>
        <View style={{ flexDirection:'row', alignItems:'center' }}>
          <SectionHeader title={`${col.title} (${col.items.length})`} />
        </View>
        <View style={{ marginTop: spacing(1) }}>
          {col.items.length === 0 && <Text style={{ fontSize:12, color: palette.textLight }}>{isHover? 'Drop here' : 'Empty'}</Text>}
          {col.items.map(t => <TaskCard key={t.task_id} item={t} />)}
        </View>
      </Card>
    </View>
  ); };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']} {...panResponder.panHandlers}>
      {/* header */}
      <View style={{ paddingHorizontal: spacing(4), paddingTop: spacing(4) }}>
        <Text style={{ ...typography.h1, color: palette.text }}>Tasks</Text>
      </View>
      {isLandscape ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={!draggingTask} contentContainerStyle={{ paddingHorizontal: spacing(3), paddingBottom: spacing(6), paddingTop: spacing(2) }}>
          {columns.map(renderColumn)}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={!draggingTask} contentContainerStyle={{ paddingHorizontal: spacing(3), paddingBottom: spacing(10), paddingTop: spacing(2) }}>
          {columns.map(renderColumn)}
        </ScrollView>
      )}
      {draggingTask && (
        <Animated.View pointerEvents='none' style={{ position:'absolute', left: pan.x, top: pan.y, width: 220, zIndex:1000, opacity:0.9, transform:[{ scale:1 }] }} {...panResponder.panHandlers}>
          <View style={{ backgroundColor: palette.surfaceAlt || palette.surface, borderRadius:10, padding: spacing(2), shadowColor:'#000', shadowOpacity:0.2, shadowRadius:6, elevation:5 }}>
            <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>{draggingTask.name}</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// retain styles shell
const styles = StyleSheet.create({});

export default TaskScreen;
