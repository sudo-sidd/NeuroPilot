import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { getDailyForm, upsertDailyForm } from '../services/Database';
import { useTheme } from '../constants/theme';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import Input from '../components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';
import OptionsDrawer from '../components/ui/OptionsDrawer';

const isoToday = () => new Date().toISOString().slice(0,10);

const DailyFormScreen = ({ navigation }) => {
  const { palette, spacing, typography } = useTheme();
  const [date, setDate] = useState(isoToday());
  const [mood, setMood] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [highlights, setHighlights] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [status, setStatus] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);

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
    <SafeAreaView style={{ flex:1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView style={{ flex:1 }} contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(10) }}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
          <Text style={{ ...typography.h1, color: palette.text }}>Daily Form</Text>
          <TouchableOpacity onPress={() => setDrawerVisible(true)}><Text style={{ fontSize:22, color: palette.text }}>☰</Text></TouchableOpacity>
        </View>
        <Card style={{ marginTop: spacing(4) }}>
            <SectionHeader title="Entry" />
            <Text style={{ marginTop: spacing(4), fontSize:12, fontWeight:'600', color: palette.textLight }}>Date</Text>
            <Input value={date} onChangeText={setDate} />
            <Text style={{ marginTop: spacing(4), fontSize:12, fontWeight:'600', color: palette.textLight }}>Mood (0-10)</Text>
            <Input value={mood} onChangeText={setMood} keyboardType="number-pad" />
            <Text style={{ marginTop: spacing(4), fontSize:12, fontWeight:'600', color: palette.textLight }}>Thoughts</Text>
            <Input style={{ minHeight:80, textAlignVertical:'top' }} value={thoughts} onChangeText={setThoughts} multiline />
            <Text style={{ marginTop: spacing(4), fontSize:12, fontWeight:'600', color: palette.textLight }}>Highlights</Text>
            <Input style={{ minHeight:80, textAlignVertical:'top' }} value={highlights} onChangeText={setHighlights} multiline />
            <Text style={{ marginTop: spacing(4), fontSize:12, fontWeight:'600', color: palette.textLight }}>Gratitude</Text>
            <Input style={{ minHeight:80, textAlignVertical:'top' }} value={gratitude} onChangeText={setGratitude} multiline />
            <View style={{ flexDirection:'row', alignItems:'center', gap: spacing(3), marginTop: spacing(5) }}>
              <PrimaryButton title="Save" onPress={save} />
              {status ? <Text style={{ fontSize:12, color: palette.textLight }}>{status}</Text> : null}
            </View>
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

const styles = StyleSheet.create({ safe:{}, screen:{}, container:{}, header:{}, section:{}, label:{}, multi:{}, saveRow:{}, status:{}, topBar:{} });

export default DailyFormScreen;
