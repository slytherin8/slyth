import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = width * 0.18;

export default function PinKeypad({ onKeyPress, onDelete, onSubmit, pinLength = 0 }) {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

    const renderKey = (key) => (
        <TouchableOpacity
            key={key}
            style={styles.keyButton}
            onPress={() => onKeyPress(key)}
        >
            <Text style={styles.keyText}>{key}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.pinIndicatorContainer}>
                <View style={[styles.pinDot, pinLength > 0 && styles.pinDotFilled]} />
                <View style={[styles.pinDot, pinLength > 1 && styles.pinDotFilled]} />
                <View style={[styles.pinDot, pinLength > 2 && styles.pinDotFilled]} />
                <View style={[styles.pinDot, pinLength > 3 && styles.pinDotFilled]} />
                <View style={[styles.pinDot, pinLength > 4 && styles.pinDotFilled]} />
            </View>

            <View style={styles.keypad}>
                {keys.map(renderKey)}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
                    <Ionicons name="backspace-outline" size={30} color="#333" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingBottom: 20
    },
    pinIndicatorContainer: {
        flexDirection: 'row',
        marginBottom: 40,
        justifyContent: 'center',
    },
    pinDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#333',
        marginHorizontal: 10,
    },
    pinDotFilled: {
        backgroundColor: '#006400', // Dark Green
        borderColor: '#006400'
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: width * 0.8,
        justifyContent: 'space-between',
    },
    keyButton: {
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        backgroundColor: '#006400', // Green button
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 10,
        marginBottom: 20
    },
    keyText: {
        fontSize: 28,
        color: '#fff',
        fontWeight: '500',
    },
    alphabet: {
        fontSize: 10,
        color: '#ccc',
        position: 'absolute',
        bottom: 8
    },
    actions: {
        marginTop: 20,
        width: '100%',
        alignItems: 'center'
    },
    actionButton: {
        padding: 10
    }
});
