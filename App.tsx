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
import { getActionClasses, startActivity, createTask, getCurrentActivity, stopCurrentActivity } from './src/services/Database';
import Chip from './src/components/ui/Chip';
import { DeviceEventEmitter } from 'react-native';

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
  const [currentActivity, setCurrentActivity] = React.useState(null);

  // Load current activity when switching to Activity tab
  useEffect(() => {
    if (current.includes('Activity')) {
      getCurrentActivity().then(setCurrentActivity).catch(()=>{});
    }
  }, [current]);

  useEffect(() => { if (activityModal) { getActionClasses().then(setClasses).catch(()=>{}); } }, [activityModal]);

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
    if (!taskName.trim()) return; await createTask({ name: taskName.trim() }); setTaskName(''); setTaskModal(false); navigateSafe('TasksTab');
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
          <View style={{ backgroundColor: palette.surface, borderRadius:12, padding: spacing(4) }}>
            <Text style={{ fontSize:16, fontWeight:'700', color: palette.text }}>New Task</Text>
            <Input placeholder="Task name" value={taskName} onChangeText={setTaskName} style={{ marginTop: spacing(3) }} />
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: spacing(4) }}>
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
    </NavigationContainer>
  );
};

const Root = () => {
  useEffect(() => {
    initDatabase();
    requestNotificationPermission();
  }, []);
  return (
    <ThemeProvider>
      <RootInner />
    </ThemeProvider>
  );
};

export default Root;
