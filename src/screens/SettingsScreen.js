import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
// Removed FlatList import to avoid nested VirtualizedList
import { getActionClasses, createActionClass, updateActionClass, deleteActionClass, setPreference, getPreference, listTaskClasses, createTaskClass, updateTaskClass, deleteTaskClass, listRecurringTemplates, createRecurringTemplate, updateRecurringTemplate, deactivateRecurringTemplate } from '../services/Database';
import { useTheme, useThemeMode } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';

const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

const SettingsScreen = ({ navigation }) => {
  const { palette, spacing, typography } = useTheme();
  const { mode, toggleMode, reducedMotion, toggleReducedMotion } = useThemeMode();
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState(null);
  const [showClassManager, setShowClassManager] = useState(false);
  const [newColor, setNewColor] = useState('#2196F3');
  const [editColor, setEditColor] = useState(null);
  // Task Class state
  const [taskClasses, setTaskClasses] = useState([]);
  const [taskClassName, setTaskClassName] = useState('');
  const [taskNewColor, setTaskNewColor] = useState('#607D8B');
  const [taskEditId, setTaskEditId] = useState(null);
  const [taskEditName, setTaskEditName] = useState('');
  const [taskEditColor, setTaskEditColor] = useState(null);
  const [taskError, setTaskError] = useState(null);
  const [showTaskClassManager, setShowTaskClassManager] = useState(false);
  // Recurring Template state
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplPattern, setTplPattern] = useState('daily');
  const [tplWeekdays, setTplWeekdays] = useState([]); // strings 0-6
  const [tplPriority, setTplPriority] = useState(3);
  const [tplClass, setTplClass] = useState(null);
  const [tplSeed, setTplSeed] = useState(new Date().toISOString().slice(0,10));
  const [editingTemplate, setEditingTemplate] = useState(null);
  const colorPalette = React.useMemo(()=>{
    const base = [
      '#EF5350','#E91E63','#D81B60','#AD1457','#880E4F','#F06292','#EC407A','#AB47BC','#9C27B0','#8E24AA','#7B1FA2','#6A1B9A',
      '#BA68C8','#9575CD','#673AB7','#5E35B1','#512DA8','#4527A0','#311B92','#3F51B5','#3949AB','#303F9F','#283593','#1A237E',
      '#2196F3','#1E88E5','#1976D2','#1565C0','#0D47A1','#64B5F6','#42A5F5','#29B6F6','#03A9F4',
      '#00ACC1','#0097A7','#00838F','#006064','#4DD0E1','#26C6DA','#00BCD4','#80DEEA','#4DB6AC','#26A69A','#009688','#00796B',
      '#004D40','#66BB6A','#43A047','#388E3C','#2E7D32','#1B5E20','#8BC34A','#7CB342','#689F38','#558B2F','#33691E','#CDDC39'
    ];
    return Array.from(new Set(base)); // ensure uniqueness
  },[]);

  const refresh = async () => {
    try {
      const c = await getActionClasses();
      setClasses(c);
    } catch (e) { setError(e.message); }
  };
  const refreshTaskClasses = async () => {
    try {
      const t = await listTaskClasses();
      setTaskClasses(t);
    } catch (e) { setTaskError(e.message); }
  };
  const refreshTemplates = async () => { try { const r = await listRecurringTemplates(); setTemplates(r); } catch {} };

  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (showTaskClassManager) refreshTaskClasses(); }, [showTaskClassManager]);
  useEffect(() => { if(showTemplateManager) { refreshTemplates(); refreshTaskClasses(); } }, [showTemplateManager]);
  useEffect(() => {
    (async () => {
      const savedTheme = await getPreference('theme_mode');
      if (savedTheme && savedTheme !== mode) toggleMode(); // simple sync if differs
      const savedMotion = await getPreference('reduced_motion');
      if (savedMotion === '1' && !reducedMotion) toggleReducedMotion();
    })();
  }, []);
  useEffect(() => { setPreference('theme_mode', mode); }, [mode]);
  useEffect(() => { setPreference('reduced_motion', reducedMotion ? '1' : '0'); }, [reducedMotion]);

  const handleAdd = async () => {
    setError(null);
    try {
      await createActionClass(name, newColor);
      setName('');
      setNewColor(colorPalette[0]);
      refresh();
    } catch (e) { setError(e.message); }
  };

  const startEdit = (item) => {
    setEditId(item.action_class_id);
    setEditName(item.name);
    setEditColor(item.color || colorPalette[0]);
  };

  const handleSaveEdit = async () => {
    try { await updateActionClass(editId, { name: editName, color: editColor }); refresh(); } catch (e) { setError(e.message); }
    setEditId(null); setEditName(''); setEditColor(null);
  };

  const handleDelete = async (id) => {
    try { await deleteActionClass(id); refresh(); } catch (e) { setError(e.message); }
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(10) }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={{ ...typography.h1, color: palette.text }}>Settings</Text>
        </View>
        <View style={{ flexDirection:'row', flexWrap:'wrap', marginTop: spacing(4), marginHorizontal:-spacing(1) }}>
          {/* Theme Toggle */}
          <TouchableOpacity onPress={toggleMode} style={{ width:'50%', padding: spacing(1) }} accessibilityRole="button" accessibilityLabel="Toggle theme mode">
            <Card>
              <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>Theme</Text>
              <Text style={{ marginTop: spacing(1), fontSize:12, color: palette.textLight }}>{mode === 'dark' ? 'Dark' : 'Light'}</Text>
            </Card>
          </TouchableOpacity>
          {/* Reduced Motion Toggle */}
          <TouchableOpacity onPress={toggleReducedMotion} style={{ width:'50%', padding: spacing(1) }} accessibilityRole="button" accessibilityLabel="Toggle reduced motion preference">
            <Card>
              <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>Motion</Text>
              <Text style={{ marginTop: spacing(1), fontSize:12, color: palette.textLight }}>{reducedMotion ? 'Reduced' : 'Full'}</Text>
            </Card>
          </TouchableOpacity>
          {/* Notifications placeholder */}
            <View style={{ width:'50%', padding: spacing(1) }}>
              <Card>
                <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>Notifications</Text>
                <Text style={{ marginTop: spacing(1), fontSize:12, color: palette.textLight }}>Configure (TBD)</Text>
              </Card>
            </View>
          {/* Backup/Restore placeholder */}
          <View style={{ width:'50%', padding: spacing(1) }}>
            <Card>
              <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>Backup</Text>
              <Text style={{ marginTop: spacing(1), fontSize:12, color: palette.textLight }}>Export / Import (TBD)</Text>
            </Card>
          </View>
          {/* Action Class Manager */}
          <TouchableOpacity onPress={() => setShowClassManager(s => !s)} style={{ width:'50%', padding: spacing(1) }} accessibilityRole="button" accessibilityLabel="Manage action classes">
            <Card>
              <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>Action Classes</Text>
              <Text style={{ marginTop: spacing(1), fontSize:12, color: palette.textLight }}>{classes.length} total</Text>
              <Text style={{ marginTop: spacing(1), fontSize:12, color: palette.primary }}>{showClassManager ? 'Hide' : 'Manage'}</Text>
            </Card>
          </TouchableOpacity>
          {/* Task Class Manager */}
          <TouchableOpacity onPress={() => setShowTaskClassManager(s => !s)} style={{ width:'50%', padding: spacing(1) }} accessibilityRole="button" accessibilityLabel="Manage task classes">
            <Card>
              <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>Task Classes</Text>
              <Text style={{ marginTop: spacing(1), fontSize:12, color: palette.textLight }}>{taskClasses.length} total</Text>
              <Text style={{ marginTop: spacing(1), fontSize:12, color: palette.primary }}>{showTaskClassManager ? 'Hide' : 'Manage'}</Text>
            </Card>
          </TouchableOpacity>
          {/* Template Manager Toggle */}
          <TouchableOpacity onPress={() => setShowTemplateManager(s=>!s)} style={{ width:'50%', padding: spacing(1) }} accessibilityRole='button' accessibilityLabel='Manage recurring templates'>
            <Card>
              <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>Templates</Text>
              <Text style={{ marginTop: spacing(1), fontSize:12, color: palette.textLight }}>{templates.length} active</Text>
              <Text style={{ marginTop: spacing(1), fontSize:12, color: palette.primary }}>{showTemplateManager? 'Hide':'Manage'}</Text>
            </Card>
          </TouchableOpacity>
        </View>
        {showClassManager && (
          <Card style={{ marginTop: spacing(4) }}>
            <SectionHeader title="Manage Action Classes" />
            <View style={{ flexDirection:'row', alignItems:'center', marginTop: spacing(2), marginBottom: spacing(3) }}>
              <Input placeholder="New class name" value={name} onChangeText={setName} style={{ flex:1 }} />
              <PrimaryButton small title="Add" onPress={handleAdd} />
            </View>
            {/* Color grid for new class */}
            <View style={{ flexWrap:'wrap', flexDirection:'row', marginBottom: spacing(2) }}>
              {colorPalette.map((c,i) => (
                <TouchableOpacity key={`new-${i}-${c}`} onPress={()=>setNewColor(c)} style={{ width:'8.33%', aspectRatio:1, padding:2 }}>
                  <View style={{ flex:1, borderRadius:6, backgroundColor:c, borderWidth: newColor===c ? 3 : 1, borderColor: newColor===c ? palette.text : palette.border }} />
                </TouchableOpacity>
              ))}
            </View>
            {editId && (
              <View style={{ marginBottom: spacing(3) }}>
                <View style={{ flexDirection:'row', alignItems:'center', marginBottom: spacing(2) }}>
                  <Input placeholder="Edit name" value={editName} onChangeText={setEditName} style={{ flex:1 }} />
                  <PrimaryButton small title="Save" onPress={handleSaveEdit} />
                  <PrimaryButton small title="Cancel" onPress={() => { setEditId(null); setEditName(''); setEditColor(null); }} />
                </View>
                <View style={{ flexWrap:'wrap', flexDirection:'row' }}>
                  {colorPalette.map((c,i) => (
                    <TouchableOpacity key={`edit-${i}-${c}`} onPress={()=>setEditColor(c)} style={{ width:'8.33%', aspectRatio:1, padding:2 }}>
                      <View style={{ flex:1, borderRadius:6, backgroundColor:c, borderWidth: editColor===c ? 3 : 1, borderColor: editColor===c ? palette.text : palette.border }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {error && <Text style={{ color: palette.danger, marginTop: spacing(2) }}>{error}</Text>}
            {/* Replaced FlatList with manual map to avoid nesting VirtualizedList inside ScrollView */}
            <View style={{ marginTop: spacing(2) }}>
              {classes.map((item, idx) => (
                <View key={item.action_class_id} style={{ flexDirection:'row', alignItems:'center', paddingVertical: spacing(2), gap: spacing(2), borderTopWidth: idx===0 ? 0 : 1, borderColor: palette.border }}>
                  <View style={{ width:14, height:14, borderRadius:4, backgroundColor: item.color || palette.primary }} />
                  <Text style={{ flex:1, fontSize:14, color: palette.text }}>{item.name}</Text>
                  <PrimaryButton small title="Edit" onPress={() => startEdit(item)} />
                  <PrimaryButton small title="Del" onPress={() => handleDelete(item.action_class_id)} />
                </View>
              ))}
              {!classes.length && <Text style={{ fontSize:12, color: palette.textLight }}>No classes yet.</Text>}
            </View>
          </Card>
        )}
        {showTaskClassManager && (
          <Card style={{ marginTop: spacing(4) }}>
            <SectionHeader title="Manage Task Classes" />
            <View style={{ flexDirection:'row', alignItems:'center', marginTop: spacing(2), marginBottom: spacing(3) }}>
              <Input placeholder="New task class name" value={taskClassName} onChangeText={setTaskClassName} style={{ flex:1 }} />
              <PrimaryButton small title="Add" onPress={async () => { setTaskError(null); try { await createTaskClass({ name: taskClassName, color: taskNewColor }); setTaskClassName(''); setTaskNewColor(colorPalette[0]); refreshTaskClasses(); } catch(e){ setTaskError(e.message); } }} />
            </View>
            <View style={{ flexWrap:'wrap', flexDirection:'row', marginBottom: spacing(2) }}>
              {colorPalette.map((c,i) => (
                <TouchableOpacity key={`taskNew-${i}-${c}`} onPress={()=>setTaskNewColor(c)} style={{ width:'8.33%', aspectRatio:1, padding:2 }}>
                  <View style={{ flex:1, borderRadius:6, backgroundColor:c, borderWidth: taskNewColor===c ? 3 : 1, borderColor: taskNewColor===c ? palette.text : palette.border }} />
                </TouchableOpacity>
              ))}
            </View>
            {taskEditId && (
              <View style={{ marginBottom: spacing(3) }}>
                <View style={{ flexDirection:'row', alignItems:'center', marginBottom: spacing(2) }}>
                  <Input placeholder="Edit task class name" value={taskEditName} onChangeText={setTaskEditName} style={{ flex:1 }} />
                  <PrimaryButton small title="Save" onPress={async () => { try { await updateTaskClass(taskEditId, { name: taskEditName, color: taskEditColor }); refreshTaskClasses(); } catch(e){ setTaskError(e.message); } setTaskEditId(null); setTaskEditName(''); setTaskEditColor(null); }} />
                  <PrimaryButton small title="Cancel" onPress={() => { setTaskEditId(null); setTaskEditName(''); setTaskEditColor(null); }} />
                </View>
                <View style={{ flexWrap:'wrap', flexDirection:'row' }}>
                  {colorPalette.map((c,i) => (
                    <TouchableOpacity key={`taskEdit-${i}-${c}`} onPress={()=>setTaskEditColor(c)} style={{ width:'8.33%', aspectRatio:1, padding:2 }}>
                      <View style={{ flex:1, borderRadius:6, backgroundColor:c, borderWidth: taskEditColor===c ? 3 : 1, borderColor: taskEditColor===c ? palette.text : palette.border }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {taskError && <Text style={{ color: palette.danger, marginTop: spacing(2) }}>{taskError}</Text>}
            <View style={{ marginTop: spacing(2) }}>
              {taskClasses.map((item, idx) => (
                <View key={item.task_class_id} style={{ flexDirection:'row', alignItems:'center', paddingVertical: spacing(2), gap: spacing(2), borderTopWidth: idx===0 ? 0 : 1, borderColor: palette.border }}>
                  <View style={{ width:14, height:14, borderRadius:4, backgroundColor: item.color || palette.primary }} />
                  <Text style={{ flex:1, fontSize:14, color: palette.text }}>{item.name}</Text>
                  <PrimaryButton small title="Edit" onPress={() => { setTaskEditId(item.task_class_id); setTaskEditName(item.name); setTaskEditColor(item.color || colorPalette[0]); }} />
                  <PrimaryButton small title="Del" onPress={async () => { try { await deleteTaskClass(item.task_class_id); refreshTaskClasses(); } catch(e){ setTaskError(e.message); } }} />
                </View>
              ))}
              {!taskClasses.length && <Text style={{ fontSize:12, color: palette.textLight }}>No task classes yet.</Text>}
            </View>
          </Card>
        )}
        {showTemplateManager && (
          <Card style={{ marginTop: spacing(4) }}>
            <SectionHeader title={editingTemplate? 'Edit Template':'New Template'} />
            <Input placeholder='Name' value={tplName} onChangeText={setTplName} style={{ marginTop: spacing(2) }} />
            <Input placeholder='Description (optional)' value={tplDesc} onChangeText={setTplDesc} style={{ marginTop: spacing(2) }} />
            <Text style={{ fontSize:12, color: palette.textLight, marginTop: spacing(3) }}>Pattern</Text>
            <View style={{ flexDirection:'row', marginTop: spacing(1) }}>
              {['daily','weekdays','every_other_day'].map(p => (
                <TouchableOpacity key={p} onPress={()=> setTplPattern(p)} style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:14, marginRight:8, backgroundColor: tplPattern===p? palette.primary : palette.border }}>
                  <Text style={{ fontSize:11, color: tplPattern===p? '#fff' : palette.text }}>{p.replace(/_/g,' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {tplPattern==='weekdays' && (
              <View style={{ flexDirection:'row', marginTop: spacing(2) }}>
                {['S','M','T','W','T','F','S'].map((lbl,i)=> (
                  <TouchableOpacity key={i} onPress={()=> setTplWeekdays(prev=> prev.includes(String(i))? prev.filter(x=>x!==String(i)) : [...prev, String(i)])} style={{ width:32, height:32, borderRadius:16, marginRight:6, alignItems:'center', justifyContent:'center', backgroundColor: tplWeekdays.includes(String(i))? palette.primary : palette.border }}>
                    <Text style={{ fontSize:12, color: tplWeekdays.includes(String(i))? '#fff' : palette.text }}>{lbl}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {tplPattern==='every_other_day' && (
              <View style={{ marginTop: spacing(2) }}>
                <Text style={{ fontSize:12, color: palette.textLight, marginBottom:4 }}>Seed Date (YYYY-MM-DD)</Text>
                <Input value={tplSeed} onChangeText={setTplSeed} placeholder='YYYY-MM-DD' />
              </View>
            )}
            <Text style={{ fontSize:12, color: palette.textLight, marginTop: spacing(3) }}>Priority</Text>
            <View style={{ flexDirection:'row', marginTop: spacing(1) }}>
              {[1,2,3,4,5].map(p => (
                <TouchableOpacity key={p} onPress={()=> setTplPriority(p)} style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:14, marginRight:8, backgroundColor: tplPriority===p? palette.primary : palette.border }}>
                  <Text style={{ fontSize:11, color: tplPriority===p? '#fff' : palette.text }}>P{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize:12, color: palette.textLight, marginTop: spacing(3) }}>Task Class</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing(1) }}>
              {taskClasses.map(cls => (
                <TouchableOpacity key={cls.task_class_id} onPress={()=> setTplClass(cls.task_class_id)} style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:6, borderRadius:18, marginRight:8, backgroundColor: tplClass===cls.task_class_id ? (cls.color || palette.primary) : palette.border }}>
                  <View style={{ width:10, height:10, borderRadius:5, backgroundColor: cls.color || palette.primary, marginRight:6 }} />
                  <Text style={{ fontSize:11, color: tplClass===cls.task_class_id? '#fff' : palette.text }}>{cls.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: spacing(3) }}>
              {editingTemplate && (
                <TouchableOpacity onPress={async ()=>{ try { await deactivateRecurringTemplate(editingTemplate.template_id); setEditingTemplate(null); setTplName(''); setTplDesc(''); setTplPattern('daily'); setTplWeekdays([]); setTplPriority(3); setTplClass(null); setTplSeed(new Date().toISOString().slice(0,10)); refreshTemplates(); } catch {} }} style={{ paddingVertical:10, paddingHorizontal:12, marginRight: spacing(2) }}>
                  <Text style={{ fontSize:12, color: palette.error || '#E53935' }}>Deactivate</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={()=> { setEditingTemplate(null); setTplName(''); setTplDesc(''); setTplPattern('daily'); setTplWeekdays([]); setTplPriority(3); setTplClass(null); setTplSeed(new Date().toISOString().slice(0,10)); }} style={{ paddingVertical:10, paddingHorizontal:12 }}>
                <Text style={{ fontSize:12, color: palette.textLight }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async ()=> { if(!tplName.trim()) return; const weekDaysStr = tplPattern==='weekdays'? tplWeekdays.sort().join(',') : ''; try { if(editingTemplate){ await updateRecurringTemplate(editingTemplate.template_id, { name: tplName.trim(), description: tplDesc, patternType: tplPattern, patternDays: weekDaysStr, everyOtherSeed: tplPattern==='every_other_day'? tplSeed : null, priority: tplPriority, taskClassId: tplClass }); } else { await createRecurringTemplate({ name: tplName.trim(), description: tplDesc, patternType: tplPattern, patternDays: weekDaysStr, everyOtherSeed: tplPattern==='every_other_day'? tplSeed : null, priority: tplPriority, taskClassId: tplClass }); } refreshTemplates(); setEditingTemplate(null); setTplName(''); setTplDesc(''); setTplPattern('daily'); setTplWeekdays([]); setTplPriority(3); setTplClass(null); setTplSeed(new Date().toISOString().slice(0,10)); } catch {} }} style={{ paddingVertical:10, paddingHorizontal:12 }}>
                <Text style={{ fontSize:12, color: palette.primary }}>{editingTemplate? 'Save':'Add'}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: spacing(2) }}>
              {templates.map(tpl => (
                <TouchableOpacity key={tpl.template_id} onPress={()=> { setEditingTemplate(tpl); setTplName(tpl.name); setTplDesc(tpl.description||''); setTplPattern(tpl.pattern_type); setTplWeekdays((tpl.pattern_days||'').split(',').filter(Boolean)); setTplPriority(tpl.priority||3); setTplClass(tpl.task_class_id||null); setTplSeed(tpl.every_other_seed || new Date().toISOString().slice(0,10)); }} style={{ paddingVertical:8, borderBottomWidth:1, borderColor: palette.border }}>
                  <Text style={{ fontSize:13, color: palette.text, fontWeight:'600' }}>{tpl.name}</Text>
                  <Text style={{ fontSize:11, color: palette.textLight }}>{tpl.pattern_type}{tpl.pattern_type==='weekdays' && ':' + (tpl.pattern_days||'')}</Text>
                </TouchableOpacity>
              ))}
              {!templates.length && <Text style={{ fontSize:12, color: palette.textLight }}>No active templates</Text>}
            </View>
          </Card>
        )}
      </ScrollView>
      {/* OptionsDrawer removed */}
    </SafeAreaView>
  );
};

// retain styles object shell
const styles = StyleSheet.create({ safe:{}, screen:{}, container:{}, header:{}, section:{}, row:{}, flex:{}, error:{}, sep:{}, item:{}, itemText:{}, color:{}, topBar:{} });

export default SettingsScreen;
