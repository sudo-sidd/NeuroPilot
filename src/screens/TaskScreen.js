import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, PanResponder } from 'react-native';
import { getTasksKanban, moveTaskToStatus, reorderTasksInStatus, listTaskClasses, updateTask, deleteTask } from '../services/Database';
import { useTheme, useThemeMode } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeviceEventEmitter } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const TaskScreen = ({ navigation }) => {
  const { palette, typography, spacing } = useTheme();
  const { reducedMotion } = useThemeMode();
  const [tasks, setTasks] = useState([]);
  const [taskClasses, setTaskClasses] = useState([]);
  const [filter, setFilter] = useState(null); // optional quick filter inside columns
  const [isLandscape, setIsLandscape] = useState(Dimensions.get('window').width > Dimensions.get('window').height);
  const [draggingTask, setDraggingTask] = useState(null);
  const [hoveredColumn, setHoveredColumn] = useState(null);
  const [dragCardSize, setDragCardSize] = useState({ width: 0, height: 0 });
  const pan = useRef(new Animated.ValueXY()).current;
  const dragStart = useRef({ x:0, y:0 });
  const columnRefs = useRef({});
  const columnLayouts = useRef({});
  const cardLayouts = useRef({}); // task_id -> { x,y,width,height }

  const DEBUG = true;
  const dlog = (...a) => { if (DEBUG) console.log('[TaskScreen]', ...a); };

  const refresh = async () => {
    dlog('refresh start');
    try {
      const t = await getTasksKanban();
      dlog('tasks loaded', t.length);
      setTasks(t);
    } catch (e) { dlog('tasks load error', e); }
    try { const cls = await listTaskClasses(); dlog('task classes loaded', cls.length); setTaskClasses(cls); } catch(e){ dlog('task classes error', e); }
  };

  useEffect(() => { dlog('mount'); refresh(); return () => dlog('unmount'); }, []);
  useEffect(() => {
    const focusUnsub = navigation.addListener('focus', () => { dlog('focus'); refresh(); });
    const evt = DeviceEventEmitter.addListener('tasksUpdated', () => { dlog('tasksUpdated event'); refresh(); });
    return () => { focusUnsub(); evt.remove(); };
  }, [navigation]);

  const toggle = async (task) => { dlog('toggle complete', task.task_id, !task.completed); await updateTask(task.task_id, { completed: task.completed ? 0 : 1, status: task.completed ? 'todo' : 'done' }); refresh(); };
  const remove = async (task) => { dlog('delete task', task.task_id); await deleteTask(task.task_id); refresh(); };

  useEffect(()=>{ const sub = Dimensions.addEventListener('change', ({ window }) => { setIsLandscape(window.width > window.height); }); return () => { sub?.remove(); }; }, []);

  const measureColumns = () => { Object.entries(columnRefs.current).forEach(([key, ref]) => { if(ref && ref.measureInWindow){ ref.measureInWindow((x,y,width,height)=> { columnLayouts.current[key] = { x,y,width,height }; }); } }); };

  useEffect(()=> { setTimeout(measureColumns, 300); }, [tasks, isLandscape]);

  const startDrag = (task) => (evtOrNative) => {
    dlog('startDrag init', task.task_id);
    const ne = evtOrNative && evtOrNative.nativeEvent ? evtOrNative.nativeEvent : evtOrNative;
    if(!ne) { dlog('startDrag no nativeEvent'); return; }
    const { pageX, pageY, locationX, locationY } = ne;
    const originX = pageX - locationX;
    const originY = pageY - locationY;
    const layout = cardLayouts.current[task.task_id];
    if(layout){ setDragCardSize({ width: layout.width, height: layout.height }); dlog('drag card size', layout.width, layout.height); } else { setDragCardSize({ width: 0, height: 0 }); }
    setDraggingTask(task);
    setHoveredColumn(null);
    dragStart.current = { x: originX, y: originY };
    pan.setValue(dragStart.current);
    measureColumns();
  };

  const updateHover = (pageX, pageY) => {
    const entry = Object.entries(columnLayouts.current).find(([key, rect]) => pageX >= rect.x && pageX <= rect.x+rect.width && pageY >= rect.y && pageY <= rect.y+rect.height);
    const key = entry ? entry[0] : null;
    if(key !== hoveredColumn) { dlog('hover column change', hoveredColumn, '->', key); setHoveredColumn(key); }
  };

  const finalizeDrop = (pageX, pageY) => {
    dlog('finalizeDrop', draggingTask && draggingTask.task_id, pageX, pageY);
    if(!draggingTask){ return; }
    updateHover(pageX, pageY);
    if(hoveredColumn){ dlog('drop into', hoveredColumn); moveTaskToColumn(draggingTask, hoveredColumn); }
    setDraggingTask(null);
    setHoveredColumn(null);
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !!draggingTask,
    onStartShouldSetPanResponderCapture: () => !!draggingTask,
    onMoveShouldSetPanResponder: () => !!draggingTask,
    onMoveShouldSetPanResponderCapture: () => !!draggingTask,
    onPanResponderMove: (e, g) => { if(draggingTask){ const x = dragStart.current.x + g.dx; const y = dragStart.current.y + g.dy; pan.setValue({ x, y }); updateHover(e.nativeEvent.pageX, e.nativeEvent.pageY); } },
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (e) => finalizeDrop(e.nativeEvent.pageX, e.nativeEvent.pageY),
    onPanResponderTerminate: (e) => finalizeDrop(e.nativeEvent.pageX, e.nativeEvent.pageY)
  })).current;

  const moveTaskToColumn = async (task, columnKey) => {
    dlog('moveTaskToColumn', task.task_id, columnKey);
    let newStatus = 'todo';
    if(columnKey==='ongoing') newStatus='in_progress';
    else if(columnKey==='done') newStatus='done';
    try { await moveTaskToStatus({ taskId: task.task_id, newStatus }); dlog('moveTaskToColumn success'); refresh(); } catch (e){ dlog('moveTaskToColumn error', e); }
  };

  const getTaskColumnKey = (t) => { if(t.status==='done') return 'done'; if(t.status==='in_progress') return 'ongoing'; return 'todo'; };
  const todayISOConst = () => new Date().toISOString().slice(0,10);
  const moveForward = async (task) => {
    const col = getTaskColumnKey(task);
    if(col==='todo'){ await moveTaskToStatus({ taskId: task.task_id, newStatus:'in_progress' }); }
    else if(col==='ongoing'){ await moveTaskToStatus({ taskId: task.task_id, newStatus:'done' }); }
    refresh();
  };
  const moveBack = async (task) => {
    const col = getTaskColumnKey(task);
    if(col==='ongoing'){ await moveTaskToStatus({ taskId: task.task_id, newStatus:'todo' }); }
    else if(col==='done'){ await moveTaskToStatus({ taskId: task.task_id, newStatus:'in_progress' }); }
    refresh();
  };

  // define todayISO once per render before columns useMemo
  const today = new Date();
  const todayISO = today.toISOString().slice(0,10);

  const columns = React.useMemo(() => {
    const colDefs = [
      { key:'todo', title:'To-Do', filter: t => t.status==='todo' },
      { key:'ongoing', title:'Ongoing', filter: t => t.status==='in_progress' },
      { key:'done', title:'Done', filter: t => t.status==='done' }
    ];
    const built = colDefs.map(c => ({ ...c, items: tasks.filter(c.filter).sort((a,b)=> (a.sort_order??0)-(b.sort_order??0) || (b.priority||0)-(a.priority||0) || (a.task_id-b.task_id) ) }));
    dlog('columns recomputed', built.map(c=> c.key+':'+c.items.length).join(','));
    return built;
  }, [tasks, todayISO]);

  const TaskCard = ({ item }) => {
    const isDragging = draggingTask && draggingTask.task_id===item.task_id;
    const cardRef = useRef(null);
    const startedRef = useRef(false);
    const measureSelf = () => { if(cardRef.current && cardRef.current.measureInWindow){ cardRef.current.measureInWindow((x,y,width,height)=> { cardLayouts.current[item.task_id] = { x,y,width,height }; if(isDragging) setDragCardSize({ width, height }); }); } };
    useEffect(()=> { setTimeout(measureSelf, 0); }, [isDragging]);

    const localPanResponder = useRef(PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e,g) => {
        if(!draggingTask && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2)) { // start drag
          startedRef.current = true;
          startDrag(item)({ pageX: e.nativeEvent.pageX, pageY: e.nativeEvent.pageY, locationX: e.nativeEvent.locationX, locationY: e.nativeEvent.locationY });
          dlog('local drag start gesture', item.task_id);
          return true;
        }
        return !!draggingTask && isDragging;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderMove: (e,g) => {
        if(isDragging){
          const x = dragStart.current.x + g.dx; const y = dragStart.current.y + g.dy;
          pan.setValue({ x, y });
          updateHover(e.nativeEvent.pageX, e.nativeEvent.pageY);
          dlog('drag move', item.task_id, x, y);
        }
      },
      onPanResponderRelease: (e) => { if(isDragging){ dlog('drag release', item.task_id); finalizeDrop(e.nativeEvent.pageX, e.nativeEvent.pageY); } },
      onPanResponderTerminate: (e) => { if(isDragging){ dlog('drag terminate', item.task_id); finalizeDrop(e.nativeEvent.pageX, e.nativeEvent.pageY); } },
      onPanResponderTerminationRequest: () => false
    })).current;

    const transformStyle = isDragging ? { transform:[{ translateX: Animated.subtract(pan.x, dragStart.current.x) }, { translateY: Animated.subtract(pan.y, dragStart.current.y) }], zIndex: 1000, elevation:8 } : null;

    const colKey = getTaskColumnKey(item);
    const showUp = colKey !== 'todo';
    const showDown = colKey !== 'done';

    return (
      <Animated.View ref={cardRef} onLayout={measureSelf} {...localPanResponder.panHandlers} style={[{ marginBottom: spacing(2) }, transformStyle]}>
        {/* Use StrictView to guarantee no raw string children slip through */}
        <StrictView style={{ backgroundColor: palette.surfaceAlt || palette.surface, borderRadius:10, padding: spacing(2), paddingTop: spacing(2)+4, shadowColor:'#000', shadowOpacity: isDragging?0.25:0.08, shadowRadius: isDragging?6:3, elevation: isDragging?8:1, opacity: isDragging?0:1 }}>
          <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }} numberOfLines={2}>{item.name}</Text>
          <StrictView style={{ flexDirection:'row', alignItems:'center', marginTop:4 }}>
            {item.priority && <Text style={{ fontSize:11, color: palette.textLight, marginRight:6 }}>P{item.priority}</Text>}
            {item.completed && <Text style={{ fontSize:11, color: palette.primary, marginLeft:4 }}>✓</Text>}
          </StrictView>
          {/* Up/Down controls */}
          <StrictView style={{ position:'absolute', right:6, top:0, bottom:0, justifyContent:'center', flexDirection:'row', alignItems:'center' }}>
            {showUp && (
              <TouchableOpacity
                accessibilityLabel="Move task up"
                disabled={!!draggingTask}
                onPress={()=> moveBack(item)}
                style={{
                  width:34, height:34, borderRadius:17,
                  alignItems:'center', justifyContent:'center',
                  marginLeft:6,
                  backgroundColor: (palette.primary + '22'),
                  borderWidth:1,
                  borderColor: palette.primary,
                  shadowColor:'#000', shadowOpacity:0.15, shadowRadius:3, shadowOffset:{ width:0, height:2 }, elevation:2
                }}>
                <Icon name="arrow-upward" size={20} color={palette.primary} style={{ textAlign:'center' }} />
              </TouchableOpacity>
            )}
            {showDown && (
              <TouchableOpacity
                accessibilityLabel="Move task down"
                disabled={!!draggingTask}
                onPress={()=> moveForward(item)}
                style={{
                  width:34, height:34, borderRadius:17,
                  alignItems:'center', justifyContent:'center',
                  marginLeft:6,
                  backgroundColor: palette.primary,
                  shadowColor:'#000', shadowOpacity:0.25, shadowRadius:4, shadowOffset:{ width:0, height:3 }, elevation:3
                }}>
                <Icon name="arrow-downward" size={20} color="#FFF" style={{ textAlign:'center' }} />
              </TouchableOpacity>
            )}
          </StrictView>
        </StrictView>
      </Animated.View>
    );
  };

  const renderColumn = (col) => {
    const isHover = hoveredColumn === col.key;
    dlog('renderColumn', col.key, 'hover?', isHover, 'items', col.items.length);
    return (
    <View key={col.key} ref={r => { columnRefs.current[col.key]=r; }} onLayout={measureColumns} style={isLandscape ? { width:260, marginHorizontal: spacing(1) } : { width:'100%', marginVertical: spacing(1) }}>
      <Card style={{ padding: spacing(2), minHeight: 120, borderWidth: isHover? 2:1, borderColor: isHover? palette.primary : (palette.border||'#333'), backgroundColor: isHover? (palette.surfaceHover || palette.surface) : (palette.surface) }}>
        <StrictView style={{ flexDirection:'row', alignItems:'center' }}>
          <SectionHeader title={`${col.title} (${col.items.length})`} />
        </StrictView>
        <StrictView style={{ marginTop: spacing(1) }}>
          {col.items.length === 0 && <Text style={{ fontSize:12, color: palette.textLight }}>{isHover? 'Drop here' : 'Empty'}</Text>}
          {col.items.map(t => <TaskCard key={t.task_id} item={t} />)}
        </StrictView>
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
        <Animated.View pointerEvents='none' style={{ position:'absolute', left: pan.x, top: pan.y, width: dragCardSize.width||230 }}>
          <View style={{ backgroundColor: palette.surfaceAlt || palette.surface, borderRadius:10, padding: spacing(2), paddingTop: spacing(2)+4, shadowColor:'#000', shadowOpacity:0.35, shadowRadius:8, elevation:12 }}>
            <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }} numberOfLines={2}>{draggingTask.name}</Text>
            <View style={{ flexDirection:'row', alignItems:'center', marginTop:4 }}>
              {draggingTask.priority && <Text style={{ fontSize:11, color: palette.textLight, marginRight:6 }}>P{draggingTask.priority}</Text>}
              {draggingTask.completed && <Text style={{ fontSize:11, color: palette.primary, marginLeft:4 }}>✓</Text>}
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// StrictView: defensive wrapper to ensure no raw string/number children trigger RN warning
const StrictView = ({ children, style, ...rest }) => {
  const normalized = React.Children.map(children, (ch, i) => {
    if (typeof ch === 'string' || typeof ch === 'number') {
      return <Text key={i} style={{ fontSize: 14 }}>{ch}</Text>;
    }
    return ch;
  });
  return <View style={style} {...rest}>{normalized}</View>;
};

// retain styles shell
const styles = StyleSheet.create({});

export default TaskScreen;
