import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { palette, spacing, typography, radii } from '../../constants/theme';
import PrimaryButton from './PrimaryButton';

const OptionsDrawer = ({ visible, onClose, onNavigate, darkMode, onToggleDark, simpleMode, onToggleSimple }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.flex} activeOpacity={1} onPress={onClose} />
        <View style={styles.panel}>
          <Text style={styles.title}>Options</Text>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Navigation</Text>
            <PrimaryButton title="Reports" onPress={() => { onNavigate('Reports'); onClose(); }} />
            <PrimaryButton title="Settings" onPress={() => { onNavigate('Settings'); onClose(); }} style={styles.mt} />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Preferences</Text>
            <View style={styles.row}> 
              <Text style={styles.prefLabel}>Dark Mode</Text>
              <Switch value={darkMode} onValueChange={onToggleDark} />
            </View>
            <View style={styles.row}> 
              <Text style={styles.prefLabel}>Simple Mode</Text>
              <Switch value={simpleMode} onValueChange={onToggleSimple} />
            </View>
          </View>
          <PrimaryButton title="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex:1, flexDirection:'row', backgroundColor:'rgba(0,0,0,0.35)' },
  flex: { flex:1 },
  panel: { width: '70%', backgroundColor: palette.surface, padding: spacing(5), borderTopLeftRadius: radii.lg, borderBottomLeftRadius: radii.lg, justifyContent: 'flex-start', gap: spacing(6) },
  title: { ...typography.h2, color: palette.text },
  section: { gap: spacing(3) },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: palette.textLight, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(2) },
  prefLabel: { fontSize: 14, color: palette.text },
  mt: { marginTop: spacing(2) }
});

export default OptionsDrawer;