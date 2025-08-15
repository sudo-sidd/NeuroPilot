import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getActionClasses, createActionClass, updateActionClass, deleteActionClass } from '../services/Database';
import { palette, spacing, typography } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';

const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

const SettingsScreen = () => {
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState(null);

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
    <View style={styles.screen}> 
      <FlatList
        contentContainerStyle={styles.container}
        data={[]} // dummy to enable header/footer layout
        ListHeaderComponent={
          <>
            <Text style={styles.header}>Settings</Text>
            <Card style={styles.section}>
              <SectionHeader title="Add Action Class" />
              <View style={styles.row}>
                <Input placeholder="New class name" value={name} onChangeText={setName} style={styles.flex} />
                <PrimaryButton small title="Add" onPress={handleAdd} />
              </View>
              {editId && (
                <View style={styles.row}>
                  <Input placeholder="Edit name" value={editName} onChangeText={setEditName} style={styles.flex} />
                  <PrimaryButton small title="Save" onPress={handleSaveEdit} />
                  <PrimaryButton small title="Cancel" onPress={() => { setEditId(null); setEditName(''); }} />
                </View>
              )}
              {error && <Text style={styles.error}>{error}</Text>}
            </Card>
            <Card style={styles.section}>
              <SectionHeader title="Action Classes" />
              <FlatList
                data={classes}
                keyExtractor={(item) => item.action_class_id.toString()}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                renderItem={({ item }) => (
                  <View style={styles.item}>
                    <View style={[styles.color, { backgroundColor: item.color || palette.primary }]} />
                    <Text style={styles.itemText}>{item.name}</Text>
                    <PrimaryButton small title="Edit" onPress={() => startEdit(item)} />
                    <PrimaryButton small title="Del" onPress={() => handleDelete(item.action_class_id)} />
                  </View>
                )}
              />
            </Card>
          </>
        }
        renderItem={null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  container: { padding: spacing(4), paddingBottom: spacing(10) },
  header: { ...typography.h1, color: palette.text },
  section: { marginTop: spacing(4) },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: spacing(2), marginBottom: spacing(3) },
  flex: { flex: 1 },
  error: { color: palette.danger, marginTop: spacing(2) },
  sep: { height: 1, backgroundColor: palette.border },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(2), gap: spacing(2) },
  itemText: { flex: 1, fontSize: 14, color: palette.text },
  color: { width: 14, height: 14, borderRadius: 4 },
});

export default SettingsScreen;
