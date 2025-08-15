import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, FlatList } from 'react-native';
import { getWeeklyReport } from '../services/Database';

const isoToday = () => new Date().toISOString().slice(0,10);
const mondayOfWeek = (iso) => {
  const d = new Date(iso + 'T00:00:00Z');
  const day = d.getUTCDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day); // Monday as start
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0,10);
};

const ReportsScreen = () => {
  const [start, setStart] = useState(mondayOfWeek(isoToday()));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try { const r = await getWeeklyReport(start); setReport(r); } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Weekly Report</Text>
      <Text style={styles.label}>Week Starting (Mon)</Text>
      <TextInput style={styles.input} value={start} onChangeText={setStart} />
      <Button title="Refresh" onPress={load} />
      {loading && <Text>Loading...</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {report && (
        <View style={styles.section}>
          <Text style={styles.sub}>Range: {report.range.start} → {report.range.end}</Text>
          <Text style={styles.sub}>Activity Durations:</Text>
          <FlatList
            data={report.activities}
            keyExtractor={(item) => String(item.action_class_id)}
            renderItem={({ item }) => (
              <View style={styles.row}> 
                <View style={[styles.color, { backgroundColor: item.color || '#2196F3' }]} />
                <Text style={styles.flex}>{item.name}</Text>
                <Text>{Math.round(item.total_duration_ms / 60000)} min</Text>
              </View>
            )}
          />
          <Text style={styles.sub}>Tasks: {report.tasks.completed}/{report.tasks.total} ({Math.round(report.tasks.completion_rate * 100)}%)</Text>
          <Text style={styles.sub}>Avg Mood: {report.mood.average != null ? Number(report.mood.average).toFixed(2) : 'N/A'}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  label: { marginTop: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4, marginBottom: 8 },
  section: { marginTop: 16 },
  sub: { marginTop: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  color: { width: 12, height: 12, borderRadius: 3, marginRight: 8 },
  flex: { flex: 1 },
  error: { color: 'red', marginTop: 8 }
});

export default ReportsScreen;
