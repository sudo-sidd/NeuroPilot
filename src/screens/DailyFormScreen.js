import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getDailyForm, upsertDailyForm } from '../services/Database';
import { palette, spacing, typography } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';

const isoToday = () => new Date().toISOString().slice(0,10);

const DailyFormScreen = () => {
  const [date, setDate] = useState(isoToday());
  const [mood, setMood] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [highlights, setHighlights] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [status, setStatus] = useState('');

  const load = async (d) => {
    const form = await getDailyForm(d);
    if (form) {
      setMood(form.mood != null ? String(form.mood) : '');
      setThoughts(form.thoughts || '');
      setHighlights(form.highlights || '');
      setGratitude(form.gratitude || '');
    } else {
      setMood(''); setThoughts(''); setHighlights(''); setGratitude('');
    }
  };

  useEffect(() => { load(date); }, [date]);

  const save = async () => {
    setStatus('Saving...');
    try {
      await upsertDailyForm({ date, mood: mood ? parseInt(mood, 10) : null, thoughts, highlights, gratitude, additional: {} });
      setStatus('Saved');
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.header}>Daily Form</Text>
      <Card style={styles.section}>
        <SectionHeader title="Entry" />
        <Text style={styles.label}>Date</Text>
        <Input value={date} onChangeText={setDate} />
        <Text style={styles.label}>Mood (0-10)</Text>
        <Input value={mood} onChangeText={setMood} keyboardType="number-pad" />
        <Text style={styles.label}>Thoughts</Text>
        <Input style={styles.multi} value={thoughts} onChangeText={setThoughts} multiline />
        <Text style={styles.label}>Highlights</Text>
        <Input style={styles.multi} value={highlights} onChangeText={setHighlights} multiline />
        <Text style={styles.label}>Gratitude</Text>
        <Input style={styles.multi} value={gratitude} onChangeText={setGratitude} multiline />
        <View style={styles.saveRow}>
          <PrimaryButton title="Save" onPress={save} />
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  container: { padding: spacing(4), paddingBottom: spacing(10) },
  header: { ...typography.h1, color: palette.text },
  section: { marginTop: spacing(4) },
  label: { marginTop: spacing(4), fontSize: 12, fontWeight: '600', color: palette.textLight },
  multi: { minHeight: 80, textAlignVertical: 'top' },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginTop: spacing(5) },
  status: { fontSize: 12, color: palette.textLight }
});

export default DailyFormScreen;
