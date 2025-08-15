import React from 'react';
import { View } from 'react-native';
import { palette, radii, spacing, shadows } from '../../constants/theme';

const Card = ({ style, children }) => (
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

export default Card;