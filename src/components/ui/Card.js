import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../constants/theme';

const Card = ({ style, children }) => {
  const { palette, radii, spacing, shadows } = useTheme();
  return (
    <View style={[{
      backgroundColor: palette.surface,
      borderRadius: radii.md,
      padding: spacing(4),
      borderWidth: 1,
      borderColor: palette.border,
      ...shadows.card
    }, style]}>
      {children}
    </View>
  );
};

export default Card;