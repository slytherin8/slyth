import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../utils/constants';

const SettingsScreen = () => {
    const { user, logout } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
    const [soundEnabled, setSoundEnabled] = React.useState(true);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to terminate your secure session?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout },
            ]
        );
    };

    const renderSettingItem = (icon, title, subtitle, onPress, trailing, iconColor = "#0066FF") => (
        <TouchableOpacity
            className="flex-row items-center px-6 py-5 bg-white border-b border-gray-50"
            onPress={onPress}
            disabled={!onPress}
        >
            <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 bg-gray-50`}>
                <Icon name={icon} size={24} color={iconColor} />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-bold text-base">{title}</Text>
                {subtitle && <Text className="text-gray-400 text-xs mt-0.5">{subtitle}</Text>}
            </View>
            {trailing || <Icon name="chevron-right" size={20} color="#D1D5DB" />}
        </TouchableOpacity>
    );

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Premium Header Profile */}
            <LinearGradient
                colors={['#1E1B4B', '#312E81']}
                className="px-8 pt-16 pb-12 rounded-b-[48px] items-center"
            >
                <View className="relative">
                    <View className="w-24 h-24 rounded-full bg-white/10 items-center justify-center border-4 border-white/20">
                        <Text className="text-white text-4xl font-black">
                            {user?.username?.[0]?.toUpperCase()}
                        </Text>
                    </View>
                    <TouchableOpacity className="absolute bottom-0 right-0 bg-blue-500 w-8 h-8 rounded-full items-center justify-center border-2 border-indigo-900">
                        <Icon name="camera" size={16} color="white" />
                    </TouchableOpacity>
                </View>
                <Text className="text-white text-2xl font-black mt-4">{user?.username}</Text>
                <Text className="text-white/60 text-sm font-medium">{user?.email}</Text>
                <View className="mt-4 px-4 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30">
                    <Text className="text-blue-400 text-[10px] font-black uppercase tracking-widest">{user?.role || 'Member'}</Text>
                </View>
            </LinearGradient>

            <View className="mt-8">
                <Text className="px-8 text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Security & Account</Text>
                <View className="bg-white rounded-[32px] mx-4 overflow-hidden shadow-sm">
                    {renderSettingItem('account-cog', 'Profile Settings', 'Update your secure identity', () => Alert.alert('Edit Profile', 'Navigation to Profile Edit'))}
                    {renderSettingItem('shield-key', 'Authentication', 'Manage 2FA & PIN security', () => Alert.alert('Security', 'Navigation to Security'))}
                    {renderSettingItem('devices', 'Active Sessions', 'Manage your logged-in devices', () => Alert.alert('Sessions', 'Navigation to Sessions'))}
                </View>
            </View>

            <View className="mt-8">
                <Text className="px-8 text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">Preferences</Text>
                <View className="bg-white rounded-[32px] mx-4 overflow-hidden shadow-sm">
                    {renderSettingItem('bell-ring', 'Notifications', 'Total control over alerts', null,
                        <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: '#E5E7EB', true: '#0066FF' }} thumbColor="white" />
                    )}
                    {renderSettingItem('volume-high', 'Encrypted Sounds', 'Auditory feedback system', null,
                        <Switch value={soundEnabled} onValueChange={setSoundEnabled} trackColor={{ false: '#E5E7EB', true: '#0066FF' }} thumbColor="white" />
                    )}
                    {renderSettingItem('theme-light-dark', 'Dark Interface', 'Toggle high-contrast mode', null,
                        <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: '#E5E7EB', true: '#0066FF' }} thumbColor="white" />
                    )}
                </View>
            </View>

            <View className="mt-8">
                <Text className="px-8 text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">System</Text>
                <View className="bg-white rounded-[32px] mx-4 overflow-hidden shadow-sm">
                    {renderSettingItem('information', 'App Version', 'Build 1.0.0-PRO', null, <Text className="text-blue-600 font-bold text-xs">v1.0.0</Text>)}
                    {renderSettingItem('file-document-outline', 'Legal Documents', 'Terms & Privacy protocols', () => Alert.alert('Legal', 'Legal Documents'))}
                </View>
            </View>

            <TouchableOpacity
                className="mt-10 mx-8 bg-red-50 border border-red-100 rounded-2xl flex-row items-center justify-center py-4 mb-4"
                onPress={handleLogout}
            >
                <Icon name="logout-variant" size={20} color="#EF4444" />
                <Text className="text-red-500 font-black ml-2 text-base">Terminate Session</Text>
            </TouchableOpacity>

            <View className="pb-12 pt-4 items-center">
                <Text className="text-gray-300 text-[10px] font-bold uppercase tracking-[2px]">
                    SecureCollab Enterprise Ecosystem
                </Text>
            </View>
        </ScrollView>
    );
};


export default SettingsScreen;
