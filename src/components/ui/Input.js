import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { palette, radii, spacing } from '../../constants/theme';

const Input = React.forwardRef(({ style, ...props }, ref) => (
  <TextInput
    ref={ref}
    placeholderTextColor={palette.textLight}
    style={[styles.input, style]}
    {...props}
  />
));

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: palette.border, backgroundColor: '#fff', paddingHorizontal: spacing(3), paddingVertical: spacing(2.5), borderRadius: radii.sm, fontSize: 14 }
});

export default Input;