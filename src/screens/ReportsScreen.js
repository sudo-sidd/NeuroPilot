import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { getWeeklyReport } from '../services/Database';
import { useTheme } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';

const isoToday = () => new Date().toISOString().slice(0,10);
const mondayOfWeek = (iso) => { const d = new Date(iso + 'T00:00:00Z'); const day = d.getUTCDay(); const diff = (day === 0 ? -6 : 1 - day); d.setUTCDate(d.getUTCDate() + diff); return d.toISOString().slice(0,10); };

const ChartPlaceholder = ({ title, height=160, children }) => {
  const { palette, spacing } = useTheme();
  return (
    <View style={{ marginTop: spacing(4) }}>
      <Text style={{ fontSize:14, fontWeight:'600', color: palette.text, marginBottom: spacing(2) }}>{title}</Text>
      <View style={{ height, borderWidth:1, borderColor: palette.border, borderRadius:8, alignItems:'center', justifyContent:'center', backgroundColor: palette.surfaceAlt || palette.surface }}>
        {children || <Text style={{ fontSize:12, color: palette.textLight }}>Chart coming soon</Text>}
      </View>
    </View>
  );
};

const ReportsScreen = ({ navigation }) => {
  const { palette, typography, spacing } = useTheme();
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
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(10) }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={{ ...typography.h1, color: palette.text }}>Reports</Text>
          <TouchableOpacity onPress={() => setDrawerVisible(true)}><Text style={{ fontSize:22, color: palette.text }}>☰</Text></TouchableOpacity>
        </View>
        <Text style={{ ...typography.h1, color: palette.text }}>Weekly Report</Text>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Controls" />
          <Text style={{ marginTop: spacing(2), fontSize:12, fontWeight:'600', color: palette.textLight }}>Week Starting (Mon)</Text>
          <View style={{ flexDirection:'row', alignItems:'center', gap: spacing(2), marginTop: spacing(2) }}>
            <Input style={{ flex:1 }} value={start} onChangeText={setStart} />
            <PrimaryButton small title="Load" onPress={load} />
          </View>
          {loading && <Text style={{ fontSize:12, color: palette.textLight, marginTop: spacing(2) }}>Loading...</Text>}
          {error ? <Text style={{ color: palette.danger, marginTop: spacing(2) }}>{error}</Text> : null}
        </Card>
        {report && (
          <Card style={{ marginTop: spacing(4) }}>
            <SectionHeader title="Summary" />
            <Text style={{ marginTop: spacing(2), fontSize:12, color: palette.textLight }}>Range: {report.range.start} → {report.range.end}</Text>
            <ChartPlaceholder title="Activity Time (Stacked Bars)" />
            <ChartPlaceholder title="Mood Trend (Line)" />
            <ChartPlaceholder title="Task Completion (Donut)" />
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop: spacing(4) }}>
              <View style={{ flex:1, alignItems:'center' }}>
                <Text style={{ fontSize:11, color: palette.textLight, textTransform:'uppercase' }}>Tasks</Text>
                <Text style={{ fontSize:16, fontWeight:'600', color: palette.text, marginTop:2 }}>{report.tasks.completed}/{report.tasks.total}</Text>
              </View>
              <View style={{ flex:1, alignItems:'center' }}>
                <Text style={{ fontSize:11, color: palette.textLight, textTransform:'uppercase' }}>Completion</Text>
                <Text style={{ fontSize:16, fontWeight:'600', color: palette.text, marginTop:2 }}>{Math.round(report.tasks.completion_rate * 100)}%</Text>
              </View>
              <View style={{ flex:1, alignItems:'center' }}>
                <Text style={{ fontSize:11, color: palette.textLight, textTransform:'uppercase' }}>Avg Mood</Text>
                <Text style={{ fontSize:16, fontWeight:'600', color: palette.text, marginTop:2 }}>{report.mood.average != null ? Number(report.mood.average).toFixed(1) : 'N/A'}</Text>
              </View>
            </View>
          </Card>
        )}
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Summary" />
          {report ? (
            <>
              <Text style={{ marginTop: spacing(2), fontSize:12, fontWeight:'600', color: palette.textLight }}>Total Tasks: {report.tasks.total}</Text>
              <Text style={{ marginTop: spacing(2), fontSize:12, fontWeight:'600', color: palette.textLight }}>Completed: {report.tasks.completed}</Text>
              <Text style={{ marginTop: spacing(2), fontSize:12, fontWeight:'600', color: palette.textLight }}>Completion %: {Math.round(report.tasks.completion_rate * 100)}%</Text>
              <Text style={{ marginTop: spacing(2), fontSize:12, fontWeight:'600', color: palette.textLight }}>Avg Mood: {report.mood.average != null ? Number(report.mood.average).toFixed(1) : 'N/A'}</Text>
            </>
          ) : <Text style={{ marginTop: spacing(2), fontSize:12, fontWeight:'600', color: palette.textLight }}>Generating...</Text>}
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

const styles = StyleSheet.create({ safe:{}, screen:{}, container:{}, header:{}, section:{}, label:{}, row:{}, flex:{}, muted:{}, error:{}, range:{}, subTitle:{}, sep:{}, activityRow:{}, dot:{}, activityName:{}, activityDuration:{}, metricsRow:{}, metricBox:{}, metricLabel:{}, metricValue:{}, topBar:{} });

export default ReportsScreen;
