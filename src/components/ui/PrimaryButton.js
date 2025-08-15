import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { palette, radii, spacing, typography } from '../../constants/theme';

const PrimaryButton = ({ title, onPress, small=false }) => (
  <TouchableOpacity onPress={onPress} style={[styles.btn, small && styles.small]} activeOpacity={0.85}>
    <Text style={[styles.txt, small && styles.smallTxt]}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: { backgroundColor: palette.primary, paddingVertical: spacing(3), paddingHorizontal: spacing(5), borderRadius: radii.sm },
  txt: { color: '#fff', fontWeight: '600', fontSize: 14 },
  small: { paddingVertical: spacing(2), paddingHorizontal: spacing(3) },
  smallTxt: { fontSize: 12 }
});

export default PrimaryButton;