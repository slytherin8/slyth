import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DebugApp() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Debug App Working!</Text>
      <Text style={styles.subtext}>If you see this, React Native is working fine.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 10
  },
  subtext: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center'
  }
});