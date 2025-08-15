import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { getActionClasses, getCurrentActivity, getTodaysActivities, startActivity, stopCurrentActivity } from '../services/Database';
import { useTheme } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Chip from '../components/ui/Chip';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';

const HomeScreen = ({ navigation }) => {
  const { palette, spacing, typography } = useTheme();
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
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']}> 
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(12) }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: spacing(4) }}>
          <Text style={{ ...typography.h1, color: palette.text }}>NeuroPilot</Text>
          <View style={{ flexDirection:'row', gap: spacing(2) }}>
            <TouchableOpacity onPress={() => setDrawerVisible(true)}><Text style={{ fontSize:22, color: palette.text }}>☰</Text></TouchableOpacity>
          </View>
        </View>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title={current ? 'Current Activity' : 'Start an Activity'} />
          {current ? (
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={{ ...typography.h2, color: palette.primary }}>{current.action_class_name}</Text>
              <PrimaryButton small title="Stop" onPress={handleStop} />
            </View>
          ) : (
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {actionClasses.map(cls => (
                <Chip key={cls.action_class_id} label={cls.name} color={cls.color || palette.primary} onPress={() => handleStart(cls)} />
              ))}
            </View>
          )}
        </Card>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Today's Log" />
          {loading ? <Text style={{ color: palette.textLight, fontSize:12 }}>Loading...</Text> : (
            <FlatList
              data={activities}
              keyExtractor={(item) => item.activity_id.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height:1, backgroundColor: palette.border }} />}
              renderItem={({ item }) => (
                <View style={{ paddingVertical: spacing(2) }}>
                  <Text style={{ fontWeight:'600', color: palette.text }}>{item.action_class_name}</Text>
                  <Text style={{ fontSize:12, color: palette.textLight, marginTop:2 }}>{new Date(item.start_time).toLocaleTimeString()} {item.end_time ? ' - ' + new Date(item.end_time).toLocaleTimeString() : '(running)'}</Text>
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

// retain styles shell
const styles = StyleSheet.create({ safe:{}, screen:{}, container:{}, topBar:{}, appTitle:{}, topActions:{}, section:{}, classWrap:{}, currentRow:{}, currentText:{}, muted:{}, sep:{}, activityItem:{}, activityName:{}, activityTime:{} });

export default HomeScreen;