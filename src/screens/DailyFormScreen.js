import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { getDailyForm, upsertDailyForm } from '../services/Database';
import { useTheme } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';

const isoToday = () => new Date().toISOString().slice(0,10);

const DailyFormScreen = ({ navigation }) => {
  const { palette, spacing, typography } = useTheme();
  const [date, setDate] = useState(isoToday());
  const [mood, setMood] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [highlights, setHighlights] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState({ mood:true, thoughts:true, highlights:true, gratitude:true });
  const toggleSection = (key) => setOpen(o => ({ ...o, [key]: !o[key] }));
  const gratitudeList = gratitude ? gratitude.split('\n').filter(Boolean) : [];

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

  // Autosave debounce
  const pendingRef = useRef(null);
  const scheduleAutosave = useCallback(() => {
    setStatus('Editing…');
    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(() => { save(); }, 800);
  }, [date, mood, thoughts, highlights, gratitude]);

  useEffect(() => { if (date) load(date); }, [date]);
  useEffect(() => { if (date) scheduleAutosave(); }, [mood, thoughts, highlights, gratitude]);

  const save = async () => {
    setStatus('Saving...');
    try {
      await upsertDailyForm({ date, mood: mood ? parseInt(mood, 10) : null, thoughts, highlights, gratitude, additional: {} });
      setStatus('Saved');
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
  };

  const moodFaces = ['😢','🙁','😐','🙂','😄'];
  const moodIndex = mood ? Math.max(0, Math.min(4, Math.round((Number(mood) || 0)/2.5))) : null;

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(10) }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={{ ...typography.h1, color: palette.text }}>Journal</Text>
        </View>
        <Card style={{ marginTop: spacing(4) }}>
          <SectionHeader title="Date" />
          <Input value={date} onChangeText={(v) => { setDate(v); }} />
        </Card>
        <Card style={{ marginTop: spacing(4) }}>
          <Pressable onPress={() => toggleSection('mood')} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>Mood {moodIndex!=null && '· ' + moodFaces[moodIndex]}</Text>
            <Text style={{ fontSize:18 }}>{open.mood ? '−' : '+'}</Text>
          </Pressable>
          {open.mood && (
            <View style={{ marginTop: spacing(3) }}>
              <Text style={{ fontSize:12, fontWeight:'600', color: palette.textLight }}>Mood (0-10)</Text>
              <Input value={mood} onChangeText={(v) => setMood(v)} keyboardType="number-pad" />
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop: spacing(2) }}>
                {moodFaces.map((f,i) => (
                  <Pressable key={f} onPress={() => setMood(String(i*2.5))}><Text style={{ fontSize:24, opacity: moodIndex===i ? 1 : 0.35 }}>{f}</Text></Pressable>
                ))}
              </View>
            </View>
          )}
        </Card>
        <Card style={{ marginTop: spacing(4) }}>
          <Pressable onPress={() => toggleSection('thoughts')} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>Thoughts</Text>
            <Text style={{ fontSize:18 }}>{open.thoughts ? '−' : '+'}</Text>
          </Pressable>
          {open.thoughts && (
            <View style={{ marginTop: spacing(3) }}>
              <Input style={{ minHeight:100, textAlignVertical:'top' }} value={thoughts} onChangeText={(v) => setThoughts(v)} multiline placeholder="Stream your mind…" />
            </View>
          )}
        </Card>
        <Card style={{ marginTop: spacing(4) }}>
          <Pressable onPress={() => toggleSection('highlights')} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>Highlights</Text>
            <Text style={{ fontSize:18 }}>{open.highlights ? '−' : '+'}</Text>
          </Pressable>
          {open.highlights && (
            <View style={{ marginTop: spacing(3) }}>
              <Input style={{ minHeight:80, textAlignVertical:'top' }} value={highlights} onChangeText={(v) => setHighlights(v)} multiline placeholder="What stood out today?" />
            </View>
          )}
        </Card>
        <Card style={{ marginTop: spacing(4) }}>
          <Pressable onPress={() => toggleSection('gratitude')} style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontSize:14, fontWeight:'600', color: palette.text }}>Gratitude ({gratitudeList.length}/3)</Text>
            <Text style={{ fontSize:18 }}>{open.gratitude ? '−' : '+'}</Text>
          </Pressable>
          {open.gratitude && (
            <View style={{ marginTop: spacing(3) }}>
              {gratitudeList.map((g, i) => (
                <View key={i} style={{ paddingVertical: spacing(2), flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                  <Text style={{ flex:1, color: palette.text }}>{g}</Text>
                  <TouchableOpacity onPress={() => { const arr = gratitudeList.filter((_,idx)=>idx!==i); setGratitude(arr.join('\n')); }}><Text style={{ color: palette.danger }}>✕</Text></TouchableOpacity>
                </View>
              ))}
              {gratitudeList.length < 3 && (
                <View style={{ flexDirection:'row', alignItems:'center', marginTop: spacing(2) }}>
                  <Input placeholder="Add gratitude" value={''} onChangeText={(v) => { if (v.trim()) { const arr = [...gratitudeList, v.trim()]; setGratitude(arr.join('\n')); } }} />
                </View>
              )}
            </View>
          )}
        </Card>
        <View style={{ flexDirection:'row', alignItems:'center', gap: spacing(3), marginTop: spacing(5) }}>
          <PrimaryButton title="Save" onPress={save} />
          {status ? <Text style={{ fontSize:12, color: palette.textLight }}>{status}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ safe:{}, screen:{}, container:{}, header:{}, section:{}, label:{}, multi:{}, saveRow:{}, status:{}, topBar:{} });

export default DailyFormScreen;
