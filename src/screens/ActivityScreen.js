import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';

const ActivityScreen = ({ navigation, route }) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.header}>Activity</Text>
          <TouchableOpacity onPress={() => setDrawerVisible(true)}><Text style={{ fontSize:22 }}>☰</Text></TouchableOpacity>
        </View>
        {/* existing activity details content */}
        <Card style={styles.section}>
          <SectionHeader title="Details" />
          <Text style={styles.label}>Name: {activity?.name}</Text>
          <Text style={styles.label}>Type: {activity?.type}</Text>
          <Text style={styles.label}>Status: {activity?.status}</Text>
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
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  topBar: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' }
});

export default ActivityScreen;
