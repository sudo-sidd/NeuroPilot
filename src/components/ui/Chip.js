import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { palette, radii, spacing } from '../../constants/theme';

const Chip = ({ label, color = palette.primary, onPress, active }) => (
  <TouchableOpacity onPress={onPress} style={[styles.base, { backgroundColor: active ? color : palette.surface, borderColor: color }]}>
    <Text style={[styles.text, { color: active ? '#fff' : color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  base: { borderWidth: 1, paddingHorizontal: spacing(3), paddingVertical: spacing(1.5), borderRadius: radii.lg, marginRight: spacing(2), marginBottom: spacing(2) },
  text: { fontSize: 12, fontWeight: '600' }
});

export default Chip;