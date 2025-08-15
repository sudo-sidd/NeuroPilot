import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../constants/theme';

const PrimaryButton = ({ title, onPress, small=false }) => {
  const { palette, spacing, radii } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, small && styles.small, { backgroundColor: palette.primary, paddingVertical: spacing(3), paddingHorizontal: spacing(5), borderRadius: radii.sm }]} activeOpacity={0.85}>
      <Text style={[styles.txt, small && styles.smallTxt]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {},
  txt: { color: '#fff', fontWeight: '600', fontSize: 14 },
  small: { },
  smallTxt: { fontSize: 12 }
});

export default PrimaryButton;