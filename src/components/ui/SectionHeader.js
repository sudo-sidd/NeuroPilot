import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../constants/theme';

const SectionHeader = ({ title, action }) => {
  const { palette, typography, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing(6), marginBottom: spacing(2) }}>
      <Text style={{ ...typography.subtitle, color: palette.textLight }}>{title}</Text>
      {action}
    </View>
  );
};

// styles object retained for backward compatibility (unused dynamically now)
const styles = StyleSheet.create({
  row: { },
  title: { }
});

export default SectionHeader;