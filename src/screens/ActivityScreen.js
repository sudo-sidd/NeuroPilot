import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';
import { useTheme, useThemeMode } from '../constants/theme';
import { getActionClasses, getCurrentActivity, getTodaysActivities, startActivity, stopCurrentActivity } from '../services/Database';
import Chip from '../components/ui/Chip';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';

const ActivityScreen = ({ navigation }) => {
  const { palette, spacing, typography } = useTheme();
  const { reducedMotion } = useThemeMode();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);
  const [classes, setClasses] = useState([]);
  const [current, setCurrent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const [now, setNow] = useState(Date.now());
  const ringScale = useRef(new Animated.Value(1)).current;

  const refresh = async () => {
    setLoading(true);
    try {
      const [cls, curr, todays] = await Promise.all([
        getActionClasses(),
        getCurrentActivity(),
        getTodaysActivities()
      ]);
      setClasses(cls);
      setCurrent(curr);
      setActivities(todays);
    } catch (e) {
      console.warn('refresh failed', e);
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (current) {
      intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [current]);

  useEffect(() => {
    if (reducedMotion) { ringScale.setValue(1); return; }
    const pulse = () => {
      Animated.sequence([
        Animated.timing(ringScale, { toValue: 1.06, duration: 2800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 0.94, duration: 2800, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ]).start(() => { if (!reducedMotion) pulse(); });
    };
    pulse();
    return () => ringScale.stopAnimation();
  }, [reducedMotion]);

  const startCls = async (cls) => { await startActivity(cls.action_class_id); refresh(); };
  const stop = async () => { await stopCurrentActivity(); refresh(); };

  const elapsedMs = current ? (now - new Date(current.start_time).getTime()) : 0;
  const minutes = Math.floor(elapsedMs / 60000).toString().padStart(2,'0');
  const seconds = Math.floor((elapsedMs % 60000)/1000).toString().padStart(2,'0');

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']}> 
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(14) }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: spacing(4) }}>
          <Text style={{ ...typography.h1, color: palette.text }}>Activity</Text>
          <TouchableOpacity onPress={() => setDrawerVisible(true)} accessibilityRole="button" accessibilityLabel="Open options menu"><Text style={{ fontSize:22, color: palette.text }}>☰</Text></TouchableOpacity>
        </View>
        {/* Breathing ring */}
        <View style={{ alignItems:'center', marginTop: spacing(2) }}>
          <Animated.View style={{ transform:[{ scale: ringScale }] }}>
            <View style={{ width:220, height:220, borderRadius:110, alignItems:'center', justifyContent:'center', backgroundColor: palette.surface, borderWidth:4, borderColor: current ? (current.color || palette.primary) : palette.border }}>
              <Text style={{ fontSize:38, fontWeight:'600', color: palette.text }}>{minutes}:{seconds}</Text>
              {current && <Text style={{ marginTop:4, fontSize:14, color: palette.textLight }}>{current.action_class_name}</Text>}
            </View>
          </Animated.View>
          <View style={{ flexDirection:'row', marginTop: spacing(3), flexWrap:'wrap', justifyContent:'center' }}>
            {classes.map(c => (
              <Chip key={c.action_class_id} label={c.name} color={c.color || palette.primary} active={current && current.action_class_id === c.action_class_id} onPress={() => startCls(c)} />
            ))}
          </View>
          {current ? <PrimaryButton small title="Stop" onPress={stop} /> : null}
        </View>
        <Card style={{ marginTop: spacing(6) }}>
          <SectionHeader title="Today's Timeline" />
          {loading ? <Text style={{ fontSize:12, color: palette.textLight }}>Loading...</Text> : (
            <FlatList
              data={activities}
              keyExtractor={(item) => item.activity_id.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height:1, backgroundColor: palette.border }} />}
              renderItem={({ item }) => (
                <View style={{ paddingVertical: spacing(2), flexDirection:'row', alignItems:'center' }}>
                  <View style={{ width:10, height:10, borderRadius:5, backgroundColor: item.color || palette.primary, marginRight: spacing(2) }} />
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>{item.action_class_name}</Text>
                    <Text style={{ fontSize:12, color: palette.textLight }}>{new Date(item.start_time).toLocaleTimeString()} {item.end_time ? ' - ' + new Date(item.end_time).toLocaleTimeString() : '(running)'}</Text>
                  </View>
                  {item.end_time && <Text style={{ fontSize:12, color: palette.textLight }}>{Math.round((new Date(item.end_time).getTime() - new Date(item.start_time).getTime())/60000)}m</Text>}
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

// styles object retained for backward compatibility (not used after theme refactor)
const styles = StyleSheet.create({
  safe: { },
  container: { },
  header: { },
  topBar: { }
});

export default ActivityScreen;
