import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { getDailyForm, upsertDailyForm } from '../services/Database';

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Daily Form</Text>
      <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={date} onChangeText={setDate} />
      <Text style={styles.label}>Mood (0-10)</Text>
      <TextInput style={styles.input} value={mood} onChangeText={setMood} keyboardType="number-pad" />
      <Text style={styles.label}>Thoughts</Text>
      <TextInput style={[styles.input, styles.multi]} value={thoughts} onChangeText={setThoughts} multiline />
      <Text style={styles.label}>Highlights</Text>
      <TextInput style={[styles.input, styles.multi]} value={highlights} onChangeText={setHighlights} multiline />
      <Text style={styles.label}>Gratitude</Text>
      <TextInput style={[styles.input, styles.multi]} value={gratitude} onChangeText={setGratitude} multiline />
      <Button title="Save" onPress={save} />
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  label: { marginTop: 12, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 4 },
  multi: { minHeight: 60, textAlignVertical: 'top' },
  status: { marginTop: 12, fontStyle: 'italic' }
});

export default DailyFormScreen;
