import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { addUser, getUsers } from '../services/Database';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';

const DatabaseScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [users, setUsers] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddUser = async () => {
    try {
      await addUser(name, email);
      setName('');
      setEmail('');
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.header}>Database</Text>
          <TouchableOpacity onPress={() => setDrawerVisible(true)}><Text style={{ fontSize:22 }}>☰</Text></TouchableOpacity>
        </View>
        <Text style={styles.title}>Database Interaction</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />
        <Button title="Add User" onPress={handleAddUser} />

        <Text style={styles.subtitle}>Users:</Text>
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.userItem}>
              <Text>ID: {item.id}</Text>
              <Text>Name: {item.name}</Text>
              <Text>Email: {item.email}</Text>
            </View>
          )}
        />
        <Card style={styles.section}>
          <SectionHeader title="Info" />
          <Text style={styles.label}>Rows: {rowCount}</Text>
          <Text style={styles.label}>Migrations: {migrationVersion}</Text>
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

const styles = StyleSheet.create({
  safe: { flex:1, backgroundColor: palette.background },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  userItem: {
    padding: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  topBar: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' }
});

export default DatabaseScreen;
