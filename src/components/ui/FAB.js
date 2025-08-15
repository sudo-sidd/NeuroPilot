import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, View, Animated } from 'react-native';
import { useTheme, useThemeMode } from '../../constants/theme';

// Simple Floating Action Button. For accessibility each screen supplies label & icon.
const FAB = ({ icon='▶', label='Action', onPress, disabled=false }) => {
  const { palette } = useTheme();
  const { reducedMotion } = useThemeMode();
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => { if (!reducedMotion) Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }).start(); };
  const handlePressOut = () => { if (!reducedMotion) Animated.spring(scale, { toValue: 1, friction:5, tension:180, useNativeDriver: true }).start(); };
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Animated.View style={{ transform:[{ scale }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="Double tap to perform primary action"
          hitSlop={10}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: disabled ? palette.border : palette.primary, shadowColor: '#000' },
            pressed && { opacity: 0.9 }
          ]}
        >
          <Text style={[styles.icon, { color: '#FFF' }]} allowFontScaling>{icon}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position:'absolute', left:0, right:0, bottom:0, alignItems:'center', justifyContent:'center', paddingBottom: 70 },
  btn: { width:56, height:56, borderRadius:28, alignItems:'center', justifyContent:'center', elevation:6, shadowOpacity:0.25, shadowRadius:6, shadowOffset:{ width:0, height:4 } },
  icon: { fontSize:28, fontWeight:'600' }
});

export default FAB;
