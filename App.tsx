// @ts-nocheck
import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/Database';
import { requestNotificationPermission } from './src/services/Notifications';
import { ThemeProvider, useTheme } from './src/constants/theme';
import FAB from './src/components/ui/FAB';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Input from './src/components/ui/Input';
import PrimaryButton from './src/components/ui/PrimaryButton';
import { getActionClasses, startActivity, createTask, getCurrentActivity, stopCurrentActivity, listTaskClasses } from './src/services/Database';
import Chip from './src/components/ui/Chip';
import { DeviceEventEmitter } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const RootInner = () => {
  const navRef = useNavigationContainerRef();
  const { palette, spacing } = useTheme();
  const [current, setCurrent] = React.useState('');
  const [activityModal, setActivityModal] = React.useState(false);
  const [taskModal, setTaskModal] = React.useState(false);
  const [reportModal, setReportModal] = React.useState(false);
  const [classes, setClasses] = React.useState([]);
  const [selectedClass, setSelectedClass] = React.useState(null);
  const [activityDesc, setActivityDesc] = React.useState('');
  const [taskName, setTaskName] = React.useState('');
  const [taskStartDate, setTaskStartDate] = React.useState('');
  const [taskStartTime, setTaskStartTime] = React.useState('');
  const [taskPriority, setTaskPriority] = React.useState(3);
  const [taskClasses, setTaskClasses] = React.useState([]);
  const [taskClassId, setTaskClassId] = React.useState(null);
  const [currentActivity, setCurrentActivity] = React.useState(null);
  // Task time picker state
  const [taskTimePickerVisible, setTaskTimePickerVisible] = React.useState(false);
  const taskHourScrollRef = React.useRef(null);
  const taskMinuteScrollRef = React.useRef(null);
  const taskHours = React.useMemo(()=>Array.from({length:24},(_,i)=>i),[]);
  const taskMinutes = React.useMemo(()=>Array.from({length:60},(_,i)=>i),[]);
  const parseHM = (val) => { if(!val||!/^[0-9]{2}:[0-9]{2}$/.test(val)) return {h:0,m:0,valid:false}; const [h,m]=val.split(':').map(n=>parseInt(n,10)); return {h:isNaN(h)?0:h,m:isNaN(m)?0:m,valid:!isNaN(h)&&!isNaN(m)}; };
  const formatHM = (h,m)=> h.toString().padStart(2,'0')+':'+m.toString().padStart(2,'0');
  // Date picker state
  const [taskDatePickerVisible, setTaskDatePickerVisible] = React.useState(false);
  const yearScrollRef = React.useRef(null);
  const monthScrollRef = React.useRef(null);
  const dayScrollRef = React.useRef(null);
  const currentYear = new Date().getFullYear();
  const years = React.useMemo(()=>Array.from({length:5},(_,i)=> currentYear -1 + i), [currentYear]);
  const months = React.useMemo(()=>Array.from({length:12},(_,i)=> i+1), []);
  const parseDate = (val) => { if(!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return {y:currentYear,m:new Date().getMonth()+1,d:new Date().getDate(), valid:false}; const [y,m,d]=val.split('-').map(n=>parseInt(n,10)); return {y,m,d, valid:true}; };
  const formatDate = (y,m,d) => `${y}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
  const daysInMonth = (y,m)=> new Date(y, m, 0).getDate();
  const getDaysArray = (y,m)=> Array.from({length: daysInMonth(y,m)},(_,i)=> i+1);

  // Load current activity when switching to Activity tab
  useEffect(() => {
    if (current.includes('Activity')) {
      getCurrentActivity().then(setCurrentActivity).catch(()=>{});
    }
  }, [current]);

  useEffect(() => { if (activityModal) { getActionClasses().then(setClasses).catch(()=>{}); } }, [activityModal]);
  useEffect(() => { if (taskModal) { listTaskClasses().then(setTaskClasses).catch(()=>{}); } }, [taskModal]);

  // Auto-scroll time picker wheels when modal opens
  useEffect(() => {
    if (taskTimePickerVisible) {
      const { h, m } = parseHM(taskStartTime);
      // Delay to ensure ScrollViews are laid out
      const t = setTimeout(() => {
        if (taskHourScrollRef.current) taskHourScrollRef.current.scrollTo({ y: h * 40, animated: true });
        if (taskMinuteScrollRef.current) taskMinuteScrollRef.current.scrollTo({ y: m * 40, animated: true });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [taskTimePickerVisible, taskStartTime]);

  // Auto-scroll date picker wheels when modal opens
  useEffect(() => {
    if (taskDatePickerVisible) {
      const { y, m, d } = parseDate(taskStartDate);
      const t = setTimeout(() => {
        if (yearScrollRef.current) {
          const yi = years.indexOf(y);
          if (yi >= 0) yearScrollRef.current.scrollTo({ y: yi * 40, animated: true });
        }
        if (monthScrollRef.current) monthScrollRef.current.scrollTo({ y: (m - 1) * 40, animated: true });
        if (dayScrollRef.current) dayScrollRef.current.scrollTo({ y: (d - 1) * 40, animated: true });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [taskDatePickerVisible, taskStartDate, years]);

  const navigateSafe = (name, params) => { try { navRef.navigate(name, params || undefined); } catch {} };

  const onFabPress = () => {
    if (current.includes('Activity')) {
      if (currentActivity) {
        // Stop running activity
        stopCurrentActivity().then(() => {
          setCurrentActivity(null);
          DeviceEventEmitter.emit('activityUpdated');
          navRef.navigate('ActivityTab', { ts: Date.now() });
        }).catch(()=>{});
      } else {
        setActivityModal(true);
      }
    }
    else if (current.includes('Tasks')) { setTaskModal(true); }
    else if (current.includes('Journal')) { // jump to today (already default) maybe scroll later
      // no modal; journal action could be add quick note later. For now ensure we are on Journal.
      navRef.navigate('JournalTab');
    } else if (current.includes('Reports')) { setReportModal(true); }
  };

  const submitActivity = async () => {
    if (!selectedClass) return; await startActivity(selectedClass.action_class_id, activityDesc.trim());
    setActivityModal(false); setActivityDesc(''); setSelectedClass(null);
    getCurrentActivity().then(a => { setCurrentActivity(a); DeviceEventEmitter.emit('activityUpdated'); }).catch(()=>{});
    navRef.navigate('ActivityTab', { ts: Date.now() });
  };
  const submitTask = async () => {
    if (!taskName.trim()) return; await createTask({ name: taskName.trim(), priority: taskPriority, taskClassId, startDate: taskStartDate || null, startTime: taskStartTime || null }); setTaskName(''); setTaskStartDate(''); setTaskStartTime(''); setTaskPriority(3); setTaskClassId(null); setTaskModal(false); DeviceEventEmitter.emit('tasksUpdated'); navigateSafe('TasksTab');
  };

  const mondays = React.useMemo(() => {
    const arr = []; const today = new Date(); for (let i=0;i<8;i++) { const d = new Date(today); d.setDate(d.getDate() - i*7); const day = d.getDay(); const diff = (day === 0 ? -6 : 1 - day); d.setDate(d.getDate() + diff); arr.push(d.toISOString().slice(0,10)); }
    return Array.from(new Set(arr));
  }, []);
  const chooseReport = (start) => { setReportModal(false); navigateSafe('ReportsTab', { start }); };

  // Show FAB only on Activity & Tasks tabs. Need current route early.
  const fabHidden = !current || !(current.includes('Activity') || current.includes('Tasks'));

  // If current not yet set shortly after mount, attempt to grab it.
  useEffect(() => {
    if (!current) {
      const t = setTimeout(() => {
        const r = navRef.getCurrentRoute();
        if (r && r.name) setCurrent(r.name);
      }, 40);
      return () => clearTimeout(t);
    }
  }, [current]);

  return (
    <NavigationContainer
      ref={navRef}
      onReady={() => { const r = navRef.getCurrentRoute(); if (r && r.name) setCurrent(r.name); }}
      onStateChange={() => setCurrent(navRef.getCurrentRoute()?.name || '')}
    >
      <AppNavigator />
      {!fabHidden && (
        <FAB
          icon={current.includes('Activity') ? (currentActivity ? '■' : '▶') : current.includes('Tasks') ? '＋' : '＋'}
          label="primary action"
          onPress={onFabPress}
        />
      )}
      <Modal visible={activityModal} transparent animationType="fade" onRequestClose={() => setActivityModal(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', padding: spacing(4) }}>
          <View style={{ backgroundColor: palette.surface, borderRadius:12, padding: spacing(4) }}>
            <Text style={{ fontSize:16, fontWeight:'700', color: palette.text }}>Start Activity</Text>
            <ScrollView horizontal style={{ marginTop: spacing(3) }} showsHorizontalScrollIndicator={false}>
              {classes.map(c => (
                <Chip key={c.action_class_id} label={c.name} color={c.color || palette.primary} active={selectedClass && selectedClass.action_class_id === c.action_class_id} onPress={() => setSelectedClass(c)} />
              ))}
            </ScrollView>
            <Input placeholder="Description (optional)" value={activityDesc} onChangeText={setActivityDesc} style={{ marginTop: spacing(3) }} />
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: spacing(4) }}>
              <PrimaryButton small title="Cancel" onPress={() => setActivityModal(false)} accessibilityLabel="Cancel start" />
              <PrimaryButton small title="Start" onPress={submitActivity} accessibilityLabel="Start activity" />
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={taskModal} transparent animationType="fade" onRequestClose={() => setTaskModal(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', padding: spacing(4) }}>
          <View style={{ backgroundColor: palette.surface, borderRadius:12, padding: spacing(4), maxHeight:'85%' }}>
            <ScrollView>
              <Text style={{ fontSize:16, fontWeight:'700', color: palette.text }}>New Task</Text>
              <Input placeholder="Task name" value={taskName} onChangeText={setTaskName} style={{ marginTop: spacing(3) }} />
              <Text style={{ fontSize:12, color: palette.textLight, marginTop: spacing(3) }}>Priority</Text>
              <View style={{ flexDirection:'row', marginTop: spacing(1) }}>
                {[1,2,3,4,5].map(p => (
                  <TouchableOpacity key={p} onPress={()=> setTaskPriority(p)} style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:14, marginRight:8, backgroundColor: taskPriority===p? palette.primary : palette.border }}>
                    <Text style={{ fontSize:11, color: taskPriority===p? '#fff' : palette.text }}>P{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize:12, color: palette.textLight, marginTop: spacing(3) }}>Task Class</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing(1) }}>
                {taskClasses.map(cls => (
                  <TouchableOpacity key={cls.task_class_id} onPress={()=> setTaskClassId(cls.task_class_id)} style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:6, borderRadius:18, marginRight:8, backgroundColor: taskClassId===cls.task_class_id ? (cls.color || palette.primary) : palette.border }}>
                    <View style={{ width:10, height:10, borderRadius:5, backgroundColor: cls.color || palette.primary, marginRight:6 }} />
                    <Text style={{ fontSize:11, color: taskClassId===cls.task_class_id? '#fff' : palette.text }}>{cls.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={{ fontSize:12, color: palette.textLight, marginTop: spacing(3) }}>Start Date (YYYY-MM-DD)</Text>
              <TouchableOpacity onPress={()=> { setTaskDatePickerVisible(true); }} style={{ marginTop: spacing(1), paddingVertical:12, paddingHorizontal:14, borderRadius:8, backgroundColor: palette.border }} accessibilityRole="button" accessibilityLabel="Select start date">
                <Text style={{ fontSize:13, color: taskStartDate? palette.text : palette.textLight }}>{taskStartDate || 'YYYY-MM-DD'}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize:12, color: palette.textLight, marginTop: spacing(3) }}>Start Time (optional)</Text>
              <TouchableOpacity onPress={()=> { setTaskTimePickerVisible(true); }} style={{ marginTop: spacing(1), paddingVertical:12, paddingHorizontal:14, borderRadius:8, backgroundColor: palette.border }} accessibilityRole="button" accessibilityLabel="Select start time">
                <Text style={{ fontSize:13, color: taskStartTime? palette.text : palette.textLight }}>{taskStartTime || 'HH:MM'}</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: spacing(3) }}>
              <PrimaryButton small title="Cancel" onPress={() => setTaskModal(false)} accessibilityLabel="Cancel task" />
              <PrimaryButton small title="Add" onPress={submitTask} accessibilityLabel="Add task" />
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={reportModal} transparent animationType="fade" onRequestClose={() => setReportModal(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', padding: spacing(4) }}>
          <View style={{ backgroundColor: palette.surface, borderRadius:12, padding: spacing(4), maxHeight:'70%' }}>
            <Text style={{ fontSize:16, fontWeight:'700', color: palette.text }}>Select Week</Text>
            <ScrollView style={{ marginTop: spacing(3) }}>
              {mondays.map(m => (
                <TouchableOpacity key={m} onPress={() => chooseReport(m)} style={{ paddingVertical: spacing(2), borderBottomWidth:1, borderColor: palette.border }}>
                  <Text style={{ fontSize:14, color: palette.text }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: spacing(2) }}>
              <PrimaryButton small title="Close" onPress={() => setReportModal(false)} accessibilityLabel="Close report chooser" />
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={taskTimePickerVisible} transparent animationType='fade' onRequestClose={()=> setTaskTimePickerVisible(false)}>
        {/* start-only time picker */}
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ backgroundColor: palette.surface, padding: spacing(4), borderRadius:16, width:'80%' }}>
            <Text style={{ fontSize:16, fontWeight:'600', color: palette.text, marginBottom: spacing(2) }}>Select Start Time</Text>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <ScrollView ref={taskHourScrollRef} style={{ height:200, width:'45%' }} showsVerticalScrollIndicator={false} snapToInterval={40} decelerationRate='fast'>
                {taskHours.map(h=> { const sel = parseHM(taskStartTime).h===h; return (
                  <TouchableOpacity key={'th'+h} onPress={()=>{ const {m}=parseHM(taskStartTime); setTaskStartTime(formatHM(h,m)); }} style={{ height:40, justifyContent:'center', alignItems:'center' }}>
                    <Text style={{ color: sel? palette.primary : palette.text }}>{h.toString().padStart(2,'0')}</Text>
                  </TouchableOpacity>
                ); })}
              </ScrollView>
              <ScrollView ref={taskMinuteScrollRef} style={{ height:200, width:'45%' }} showsVerticalScrollIndicator={false} snapToInterval={40} decelerationRate='fast'>
                {taskMinutes.map(m=> { const sel = parseHM(taskStartTime).m===m; return (
                  <TouchableOpacity key={'tm'+m} onPress={()=>{ const {h}=parseHM(taskStartTime); setTaskStartTime(formatHM(h,m)); }} style={{ height:40, justifyContent:'center', alignItems:'center' }}>
                    <Text style={{ color: sel? palette.primary : palette.text }}>{m.toString().padStart(2,'0')}</Text>
                  </TouchableOpacity>
                ); })}
              </ScrollView>
            </View>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop: spacing(3) }}>
              <TouchableOpacity onPress={()=> { setTaskStartTime(''); }} style={{ paddingVertical:10, paddingHorizontal:14 }}>
                <Text style={{ color: palette.textLight }}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=> setTaskTimePickerVisible(false)} style={{ paddingVertical:10, paddingHorizontal:14 }}>
                <Text style={{ color: palette.primary }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={taskDatePickerVisible} transparent animationType='fade' onRequestClose={()=> setTaskDatePickerVisible(false)}>
        {/* start-only date picker */}
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ backgroundColor: palette.surface, padding: spacing(4), borderRadius:16, width:'90%' }}>
            <Text style={{ fontSize:16, fontWeight:'600', color: palette.text, marginBottom: spacing(2) }}>Select Start Date</Text>
            {(() => { const {y,m} = parseDate(taskStartDate); let dynDays = getDaysArray(y,m); if(dynDays.length !== daysInMonth(y,m)) dynDays = getDaysArray(y,m); return (
              <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                <ScrollView ref={yearScrollRef} style={{ height:200, width:'30%' }} showsVerticalScrollIndicator={false} snapToInterval={40} decelerationRate='fast'>
                  {years.map(yr => { const sel = parseDate(taskStartDate).y===yr; return (
                    <TouchableOpacity key={'yr'+yr} onPress={()=>{ const cur = parseDate(taskStartDate); const maxDay = daysInMonth(yr, cur.m); const newDay = Math.min(cur.d, maxDay); setTaskStartDate(formatDate(yr, cur.m, newDay)); }} style={{ height:40, justifyContent:'center', alignItems:'center' }}>
                      <Text style={{ color: sel? palette.primary : palette.text }}>{yr}</Text>
                    </TouchableOpacity>
                  ); })}
                </ScrollView>
                <ScrollView ref={monthScrollRef} style={{ height:200, width:'30%' }} showsVerticalScrollIndicator={false} snapToInterval={40} decelerationRate='fast'>
                  {months.map(mm => { const sel = parseDate(taskStartDate).m===mm; return (
                    <TouchableOpacity key={'mm'+mm} onPress={()=>{ const cur = parseDate(taskStartDate); const maxDay = daysInMonth(cur.y, mm); const newDay = Math.min(cur.d, maxDay); setTaskStartDate(formatDate(cur.y, mm, newDay)); }} style={{ height:40, justifyContent:'center', alignItems:'center' }}>
                      <Text style={{ color: sel? palette.primary : palette.text }}>{mm.toString().padStart(2,'0')}</Text>
                    </TouchableOpacity>
                  ); })}
                </ScrollView>
                <ScrollView ref={dayScrollRef} style={{ height:200, width:'30%' }} showsVerticalScrollIndicator={false} snapToInterval={40} decelerationRate='fast'>
                  {dynDays.map(dd => { const sel = parseDate(taskStartDate).d===dd; return (
                    <TouchableOpacity key={'dd'+dd} onPress={()=>{ const cur = parseDate(taskStartDate); setTaskStartDate(formatDate(cur.y, cur.m, dd)); }} style={{ height:40, justifyContent:'center', alignItems:'center' }}>
                      <Text style={{ color: sel? palette.primary : palette.text }}>{dd.toString().padStart(2,'0')}</Text>
                    </TouchableOpacity>
                  ); })}
                </ScrollView>
              </View>
            ); })()}
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop: spacing(3) }}>
              <TouchableOpacity onPress={()=> { setTaskStartDate(''); }} style={{ paddingVertical:10, paddingHorizontal:14 }}>
                <Text style={{ color: palette.textLight }}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=> setTaskDatePickerVisible(false)} style={{ paddingVertical:10, paddingHorizontal:14 }}>
                <Text style={{ color: palette.primary }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </NavigationContainer>
  );
};

const Root = () => {
  useEffect(() => {
    initDatabase();
    requestNotificationPermission();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex:1 }}>
      <ThemeProvider>
        <RootInner />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default Root;
