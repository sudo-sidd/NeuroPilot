import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ActivityScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Activity Details (Placeholder)</Text>
      <Text>This screen will display detailed activity analytics in a future phase.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 }
});

export default ActivityScreen;
