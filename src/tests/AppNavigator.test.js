
import React from 'react';
import { render } from '@testing-library/react-native';
import AppNavigator from '../navigation/AppNavigator';

describe('AppNavigator', () => {
  it('should render the home screen by default', () => {
    const { getByText } = render(<AppNavigator />);
    expect(getByText('Home Screen')).toBeTruthy();
  });
});
