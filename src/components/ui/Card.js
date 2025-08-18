import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../constants/theme';

const Card = ({ style, children }) => {
  const { palette, radii, spacing, shadows } = useTheme();
  
  if (!children) {
    return (
      <View style={[{
        backgroundColor: palette.surface,
        borderRadius: radii.md,
        padding: spacing(4),
        borderWidth: 1,
        borderColor: palette.border,
        ...shadows.card
      }, style]} />
    );
  }

  const childArray = React.Children.toArray(children);
  const normalized = childArray.map((child, i) => {
    if (typeof child === 'string' || typeof child === 'number') {
      return <Text key={`card-text-${i}`} style={{ color: palette.text, fontSize: 14 }}>{child}</Text>;
    }
    return child;
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