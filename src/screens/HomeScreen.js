import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { getActionClasses, getCurrentActivity, getTodaysActivities, startActivity, stopCurrentActivity } from '../services/Database';
import theme, { palette, spacing, typography } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Chip from '../components/ui/Chip';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';

const HomeScreen = ({ navigation }) => {
  const [actionClasses, setActionClasses] = useState([]);
  const [current, setCurrent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false); // placeholder state
  const [simpleMode, setSimpleMode] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [classes, curr, todays] = await Promise.all([
        getActionClasses(),
        getCurrentActivity(),
        getTodaysActivities()
      ]);
      setActionClasses(classes);
      setCurrent(curr);
      setActivities(todays);
    } catch (e) {
      console.log('Error refreshing data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleStart = async (cls) => {
    await startActivity(cls.action_class_id);
    refresh();
  };

  const handleStop = async () => {
    await stopCurrentActivity();
    refresh();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}> 
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.appTitle}>NeuroPilot</Text>
          <View style={styles.topActions}>
            <TouchableOpacity onPress={() => setDrawerVisible(true)}><Text style={{ fontSize:22 }}>☰</Text></TouchableOpacity>
          </View>
        </View>
        <Card style={styles.section}>
          <SectionHeader title={current ? 'Current Activity' : 'Start an Activity'} />
          {current ? (
            <View style={styles.currentRow}>
              <Text style={styles.currentText}>{current.action_class_name}</Text>
              <PrimaryButton small title="Stop" onPress={handleStop} />
            </View>
          ) : (
            <View style={styles.classWrap}>
              {actionClasses.map(cls => (
                <Chip key={cls.action_class_id} label={cls.name} color={cls.color || palette.primary} onPress={() => handleStart(cls)} />
              ))}
            </View>
          )}
        </Card>
        <Card style={styles.section}>
          <SectionHeader title="Today's Log" />
          {loading ? <Text style={styles.muted}>Loading...</Text> : (
            <FlatList
              data={activities}
              keyExtractor={(item) => item.activity_id.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              renderItem={({ item }) => (
                <View style={styles.activityItem}>
                  <Text style={styles.activityName}>{item.action_class_name}</Text>
                  <Text style={styles.activityTime}>{new Date(item.start_time).toLocaleTimeString()} {item.end_time ? ' - ' + new Date(item.end_time).toLocaleTimeString() : '(running)'}</Text>
                </View>
              )}
            />
          )}
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
  safe: { flex: 1, backgroundColor: palette.background },
  screen: { flex: 1 },
  container: { padding: spacing(4), paddingBottom: spacing(12) },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(4) },
  appTitle: { ...typography.h1, color: palette.text },
  topActions: { flexDirection: 'row', gap: spacing(2) },
  section: { marginTop: spacing(4) },
  classWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  currentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currentText: { ...typography.h2, color: palette.primary },
  muted: { color: palette.textLight, fontSize: 12 },
  sep: { height: 1, backgroundColor: palette.border },
  activityItem: { paddingVertical: spacing(2) },
  activityName: { fontWeight: '600', color: palette.text },
  activityTime: { fontSize: 12, color: palette.textLight, marginTop: 2 }
});

export default HomeScreen;