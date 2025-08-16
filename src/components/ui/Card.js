import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../constants/theme';

const Card = ({ style, children }) => {
  const { palette, radii, spacing, shadows } = useTheme();
  const normalized = React.Children.map(children, (ch, i) => {
    if (typeof ch === 'string' || typeof ch === 'number') {
      return <Text key={i} style={{ color: palette.text, fontSize:14 }}>{ch}</Text>;
    }
    return ch;
  });
  return (
    <View style={[{
      backgroundColor: palette.surface,
      borderRadius: radii.md,
      padding: spacing(4),
      borderWidth: 1,
      borderColor: palette.border,
      ...shadows.card
    }, style]}>
      {normalized}
    </View>
  );
};

export default Card;