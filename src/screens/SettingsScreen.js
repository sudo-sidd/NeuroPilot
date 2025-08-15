import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { getActionClasses, createActionClass, updateActionClass, deleteActionClass } from '../services/Database';
import { useTheme } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';

const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

const SettingsScreen = ({ navigation }) => {
  const { palette, spacing, typography } = useTheme();
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);

  const refresh = async () => {
    try {
      const c = await getActionClasses();
      setClasses(c);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { refresh(); }, []);

  const handleAdd = async () => {
    setError(null);
    try {
      await createActionClass(name, randomColor());
      setName('');
      refresh();
    } catch (e) { setError(e.message); }
  };

  const startEdit = (item) => {
    setEditId(item.action_class_id);
    setEditName(item.name);
  };

  const handleSaveEdit = async () => {
    try { await updateActionClass(editId, { name: editName }); refresh(); } catch (e) { setError(e.message); }
    setEditId(null); setEditName('');
  };

  const handleDelete = async (id) => {
    try { await deleteActionClass(id); refresh(); } catch (e) { setError(e.message); }
  };

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(10) }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={{ ...typography.h1, color: palette.text }}>Settings</Text>
          <TouchableOpacity onPress={() => setDrawerVisible(true)}><Text style={{ fontSize:22, color: palette.text }}>☰</Text></TouchableOpacity>
        </View>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Add Action Class" />
          <View style={{ flexDirection:'row', alignItems:'center', marginTop: spacing(2), marginBottom: spacing(3) }}>
            <Input placeholder="New class name" value={name} onChangeText={setName} style={{ flex:1 }} />
            <PrimaryButton small title="Add" onPress={handleAdd} />
          </View>
          {editId && (
            <View style={{ flexDirection:'row', alignItems:'center', marginTop: spacing(2), marginBottom: spacing(3) }}>
              <Input placeholder="Edit name" value={editName} onChangeText={setEditName} style={{ flex:1 }} />
              <PrimaryButton small title="Save" onPress={handleSaveEdit} />
              <PrimaryButton small title="Cancel" onPress={() => { setEditId(null); setEditName(''); }} />
            </View>
          )}
          {error && <Text style={{ color: palette.danger, marginTop: spacing(2) }}>{error}</Text>}
        </Card>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Action Classes" />
          <FlatList
            data={classes}
            keyExtractor={(item) => item.action_class_id.toString()}
            ItemSeparatorComponent={() => <View style={{ height:1, backgroundColor: palette.border }} />}
            renderItem={({ item }) => (
              <View style={{ flexDirection:'row', alignItems:'center', paddingVertical: spacing(2), gap: spacing(2) }}>
                <View style={{ width:14, height:14, borderRadius:4, backgroundColor: item.color || palette.primary }} />
                <Text style={{ flex:1, fontSize:14, color: palette.text }}>{item.name}</Text>
                <PrimaryButton small title="Edit" onPress={() => startEdit(item)} />
                <PrimaryButton small title="Del" onPress={() => handleDelete(item.action_class_id)} />
              </View>
            )}
          />
        </Card>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Preferences" />
          <Text style={{ marginTop: spacing(2), fontSize:12, fontWeight:'600', color: palette.textLight }}>Placeholder preference A</Text>
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

// retain styles object shell
const styles = StyleSheet.create({ safe:{}, screen:{}, container:{}, header:{}, section:{}, row:{}, flex:{}, error:{}, sep:{}, item:{}, itemText:{}, color:{}, topBar:{} });

export default SettingsScreen;
