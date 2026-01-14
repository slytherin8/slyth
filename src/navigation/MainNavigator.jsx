import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

// Screens
import DashboardScreen from '../screens/main/DashboardScreen';
import VaultScreen from '../screens/vault/VaultScreen';
import CallsScreen from '../screens/calls/CallsScreen';
import GamesScreen from '../screens/games/GamesScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ChannelScreen from '../screens/chat/ChannelScreen';
import DirectMessageScreen from '../screens/chat/DirectMessageScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const TabNavigator = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Dashboard') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Vault') {
                        iconName = focused ? 'shield-lock' : 'shield-lock-outline';
                    } else if (route.name === 'Calls') {
                        iconName = focused ? 'phone' : 'phone-outline';
                    } else if (route.name === 'Games') {
                        iconName = focused ? 'gamepad-variant' : 'gamepad-variant-outline';
                    } else if (route.name === 'Settings') {
                        iconName = focused ? 'cog' : 'cog-outline';
                    }

                    return <Icon name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.gray,
                tabBarStyle: {
                    backgroundColor: COLORS.white,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                    height: 60,
                    paddingBottom: 8,
                },
                headerShown: true,
                headerStyle: {
                    backgroundColor: COLORS.primary,
                },
                headerTintColor: COLORS.white,
                headerTitleStyle: {
                    fontWeight: '600',
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            {isAdmin && <Tab.Screen name="Vault" component={VaultScreen} />}
            <Tab.Screen name="Calls" component={CallsScreen} />
            <Tab.Screen name="Games" component={GamesScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
};

const MainNavigator = () => {
    return (
        <Drawer.Navigator
            screenOptions={{
                headerShown: false,
                drawerType: 'front',
                drawerStyle: {
                    backgroundColor: COLORS.white,
                    width: 280,
                },
                drawerActiveTintColor: COLORS.primary,
                drawerInactiveTintColor: COLORS.textSecondary,
            }}
        >
            <Drawer.Screen
                name="Home"
                component={TabNavigator}
                options={{
                    drawerIcon: ({ color }) => <Icon name="home" size={24} color={color} />,
                }}
            />
            <Drawer.Screen
                name="Channel"
                component={ChannelScreen}
                options={{
                    drawerIcon: ({ color }) => <Icon name="pound" size={24} color={color} />,
                    drawerLabel: 'Channels',
                }}
            />
            <Drawer.Screen
                name="DirectMessage"
                component={DirectMessageScreen}
                options={{
                    drawerIcon: ({ color }) => <Icon name="message" size={24} color={color} />,
                    drawerLabel: 'Direct Messages',
                }}
            />
        </Drawer.Navigator>
    );
};

export default MainNavigator;
