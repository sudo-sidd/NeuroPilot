import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../../constants/theme';

// Simple Floating Action Button. For accessibility each screen supplies label & icon.
const FAB = ({ icon='＋', label='Action', onPress, disabled=false }) => {
  const { palette } = useTheme();
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: disabled ? palette.border : palette.primary, shadowColor: '#000' },
          pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 }
        ]}
      >
        <Text style={[styles.icon, { color: '#FFF' }]}>{icon}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position:'absolute', left:0, right:0, bottom:0, alignItems:'center', justifyContent:'center', paddingBottom: 70 },
  btn: { width:56, height:56, borderRadius:28, alignItems:'center', justifyContent:'center', elevation:6, shadowOpacity:0.25, shadowRadius:6, shadowOffset:{ width:0, height:4 } },
  icon: { fontSize:28, fontWeight:'600' }
});

export default FAB;
