import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useTheme, useThemeMode } from '../../constants/theme';

const PrimaryButton = ({ title, onPress, small=false, accessibilityLabel }) => {
  const { palette, spacing, radii } = useTheme();
  const { reducedMotion } = useThemeMode();
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => { if (!reducedMotion) Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start(); };
  const handlePressOut = () => { if (!reducedMotion) Animated.spring(scale, { toValue: 1, friction:5, tension:180, useNativeDriver: true }).start(); };
  return (
    <Animated.View style={{ transform:[{ scale }] }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.btn, small && styles.small, { backgroundColor: palette.primary, paddingVertical: spacing(3), paddingHorizontal: spacing(5), borderRadius: radii.sm }]} activeOpacity={0.85}>
        <Text style={[styles.txt, small && styles.smallTxt]} allowFontScaling>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  btn: {},
  txt: { color: '#fff', fontWeight: '600', fontSize: 14 },
  small: { },
  smallTxt: { fontSize: 12 }
});

export default PrimaryButton;