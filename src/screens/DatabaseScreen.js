import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { addUser, getUsers } from '../services/Database';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';
import { useTheme } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import Input from '../components/ui/Input';
import PrimaryButton from '../components/ui/PrimaryButton';

const DatabaseScreen = ({ navigation }) => {
  const { palette, spacing, typography } = useTheme();
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
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(10) }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={{ ...typography.h1, color: palette.text }}>Database</Text>
          <TouchableOpacity onPress={() => setDrawerVisible(true)}><Text style={{ fontSize:22, color: palette.text }}>☰</Text></TouchableOpacity>
        </View>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Add User" />
          <Input placeholder="Name" value={name} onChangeText={setName} style={{ marginTop: spacing(2) }} />
            <Input placeholder="Email" value={email} onChangeText={setEmail} style={{ marginTop: spacing(2) }} />
            <PrimaryButton title="Add" onPress={handleAddUser} small />
        </Card>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Users" />
          <FlatList
            data={users}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height:1, backgroundColor: palette.border }} />}
            renderItem={({ item }) => (
              <View style={{ paddingVertical: spacing(2) }}>
                <Text style={{ color: palette.text, fontSize:14 }}>{item.name} <Text style={{ color: palette.textLight }}>({item.email})</Text></Text>
              </View>
            )}
          />
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

const styles = StyleSheet.create({ safe:{}, screen:{}, container:{}, topBar:{}, title:{}, input:{}, subtitle:{}, userItem:{} });

export default DatabaseScreen;
