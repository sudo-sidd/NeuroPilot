import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { palette, typography, spacing } from '../../constants/theme';

const SectionHeader = ({ title, action }) => (
  <View style={styles.row}>
    <Text style={styles.title}>{title}</Text>
    {action}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing(6), marginBottom: spacing(2) },
  title: { ...typography.subtitle, color: palette.textLight }
});

export default SectionHeader;