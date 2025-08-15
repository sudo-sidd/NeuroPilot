import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { getWeeklyReport } from '../services/Database';
import { palette, spacing, typography } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';

const isoToday = () => new Date().toISOString().slice(0,10);
const mondayOfWeek = (iso) => { const d = new Date(iso + 'T00:00:00Z'); const day = d.getUTCDay(); const diff = (day === 0 ? -6 : 1 - day); d.setUTCDate(d.getUTCDate() + diff); return d.toISOString().slice(0,10); };

const ReportsScreen = ({ navigation }) => {
  const [start, setStart] = useState(mondayOfWeek(isoToday()));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try { const r = await getWeeklyReport(start); setReport(r); } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.header}>Reports</Text>
          <TouchableOpacity onPress={() => setDrawerVisible(true)}><Text style={{ fontSize:22 }}>☰</Text></TouchableOpacity>
        </View>
        <Text style={styles.header}>Weekly Report</Text>
        <Card style={styles.section}>
          <SectionHeader title="Controls" />
          <Text style={styles.label}>Week Starting (Mon)</Text>
          <View style={styles.row}>
            <Input style={styles.flex} value={start} onChangeText={setStart} />
            <PrimaryButton small title="Load" onPress={load} />
          </View>
          {loading && <Text style={styles.muted}>Loading...</Text>}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>
        {report && (
          <Card style={styles.section}>
            <SectionHeader title="Summary" />
            <Text style={styles.range}>Range: {report.range.start} → {report.range.end}</Text>
            <Text style={styles.subTitle}>Activities</Text>
            <FlatList
              data={report.activities}
              keyExtractor={(item) => String(item.action_class_id)}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              renderItem={({ item }) => (
                <View style={styles.activityRow}>
                  <View style={[styles.dot, { backgroundColor: item.color || palette.primary }]} />
                  <Text style={styles.activityName}>{item.name}</Text>
                  <Text style={styles.activityDuration}>{Math.round(item.total_duration_ms / 60000)}m</Text>
                </View>
              )}
            />
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Tasks</Text>
                <Text style={styles.metricValue}>{report.tasks.completed}/{report.tasks.total}</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Completion</Text>
                <Text style={styles.metricValue}>{Math.round(report.tasks.completion_rate * 100)}%</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Avg Mood</Text>
                <Text style={styles.metricValue}>{report.mood.average != null ? Number(report.mood.average).toFixed(1) : 'N/A'}</Text>
              </View>
            </View>
          </Card>
        )}
        <Card style={styles.section}>
          <SectionHeader title="Summary" />
          {report ? (
            <>
              <Text style={styles.label}>Total Tasks: {report.tasks.total}</Text>
              <Text style={styles.label}>Completed: {report.tasks.completed}</Text>
              <Text style={styles.label}>Completion %: {Math.round(report.tasks.completion_rate * 100)}%</Text>
              <Text style={styles.label}>Avg Mood: {report.mood.average != null ? Number(report.mood.average).toFixed(1) : 'N/A'}</Text>
            </>
          ) : <Text style={styles.label}>Generating...</Text>}
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
  screen: { flex: 1, backgroundColor: palette.background },
  container: { padding: spacing(4), paddingBottom: spacing(10) },
  header: { ...typography.h1, color: palette.text },
  section: { marginTop: spacing(4) },
  label: { marginTop: spacing(2), fontSize: 12, fontWeight: '600', color: palette.textLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(2) },
  flex: { flex: 1 },
  muted: { fontSize: 12, color: palette.textLight, marginTop: spacing(2) },
  error: { color: palette.danger, marginTop: spacing(2) },
  range: { marginTop: spacing(2), fontSize: 12, color: palette.textLight },
  subTitle: { marginTop: spacing(4), fontSize: 14, fontWeight: '600', color: palette.text },
  sep: { height: 1, backgroundColor: palette.border },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(2) },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing(2) },
  activityName: { flex: 1, fontSize: 14, color: palette.text },
  activityDuration: { fontSize: 12, color: palette.textLight },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing(4) },
  metricBox: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 11, color: palette.textLight, textTransform: 'uppercase' },
  metricValue: { fontSize: 16, fontWeight: '600', color: palette.text, marginTop: 2 },
  topBar: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' }
});

export default ReportsScreen;
