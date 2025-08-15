import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../constants/theme';

const Input = React.forwardRef(({ style, ...props }, ref) => {
  const { palette, radii, spacing } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={palette.textLight}
      style={[{ borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, paddingHorizontal: spacing(3), paddingVertical: spacing(2.5), borderRadius: radii.sm, fontSize: 14, color: palette.text }, style]}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  input: {}
});

export default Input;