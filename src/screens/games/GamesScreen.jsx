import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../utils/constants';

const GamesScreen = () => {
    const games = [
        {
            id: '1',
            name: 'Quick Quiz',
            icon: 'head-question',
            color: '#0066FF',
            bg: 'bg-blue-50',
            players: '2-10',
            description: 'Test your knowledge with team trivia',
        },
        {
            id: '2',
            name: 'Word Puzzle',
            icon: 'spell-check',
            color: '#28A745',
            bg: 'bg-green-50',
            players: '2-6',
            description: 'Collaborative word guessing game',
        },
        {
            id: '3',
            name: 'Icebreaker',
            icon: 'ice-cream',
            color: '#FFC107',
            bg: 'bg-yellow-50',
            players: '3-12',
            description: 'Fun questions to get to know teammates',
        },
        {
            id: '4',
            name: 'Drawing',
            icon: 'draw',
            color: '#DC3545',
            bg: 'bg-red-50',
            players: '2-8',
            description: 'Guess what your teammate is drawing',
        },
    ];

    const handleGamePress = (game) => {
        Alert.alert(
            game.name,
            `${game.description}\n\nPlayers: ${game.players}\n\nWould you like to start a new game session?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Start Game', onPress: () => Alert.alert('Game Starting', `${game.name} lobby created! Invite your teammates to join.`) },
            ]
        );
    };

    return (
        <ScrollView className="flex-1 bg-white">
            <LinearGradient
                colors={['#0066FF', '#6C63FF']}
                className="p-8 pb-12 rounded-b-[40px]"
            >
                <View className="flex-row items-center">
                    <Icon name="gamepad-variant" size={40} color="white" />
                    <Text className="text-white text-3xl font-bold ml-3">Team Games</Text>
                </View>
                <Text className="text-white/80 text-base mt-2">
                    Boost morale and bond with your team
                </Text>
            </LinearGradient>

            <View className="px-6 -mt-8">
                <View className="flex-row flex-wrap justify-between">
                    {games.map((game) => (
                        <TouchableOpacity
                            key={game.id}
                            className="w-[48%] bg-white p-5 rounded-3xl shadow-xl mb-4 border border-gray-100"
                            onPress={() => handleGamePress(game)}
                        >
                            <View className={`${game.bg} p-4 rounded-2xl mb-3 self-start`}>
                                <Icon name={game.icon} size={28} color={game.color} />
                            </View>
                            <Text className="text-gray-800 font-bold text-lg">{game.name}</Text>
                            <Text className="text-gray-400 text-xs mt-1 mb-3">
                                <Icon name="account-group" size={12} /> {game.players} Players
                            </Text>
                            <TouchableOpacity
                                className="bg-gray-100 py-2 rounded-xl items-center"
                                onPress={() => handleGamePress(game)}
                            >
                                <Text className="text-gray-600 font-bold text-xs">Join Lobby</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>

                <View className="bg-blue-50 rounded-3xl p-6 mt-4 mb-10 border border-blue-100">
                    <Text className="text-blue-800 font-bold text-xl mb-2 text-center">Why Play Games?</Text>
                    <Text className="text-blue-600 text-center leading-5 italic">
                        "Fun breaks improve team happiness and productivity. Build stronger relationships through play."
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
};


export default GamesScreen;
