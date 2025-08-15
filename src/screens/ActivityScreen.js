import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing, DeviceEventEmitter, Modal, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemeMode } from '../constants/theme';
import { getActionClasses, getCurrentActivity, getTodaysActivities, startActivity, stopCurrentActivityWithNormalization, getPreference, setPreference, createActivity, updateActivity, deleteActivity } from '../services/Database';
import Chip from '../components/ui/Chip';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';

const ActivityScreen = ({ navigation }) => {
  const { palette, spacing, typography } = useTheme();
  const { reducedMotion } = useThemeMode();
  const [darkMode, setDarkMode] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);
  const [classes, setClasses] = useState([]);
  const [current, setCurrent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const [now, setNow] = useState(Date.now());
  const ringScale = useRef(new Animated.Value(1)).current;
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null); // activity object or null
  const [formClassId, setFormClassId] = useState(null);
  const [formStart, setFormStart] = useState(''); // HH:MM
  const [formEnd, setFormEnd] = useState(''); // HH:MM
  const [formDesc, setFormDesc] = useState('');
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [classesLoaded, setClassesLoaded] = useState(false);

  const refresh = async () => {
    try {
      const [cls, curr, todays] = await Promise.all([
        getActionClasses(),
        getCurrentActivity(),
        getTodaysActivities()
      ]);
      setClasses(cls);
      setCurrent(curr);
      setActivities(todays);
      setClassesLoaded(true);
    } catch (e) {
      console.warn('refresh failed', e);
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (current) {
      intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [current]);

  useEffect(() => {
    if (reducedMotion) { ringScale.setValue(1); return; }
    const pulse = () => {
      Animated.sequence([
        Animated.timing(ringScale, { toValue: 1.06, duration: 2800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 0.94, duration: 2800, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ]).start(() => { if (!reducedMotion) pulse(); });
    };
    pulse();
    return () => ringScale.stopAnimation();
  }, [reducedMotion]);

  const startCls = async (cls) => { await startActivity(cls.action_class_id); refresh(); };
  const stop = async () => { await stopCurrentActivityWithNormalization(); showToast('Stopped'); refresh(); };

  const elapsedMs = current ? (now - new Date(current.start_time).getTime()) : 0;
  const minutes = Math.floor(elapsedMs / 60000).toString().padStart(2,'0');
  const seconds = Math.floor((elapsedMs % 60000)/1000).toString().padStart(2,'0');

  useEffect(() => { const unsub = navigation.addListener('focus', refresh); return unsub; }, [navigation]);
  useEffect(() => { const sub = DeviceEventEmitter.addListener('activityUpdated', refresh); return () => sub.remove(); }, []);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const openAddModal = () => {
    setEditing(null);
    setFormClassId(classes.length ? classes[0].action_class_id : null);
    const nowD = new Date();
    const hh = nowD.getHours().toString().padStart(2,'0');
    const mm = nowD.getMinutes().toString().padStart(2,'0');
    setFormStart(hh + ':' + mm);
    setFormEnd(hh + ':' + mm);
    setFormDesc('');
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditing(item);
    setFormClassId(item.action_class_id);
    const st = new Date(item.start_time);
    const et = item.end_time ? new Date(item.end_time) : null;
    const fmt = (d) => d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
    setFormStart(fmt(st));
    setFormEnd(et ? fmt(et) : fmt(new Date()));
    setFormDesc(item.description || '');
    setModalVisible(true);
  };
  const closeModal = () => { setModalVisible(false); };

  const buildISO = (hhmm) => {
    const [h,m] = hhmm.split(':').map(x=>parseInt(x,10));
    if (isNaN(h) || isNaN(m)) return null;
    const d = new Date();
    d.setHours(h); d.setMinutes(m); d.setSeconds(0); d.setMilliseconds(0);
    return d.toISOString();
  };

  const onSaveActivity = async () => {
    try {
      if (!formClassId) throw new Error('Class required');
      const startISO = buildISO(formStart);
      const endISO = buildISO(formEnd);
      if (!startISO || !endISO) throw new Error('Invalid time');
      if (new Date(endISO) <= new Date(startISO)) throw new Error('End must be after start');
      if (editing) {
        await updateActivity({ id: editing.activity_id, actionClassId: formClassId, startISO, endISO, description: formDesc });
        showToast('Activity updated');
      } else {
        await createActivity({ actionClassId: formClassId, startISO, endISO, description: formDesc });
        showToast('Activity added');
      }
      closeModal();
      refresh();
    } catch (e) {
      showToast(e.message || 'Save failed');
    }
  };

  const onDeleteActivity = async () => {
    if (!editing) return;
    try {
      await deleteActivity(editing.activity_id);
      showToast('Deleted');
      closeModal();
      refresh();
    } catch (e) {
      showToast('Delete failed');
    }
  };

  const performStart = async (actionClassId) => {
    try {
      setCurrent({ action_class_id: actionClassId, action_class_name: (classes.find(c=>c.action_class_id===actionClassId)||{}).name, start_time: new Date().toISOString(), color: (classes.find(c=>c.action_class_id===actionClassId)||{}).color });
      await startActivity(actionClassId);
      await setPreference('last_action_class_id', String(actionClassId));
      showToast && showToast('Started');
      refresh();
    } catch (e) { console.warn('start failed', e); showToast && showToast('Start failed'); }
  };

  const onActionPress = async () => {
    if (current) {
      await stopCurrentActivityWithNormalization();
      showToast && showToast('Stopped');
      refresh();
    } else {
      let lastId = null;
      try { lastId = await getPreference('last_action_class_id', null); } catch {}
      const parsed = lastId ? parseInt(lastId,10) : null;
      if (parsed && classes.some(c=>c.action_class_id===parsed)) {
        performStart(parsed);
      } else {
        setClassPickerVisible(true);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']}> 
      <View style={{ flex:1, padding: spacing(4), paddingBottom: spacing(14) }}>
        <View style={{ marginBottom: spacing(4), flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={{ ...typography.h1, color: palette.text }}>Activity</Text>
          <TouchableOpacity onPress={openAddModal} style={{ paddingHorizontal: spacing(2), paddingVertical: spacing(1) }}>
            <Text style={{ fontSize:12, color: palette.primary }}>Add</Text>
          </TouchableOpacity>
        </View>
        {/* Breathing ring */}
        <View style={{ alignItems:'center', marginTop: spacing(1) }}>
          <Animated.View style={{ transform:[{ scale: ringScale }] }}>
            <TouchableOpacity activeOpacity={0.85} onPress={onActionPress}>
              <View style={{ width:220, height:220, borderRadius:110, alignItems:'center', justifyContent:'center', backgroundColor: palette.surface, borderWidth:4, borderColor: current ? (current.color || palette.primary) : palette.border }}>
                <Text style={{ fontSize:38, fontWeight:'600', color: palette.text }}>{minutes}:{seconds}</Text>
                {current && <Text style={{ marginTop:4, fontSize:14, color: palette.textLight }}>{current.action_class_name}</Text>}
                {!current && <Text style={{ marginTop:8, fontSize:12, color: palette.textLight }}>Tap to Start</Text>}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
        {/* Timeline (only scrollable area) */}
        <View style={{ flex:1, marginTop: spacing(6) }}>
          <Text style={{ fontSize:16, fontWeight:'600', color: palette.text, marginBottom: spacing(2) }}>Today's Timeline</Text>
          {loading ? <Text style={{ fontSize:12, color: palette.textLight }}>Loading...</Text> : (
            <View style={{ flex:1, borderWidth:1, borderColor: palette.border, borderRadius:12, overflow:'hidden' }}>
              <ScrollView>
                {activities.map((item, idx) => {
                  const duration = item.end_time ? Math.round((new Date(item.end_time) - new Date(item.start_time))/60000) : Math.round((Date.now() - new Date(item.start_time))/60000);
                  return (
                    <TouchableOpacity key={item.activity_id} onPress={() => openEditModal(item)} style={{ paddingVertical: spacing(2), paddingHorizontal: spacing(3), flexDirection:'row', alignItems:'center', backgroundColor: idx %2 ? palette.surface : palette.background }}>
                      <View style={{ width:10, height:10, borderRadius:5, backgroundColor: item.color || palette.primary, marginRight: spacing(2) }} />
                      <View style={{ flex:1 }}>
                        <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>{item.action_class_name}</Text>
                        <Text style={{ fontSize:12, color: palette.textLight }}>{new Date(item.start_time).toLocaleTimeString()} {item.end_time ? ' - ' + new Date(item.end_time).toLocaleTimeString() : ' (running)'}</Text>
                      </View>
                      <Text style={{ fontSize:12, color: palette.textLight }}>{duration}m</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
      {toast && (
        <View style={{ position:'absolute', bottom: 40, left: 20, right: 20, backgroundColor: palette.surface, padding: spacing(2), borderRadius:8, shadowColor:'#000', shadowOpacity:0.2, shadowRadius:6, elevation:4 }}>
          <Text style={{ textAlign:'center', fontSize:12, color: palette.text }}>{toast}</Text>
        </View>
      )}
      {/* Class Picker for starting */}
      <Modal visible={classPickerVisible} transparent animationType='fade' onRequestClose={() => setClassPickerVisible(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', padding:32 }}>
          <View style={{ backgroundColor: palette.surface, borderRadius:16, padding: spacing(4) }}>
            <Text style={{ fontSize:16, fontWeight:'600', color: palette.text, marginBottom: spacing(3) }}>Select Activity Type</Text>
            <View style={{ maxHeight: 360 }}>
              {classes.map(c => (
                <Pressable key={c.action_class_id} onPress={() => { setClassPickerVisible(false); performStart(c.action_class_id); }} style={{ paddingVertical:12, flexDirection:'row', alignItems:'center' }}>
                  <View style={{ width:14, height:14, borderRadius:7, backgroundColor: c.color || palette.primary, marginRight:12 }} />
                  <Text style={{ fontSize:14, color: palette.text }}>{c.name}</Text>
                </Pressable>
              ))}
              {!classes.length && <Text style={{ fontSize:12, color: palette.textLight }}>No action classes</Text>}
            </View>
            <TouchableOpacity onPress={() => setClassPickerVisible(false)} style={{ alignSelf:'flex-end', marginTop: spacing(2) }}>
              <Text style={{ fontSize:13, color: palette.textLight }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Edit/Add Activity Modal */}
      <Modal visible={modalVisible} transparent animationType='fade' onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'center', padding:28 }}>
          <View style={{ backgroundColor: palette.surface, borderRadius:16, padding: spacing(4) }}>
            <Text style={{ fontSize:16, fontWeight:'600', color: palette.text, marginBottom: spacing(2) }}>{editing ? 'Edit Activity' : 'Add Activity'}</Text>
            <Text style={{ fontSize:12, color: palette.textLight, marginBottom: spacing(1) }}>Class</Text>
            <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom: spacing(2) }}>
              {classes.map(c => (
                <Pressable key={c.action_class_id} onPress={() => setFormClassId(c.action_class_id)} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:16, backgroundColor: formClassId===c.action_class_id ? (c.color || palette.primary) : palette.border, marginRight:8, marginBottom:8 }}>
                  <Text style={{ fontSize:12, color: formClassId===c.action_class_id ? '#fff' : palette.text }}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize:12, color: palette.textLight }}>Start (HH:MM)</Text>
            <TextInput value={formStart} onChangeText={setFormStart} placeholder='HH:MM' style={{ borderWidth:1, borderColor: palette.border, padding:8, borderRadius:6, color: palette.text, marginBottom: spacing(2) }} />
            <Text style={{ fontSize:12, color: palette.textLight }}>End (HH:MM)</Text>
            <TextInput value={formEnd} onChangeText={setFormEnd} placeholder='HH:MM' style={{ borderWidth:1, borderColor: palette.border, padding:8, borderRadius:6, color: palette.text, marginBottom: spacing(2) }} />
            <Text style={{ fontSize:12, color: palette.textLight }}>Description</Text>
            <TextInput value={formDesc} onChangeText={setFormDesc} placeholder='Optional' multiline style={{ borderWidth:1, borderColor: palette.border, padding:8, borderRadius:6, color: palette.text, height:80, textAlignVertical:'top', marginBottom: spacing(3) }} />
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              {editing ? (
                <TouchableOpacity onPress={async () => { try { await deleteActivity(editing.activity_id); showToast('Deleted'); setModalVisible(false); refresh(); } catch { showToast('Delete failed'); } }} style={{ paddingVertical:10, paddingHorizontal:14 }}>
                  <Text style={{ color: palette.error || '#E53935', fontSize:13 }}>Delete</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
              <View style={{ flexDirection:'row' }}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={{ paddingVertical:10, paddingHorizontal:14 }}>
                  <Text style={{ color: palette.textLight, fontSize:13 }}>Cancel</Text>
                </TouchableOpacity>
                <View style={{ width: spacing(3) }} />
                <TouchableOpacity onPress={async () => { try {
                  if (!formClassId) throw new Error('Class');
                  const buildISO = (hhmm) => { const [h,m]=hhmm.split(':').map(n=>parseInt(n,10)); if(isNaN(h)||isNaN(m)) return null; const d=new Date(); d.setHours(h); d.setMinutes(m); d.setSeconds(0); d.setMilliseconds(0); return d.toISOString(); };
                  const sISO = buildISO(formStart); const eISO = buildISO(formEnd);
                  if(!sISO||!eISO) throw new Error('Time'); if(new Date(eISO)<=new Date(sISO)) throw new Error('Order');
                  if (editing) { await updateActivity({ id: editing.activity_id, actionClassId: formClassId, startISO: sISO, endISO: eISO, description: formDesc }); showToast('Updated'); }
                  else { await createActivity({ actionClassId: formClassId, startISO: sISO, endISO: eISO, description: formDesc }); showToast('Added'); }
                  setModalVisible(false); refresh();
                } catch(e) { showToast(e.message || 'Save failed'); } }} style={{ paddingVertical:10, paddingHorizontal:14 }}>
                  <Text style={{ color: palette.primary, fontSize:13 }}>{editing ? 'Save' : 'Add'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// styles object retained for backward compatibility (not used after theme refactor)
const styles = StyleSheet.create({
  safe: { },
  container: { },
  header: { },
  topBar: { }
});

export default ActivityScreen;
