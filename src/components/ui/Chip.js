import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../constants/theme';

const Chip = ({ label, color, onPress, active }) => {
  const { palette, spacing, radii } = useTheme();
  const baseColor = color || palette.primary;
  return (
    <TouchableOpacity onPress={onPress} style={[styles.base, { backgroundColor: active ? baseColor : palette.surfaceAlt || palette.surface, borderColor: baseColor, paddingHorizontal: spacing(3), paddingVertical: spacing(1.5), borderRadius: radii.lg, marginRight: spacing(2), marginBottom: spacing(2) }]}> 
      <Text style={[styles.text, { color: active ? '#fff' : baseColor }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: { borderWidth: 1 },
  text: { fontSize: 12, fontWeight: '600' }
});

export default Chip;