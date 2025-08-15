import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { getActionClasses, createActionClass, updateActionClass, deleteActionClass } from '../services/Database';

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
    <View style={styles.container}>
      <Text style={styles.header}>Action Classes</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="New class name"
          value={name}
          onChangeText={setName}
        />
        <Button title="Add" onPress={handleAdd} />
      </View>
      {editId && (
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Edit name"
            value={editName}
            onChangeText={setEditName}
          />
          <Button title="Save" onPress={handleSaveEdit} />
          <Button title="Cancel" onPress={() => { setEditId(null); setEditName(''); }} />
        </View>
      )}
      <FlatList
        data={classes}
        keyExtractor={(item) => item.action_class_id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={[styles.color, { backgroundColor: item.color || '#2196F3' }]} />
            <Text style={styles.itemText}>{item.name}</Text>
            <Button title="Edit" onPress={() => startEdit(item)} />
            <Button title="Delete" onPress={() => handleDelete(item.action_class_id)} />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', marginRight: 8, paddingHorizontal: 8, height: 40 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  itemText: { flex: 1 },
  color: { width: 16, height: 16, borderRadius: 4 },
  error: { color: 'red', marginBottom: 8 }
});

export default SettingsScreen;
