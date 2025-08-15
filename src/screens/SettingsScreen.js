import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
// Removed FlatList import to avoid nested VirtualizedList
import { getActionClasses, createActionClass, updateActionClass, deleteActionClass, setPreference, getPreference } from '../services/Database';
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
  const colorPalette = React.useMemo(()=>{
    return [
      '#EF5350','#E91E63','#D81B60','#AD1457','#880E4F','#F06292','#EC407A','#AB47BC','#9C27B0','#8E24AA','#7B1FA2','#6A1B9A',
      '#BA68C8','#9575CD','#673AB7','#5E35B1','#512DA8','#4527A0','#311B92','#3F51B5','#3949AB','#303F9F','#283593','#1A237E',
      '#2196F3','#1E88E5','#1976D2','#1565C0','#0D47A1','#64B5F6','#42A5F5','#90CAF9','#64B5F6','#42A5F5','#29B6F6','#03A9F4',
      '#00ACC1','#0097A7','#00838F','#006064','#4DD0E1','#26C6DA','#00BCD4','#80DEEA','#4DB6AC','#26A69A','#009688','#00796B',
      '#004D40','#66BB6A','#43A047','#388E3C','#2E7D32','#1B5E20','#8BC34A','#7CB342','#689F38','#558B2F','#33691E','#CDDC39'
    ].slice(0,60); // ensure 60
  },[]);

  const refresh = async () => {
    try {
      const c = await getActionClasses();
      setClasses(c);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { refresh(); }, []);
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
              {colorPalette.map(c => (
                <TouchableOpacity key={c+'new'} onPress={()=>setNewColor(c)} style={{ width:'8.33%', aspectRatio:1, padding:2 }}>
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
                  {colorPalette.map(c => (
                    <TouchableOpacity key={c+'edit'} onPress={()=>setEditColor(c)} style={{ width:'8.33%', aspectRatio:1, padding:2 }}>
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
      </ScrollView>
      {/* OptionsDrawer removed */}
    </SafeAreaView>
  );
};

// retain styles object shell
const styles = StyleSheet.create({ safe:{}, screen:{}, container:{}, header:{}, section:{}, row:{}, flex:{}, error:{}, sep:{}, item:{}, itemText:{}, color:{}, topBar:{} });

export default SettingsScreen;
