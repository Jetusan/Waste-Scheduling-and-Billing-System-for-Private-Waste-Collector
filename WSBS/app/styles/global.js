import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#4CAF50',
  background: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.text,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default {
  colors,
  globalStyles,
};
