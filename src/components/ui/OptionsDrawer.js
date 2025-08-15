import React from 'react';
import { Modal, View, Text, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '../../constants/theme';
import PrimaryButton from './PrimaryButton';

const OptionsDrawer = ({ visible, onClose, onNavigate, darkMode, onToggleDark, simpleMode, onToggleSimple }) => {
  const { palette, spacing, typography, radii } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex:1, flexDirection:'row', backgroundColor:'rgba(0,0,0,0.35)' }}>
        <TouchableOpacity style={{ flex:1 }} activeOpacity={1} onPress={onClose} />
        <View style={{ width: '70%', backgroundColor: palette.surface, padding: spacing(5), borderTopLeftRadius: radii.lg, borderBottomLeftRadius: radii.lg, justifyContent: 'flex-start', gap: spacing(6) }}>
          <Text style={{ ...typography.h2, color: palette.text }}>Options</Text>
          <View style={{ gap: spacing(3) }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: palette.textLight, letterSpacing: 1 }}>Navigation</Text>
            <PrimaryButton title="Reports" onPress={() => { onNavigate('Reports'); onClose(); }} />
            <PrimaryButton title="Settings" onPress={() => { onNavigate('Settings'); onClose(); }} style={{ marginTop: spacing(2) }} />
          </View>
          <View style={{ gap: spacing(3) }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: palette.textLight, letterSpacing: 1 }}>Preferences</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(2) }}> 
              <Text style={{ fontSize: 14, color: palette.text }}>Dark Mode</Text>
              <Switch value={darkMode} onValueChange={onToggleDark} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing(2) }}> 
              <Text style={{ fontSize: 14, color: palette.text }}>Simple Mode</Text>
              <Switch value={simpleMode} onValueChange={onToggleSimple} />
            </View>
          </View>
          <PrimaryButton title="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};

export default OptionsDrawer;