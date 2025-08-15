import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Animated, Modal } from 'react-native';
import { getTasks, createTask, updateTask, deleteTask, snoozeTask, listTaskClasses, createTaskClass, listRecurringTemplates, createRecurringTemplate, updateRecurringTemplate, deactivateRecurringTemplate, generateRecurringInstances } from '../services/Database';
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
  const [priority, setPriority] = useState(3);
  const [taskClasses, setTaskClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [filter, setFilter] = useState('today'); // overdue|today|upcoming|all|completed
  const [templates, setTemplates] = useState([]);
  const [templateModal, setTemplateModal] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplPattern, setTplPattern] = useState('daily'); // daily|weekdays|every_other_day
  const [tplWeekdays, setTplWeekdays] = useState([]); // array of numbers 0-6
  const [tplPriority, setTplPriority] = useState(3);
  const [tplClass, setTplClass] = useState(null);
  const [tplSeed, setTplSeed] = useState(() => new Date().toISOString().slice(0,10));
  const [editingTemplate, setEditingTemplate] = useState(null);

  const refresh = async () => {
    const t = await getTasks({ includeCompleted: true });
    setTasks(t);
    try { const cls = await listTaskClasses(); setTaskClasses(cls); if(!selectedClass && cls.length) setSelectedClass(cls[0].task_class_id); } catch {}
    try { const tpl = await listRecurringTemplates(); setTemplates(tpl); } catch {}
  };

  useEffect(() => { refresh(); }, []);

  const add = async () => {
    if (!name.trim()) return; await createTask({ name: name.trim(), priority, taskClassId: selectedClass }); setName(''); setPriority(3); refresh();
  };

  const toggle = async (task) => { await updateTask(task.task_id, { completed: task.completed ? 0 : 1 }); refresh(); };
  const remove = async (task) => { await deleteTask(task.task_id); refresh(); };

  const grouped = React.useMemo(() => { return {}; }, [tasks]);

  const filtered = React.useMemo(()=>{
    const todayISO = new Date().toISOString().slice(0,10);
    const upcomingLimit = new Date(); upcomingLimit.setDate(upcomingLimit.getDate()+7); const upcomingISO = upcomingLimit.toISOString().slice(0,10);
    return tasks.filter(t => {
      const due = t.due_date;
      if(filter==='completed') return !!t.completed;
      if(filter==='all') return !t.completed;
      if(filter==='overdue') return !t.completed && due && due < todayISO;
      if(filter==='today') return !t.completed && due === todayISO;
      if(filter==='upcoming') return !t.completed && due && due > todayISO && due <= upcomingISO;
      return true;
    }).sort((a,b)=>{
      // Priority desc, due_date asc
      if(a.completed!==b.completed) return a.completed - b.completed;
      if((b.priority||0)!==(a.priority||0)) return (b.priority||0)-(a.priority||0);
      return (a.due_date||'').localeCompare(b.due_date||'');
    });
  }, [tasks, filter]);

  const snooze = async (task) => {
    const until = new Date(); until.setDate(until.getDate() + 1); // default 24h
    await snoozeTask(task.task_id, until.toISOString());
    refresh();
  };

  const saveTemplate = async () => {
    if(!tplName.trim()) return;
    const weekDaysStr = tplPattern==='weekdays' ? tplWeekdays.sort().join(',') : '';
    try {
      if(editingTemplate){
        await updateRecurringTemplate(editingTemplate.template_id, { name: tplName.trim(), description: tplDesc, patternType: tplPattern, patternDays: weekDaysStr, everyOtherSeed: tplPattern==='every_other_day'? tplSeed : null, priority: tplPriority, taskClassId: tplClass });
      } else {
        await createRecurringTemplate({ name: tplName.trim(), description: tplDesc, patternType: tplPattern, patternDays: weekDaysStr, everyOtherSeed: tplPattern==='every_other_day'? tplSeed : null, priority: tplPriority, taskClassId: tplClass });
      }
      setTemplateModal(false);
      setTplName(''); setTplDesc(''); setTplPattern('daily'); setTplWeekdays([]); setTplPriority(3); setTplClass(null); setEditingTemplate(null); setTplSeed(new Date().toISOString().slice(0,10));
      refresh();
    } catch {}
  };
  const openNewTemplate = () => { setEditingTemplate(null); setTplName(''); setTplDesc(''); setTplPattern('daily'); setTplWeekdays([]); setTplPriority(3); setTplClass(taskClasses[0]?.task_class_id || null); setTplSeed(new Date().toISOString().slice(0,10)); setTemplateModal(true); };
  const openEditTemplate = (tpl) => { setEditingTemplate(tpl); setTplName(tpl.name); setTplDesc(tpl.description || ''); setTplPattern(tpl.pattern_type); setTplWeekdays((tpl.pattern_days||'').split(',').filter(Boolean)); setTplPriority(tpl.priority || 3); setTplClass(tpl.task_class_id || null); setTplSeed(tpl.every_other_seed || new Date().toISOString().slice(0,10)); setTemplateModal(true); };
  const toggleWeekday = (d) => { setTplWeekdays(prev => prev.includes(String(d)) ? prev.filter(x=>x!==String(d)) : [...prev, String(d)]); };

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
            <View style={{ flex:1, paddingRight:8 }}>
              <Text style={[{ fontSize:14, color: palette.text }, item.completed && { textDecorationLine:'line-through', color: palette.textLight }]}>• {item.name} {item.priority && <Text style={{ fontSize:11, color: palette.textLight }}>P{item.priority}</Text>}</Text>
              {item.template_id ? <Text style={{ fontSize:10, color: palette.textLight }}>⟳ {templates.find(t=>t.template_id===item.template_id)?.pattern_type || 'recurring'}</Text> : null}
            </View>
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
        <View style={{ flexDirection:'row', marginTop: spacing(3), borderRadius:24, overflow:'hidden', borderWidth:1, borderColor: palette.border }}>
          {['overdue','today','upcoming','all','completed'].map(key => (
            <TouchableOpacity key={key} onPress={()=> setFilter(key)} style={{ flex:1, paddingVertical:8, backgroundColor: filter===key? palette.primary : 'transparent' }}>
              <Text style={{ textAlign:'center', fontSize:11, color: filter===key? '#fff' : palette.text }}>{key.charAt(0).toUpperCase()+key.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Templates" />
          <View style={{ flexDirection:'row', marginTop: spacing(1) }}>
            <PrimaryButton small title="New" onPress={openNewTemplate} accessibilityLabel="New recurring template" />
            <View style={{ width: spacing(2) }} />
            <PrimaryButton small title="Generate Now" onPress={async ()=>{ try { await generateRecurringInstances({ daysAhead:7 }); refresh(); } catch {} }} accessibilityLabel="Generate recurring instances" />
          </View>
          {templates.length === 0 && <Text style={{ fontSize:12, color: palette.textLight, marginTop: spacing(2) }}>No active templates</Text>}
          {templates.map(tpl => (
            <TouchableOpacity key={tpl.template_id} onPress={()=> openEditTemplate(tpl)} style={{ paddingVertical:8, borderBottomWidth:1, borderColor: palette.border }}>
              <Text style={{ fontSize:13, color: palette.text, fontWeight:'600' }}>{tpl.name}</Text>
              <Text style={{ fontSize:11, color: palette.textLight }}>{tpl.pattern_type}{tpl.pattern_type==='weekdays' && ':' + (tpl.pattern_days||'')}</Text>
            </TouchableOpacity>
          ))}
        </Card>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title={filter.charAt(0).toUpperCase()+filter.slice(1)} />
          {filtered.length === 0 ? <Text style={{ fontSize:12, color: palette.textLight }}>No tasks</Text> : filtered.map(renderTask)}
        </Card>
      </ScrollView>
      <Modal visible={templateModal} transparent animationType='fade' onRequestClose={()=> setTemplateModal(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', padding: spacing(4) }}>
          <View style={{ backgroundColor: palette.surface, borderRadius:16, padding: spacing(4) }}>
            <Text style={{ fontSize:16, fontWeight:'600', color: palette.text, marginBottom: spacing(2) }}>{editingTemplate? 'Edit Template':'New Template'}</Text>
            <Input placeholder='Name' value={tplName} onChangeText={setTplName} style={{ marginBottom: spacing(2) }} />
            <Input placeholder='Description (optional)' value={tplDesc} onChangeText={setTplDesc} style={{ marginBottom: spacing(2) }} />
            <Text style={{ fontSize:12, color: palette.textLight, marginBottom:4 }}>Pattern</Text>
            <View style={{ flexDirection:'row', marginBottom: spacing(2) }}>
              {['daily','weekdays','every_other_day'].map(p => (
                <TouchableOpacity key={p} onPress={()=> setTplPattern(p)} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:14, marginRight:8, backgroundColor: tplPattern===p? palette.primary : palette.border }}>
                  <Text style={{ fontSize:11, color: tplPattern===p? '#fff' : palette.text }}>{p.replace(/_/g,' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {tplPattern==='weekdays' && (
              <View style={{ flexDirection:'row', marginBottom: spacing(2) }}>
                {['S','M','T','W','T','F','S'].map((lbl,i)=>(
                  <TouchableOpacity key={i} onPress={()=> toggleWeekday(i)} style={{ width:32, height:32, borderRadius:16, marginRight:6, alignItems:'center', justifyContent:'center', backgroundColor: tplWeekdays.includes(String(i)) ? palette.primary : palette.border }}>
                    <Text style={{ fontSize:12, color: tplWeekdays.includes(String(i))? '#fff' : palette.text }}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {tplPattern==='every_other_day' && (
              <View style={{ marginBottom: spacing(2) }}>
                <Text style={{ fontSize:12, color: palette.textLight, marginBottom:4 }}>Seed Date (YYYY-MM-DD)</Text>
                <Input value={tplSeed} onChangeText={setTplSeed} placeholder='YYYY-MM-DD' />
              </View>
            )}
            <Text style={{ fontSize:12, color: palette.textLight, marginBottom:4 }}>Priority</Text>
            <View style={{ flexDirection:'row', marginBottom: spacing(2) }}>
              {[1,2,3,4,5].map(p => (
                <TouchableOpacity key={p} onPress={()=> setTplPriority(p)} style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:14, marginRight:8, backgroundColor: tplPriority===p? palette.primary : palette.border }}>
                  <Text style={{ fontSize:11, color: tplPriority===p? '#fff' : palette.text }}>P{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize:12, color: palette.textLight, marginBottom:4 }}>Task Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing(2) }}>
              {taskClasses.map(cls => (
                <TouchableOpacity key={cls.task_class_id} onPress={()=> setTplClass(cls.task_class_id)} style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:6, borderRadius:18, marginRight:8, backgroundColor: tplClass===cls.task_class_id ? (cls.color || palette.primary) : palette.border }}>
                  <View style={{ width:10, height:10, borderRadius:5, backgroundColor: cls.color || palette.primary, marginRight:6 }} />
                  <Text style={{ fontSize:11, color: tplClass===cls.task_class_id? '#fff' : palette.text }}>{cls.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={async ()=>{ const base = 'Class'; let idx=1; let candidate = base+idx; const names = taskClasses.map(c=>c.name); while(names.includes(candidate)){ idx++; candidate=base+idx; } try { const id = await createTaskClass({ name: candidate }); await refresh(); setTplClass(id); } catch {} }} style={{ paddingHorizontal:14, paddingVertical:6, borderRadius:18, backgroundColor: palette.border }}>
                <Text style={{ fontSize:16, color: palette.text }}>＋</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: spacing(1) }}>
              {editingTemplate && <TouchableOpacity onPress={async ()=>{ try { await deactivateRecurringTemplate(editingTemplate.template_id); setTemplateModal(false); refresh(); } catch {} }} style={{ paddingVertical:10, paddingHorizontal:12, marginRight: spacing(2) }}><Text style={{ fontSize:12, color: palette.error || '#E53935' }}>Deactivate</Text></TouchableOpacity>}
              <TouchableOpacity onPress={()=> setTemplateModal(false)} style={{ paddingVertical:10, paddingHorizontal:12 }}><Text style={{ fontSize:12, color: palette.textLight }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={saveTemplate} style={{ paddingVertical:10, paddingHorizontal:12 }}><Text style={{ fontSize:12, color: palette.primary }}>{editingTemplate? 'Save':'Add'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// retain styles shell
const styles = StyleSheet.create({ safe:{}, screen:{}, container:{}, header:{}, section:{}, row:{}, flex:{}, sep:{}, item:{}, text:{}, completed:{}, due:{}, hint:{}, topBar:{} });

export default TaskScreen;
