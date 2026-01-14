# SecureCollab - Secure Team Collaboration App

A fully-featured React Native team collaboration application similar to Slack, with end-to-end encryption, real-time messaging, encrypted vault, video calls, and team engagement games.

## 🚀 Features

### Core Features
- ✅ **Secure Authentication**
  - Email/Password login
  - Two-Factor Authentication (2FA)
  - PIN Lock with biometric support
  - Session timeout management
  
- ✅ **Real-Time Messaging**
  - Public and private channels
  - One-on-one direct messages
  - End-to-end encryption
  - Typing indicators
  - File attachments
  - Message reactions

- ✅ **Encrypted Vault**
  - Zero-knowledge encrypted storage
  - Upload/download files
  - Access logging
  - File sharing with permissions

- ✅ **Voice & Video Calls**
  - Audio calls
  - Video meetings
  - Screen sharing
  - Privacy mode (auto-hide vault data)
  - Live drawing on screen

- ✅ **Team Engagement**
  - Mini multiplayer games
  - Quick quiz, word puzzles, icebreakers
  - Team bonding activities

- ✅ **Advanced Security**
  - AES-256-GCM encryption
  - TLS/DTLS for all communication
  - RBAC (Role-Based Access Control)
  - Session management

- ✅ **Notifications**
  - Push notifications
  - In-app notifications
  - Configurable preferences

## 📁 Project Structure

```
d:/slack/
├── App.js                      # Main entry point
├── app.json                    # Expo configuration
├── package.json                # Dependencies
└── src/
    ├── components/             # Reusable components
    ├── context/
    │   ├── AuthContext.jsx     # Auth state management
    │   ├── SocketContext.jsx   # WebSocket management
    │   ├── NotificationContext.jsx
    │   └── ThemeContext.jsx
    ├── navigation/
    │   ├── AppNavigator.jsx
    │   ├── AuthNavigator.jsx
    │   └── MainNavigator.jsx
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.jsx
    │   │   ├── RegisterScreen.jsx
    │   │   ├── TwoFactorScreen.jsx
    │   │   └── PINLockScreen.jsx
    │   ├── main/
    │   │   └── DashboardScreen.jsx
    │   ├── chat/
    │   │   ├── ChannelScreen.jsx
    │   │   └── DirectMessageScreen.jsx
    │   ├── vault/
    │   │   └── VaultScreen.jsx
    │   ├── calls/
    │   │   └── CallsScreen.jsx
    │   ├── games/
    │   │   └── GamesScreen.jsx
    │   └── settings/
    │       └── SettingsScreen.jsx
    ├── services/
    │   ├── api.js              # Axios instance
    │   ├── authService.js      # Auth API calls
    │   ├── chatService.js      # Chat API calls
    │   ├── vaultService.js     # Vault operations
    │   └── socketService.js    # Socket.io client
    └── utils/
        ├── constants.js        # App constants & theme
        └── encryption.js       # Encryption utilities
```

## 🛠️ Installation

### Prerequisites
- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Studio (for Android emulator)

### Setup

1. **Navigate to the project directory:**
   ```bash
   cd d:/slack
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   Create a `.env` file in the root directory:
   ```env
   API_BASE_URL=http://localhost:5000/api/v1
   SOCKET_URL=http://localhost:5000
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

5. **Run on device/emulator:**
   - iOS: Press `i` or `npm run ios`
   - Android: Press `a` or `npm run android`
   - Web: Press `w` or `npm run web`

## 🔧 Configuration

### API Configuration
Update `src/utils/constants.js`:
```javascript
export const API_CONFIG = {
  BASE_URL: 'https://your-api-url.com/api/v1',
  SOCKET_URL: 'https://your-api-url.com',
  TIMEOUT: 10000,
};
```

### Theme Customization
Modify colors and styles in `src/utils/constants.js`:
```javascript
export const COLORS = {
  primary: '#0066FF',
  secondary: '#6C63FF',
  // ... other colors
};
```

## 📱 Key Screens

### Authentication Flow
1. **Login** → Enter credentials
2. **2FA** (if enabled) → Enter 6-digit code
3. **PIN Lock** (optional) → Enter 4-digit PIN or use biometrics
4. **Dashboard** → Access all features

### Main Features
- **Dashboard**: Overview of channels, DMs, and quick actions
- **Channels**: Public/private team channels with real-time messaging
- **Direct Messages**: One-on-one encrypted conversations
- **Vault**: Encrypted file storage with access controls
- **Calls**: Audio/video calling with screen sharing
- **Games**: Team engagement mini-games
- **Settings**: Account, security, and app preferences

## 🔐 Security Features

### Encryption
- **Messages**: AES-256-GCM with unique IV per message
- **Files**: Client-side encryption before upload
- **Vault**: Zero-knowledge architecture
- **Communication**: TLS 1.3 for API, WSS for WebSockets, DTLS for WebRTC

### Authentication
- **JWT**: Short-lived access tokens (15 mins)
- **Refresh Tokens**: Secure token rotation
- **Session Timeout**: Configurable auto-logout
- **2FA**: TOTP-based two-factor authentication
- **Biometrics**: Fingerprint/Face ID support

## 🎮 Mini Games

1. **Quick Quiz**: Team trivia (2-10 players)
2. **Word Puzzle**: Collaborative word guessing (2-6 players)
3. **Icebreaker Challenge**: Get-to-know-you questions (3-12 players)
4. **Drawing Challenge**: Pictionary-style game (2-8 players)
5. **Number Puzzle**: Math challenges (2-6 players)
6. **Word Chain**: Build word associations (2-8 players)

## 📡 Real-Time Features

### WebSocket Events
- `new_message`: Receive incoming messages
- `user_typing`: Typing indicators
- `presence_update`: User online/offline status
- `call_invitation`: Incoming call notifications
- `notification`: Push notifications

### WebRTC Signaling
- Peer-to-peer voice/video calls
- Screen sharing with privacy mode
- ICE candidate exchange
- Media stream management

## 🚧 Backend Requirements

This frontend requires a Node.js backend with:
- Express.js REST API
- Socket.io for WebSockets
- MongoDB database
- Redis for sessions
- WebRTC signaling server (Mediasoup/Janus)

See `architecture.md` for complete backend specifications.

## 📚 Dependencies

### Core
- `react-native`: ^0.74.1
- `expo`: ~51.0.0
- `@react-navigation/native`: ^6.1.9
- `axios`: ^1.6.2
- `socket.io-client`: ^4.6.1

### Security
- `crypto-js`: ^4.2.0
- `expo-crypto`: ~13.0.2
- `expo-secure-store`: ~13.0.1
- `expo-local-authentication`: ~14.0.1

### UI
- `react-native-paper`: ^5.12.3
- `react-native-vector-icons`: ^10.0.3
- `react-native-linear-gradient`: ^2.8.3

### Communication
- `react-native-webrtc`: ^118.0.0
- `expo-notifications`: ~0.28.4

## 🎨 Design System

### Colors
- **Primary**: #0066FF (Blue)
- **Secondary**: #6C63FF (Purple)
- **Success**: #28A745 (Green)
- **Danger**: #DC3545 (Red)
- **Warning**: #FFC107 (Yellow)

### Typography
- Headers: Inter/Roboto Bold
- Body: Inter/Roboto Regular
- Sizes: 12px - 32px

### Spacing
- XS: 4px | SM: 8px | MD: 16px | LG: 24px | XL: 32px

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run linter
npm run lint
```

## 📦 Building for Production

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

### Web
```bash
npm run web
expo build:web
```

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler errors**:
   ```bash
   npm start -- --reset-cache
   ```

2. **Module resolution errors**:
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **iOS build issues**:
   ```bash
   cd ios && pod install && cd ..
   ```

## 📄 License

MIT License - See LICENSE file for details

## 👥 Team

Designed and developed as a secure enterprise collaboration solution.

## 🔗 Related Documentation

- `architecture.md` - Complete system architecture
- Backend API documentation (separate repo)
- Security whitepaper (separate document)

---

**Note**: This is a frontend implementation. Backend API must be running for full functionality. Update API endpoints in `src/utils/constants.js` before deployment.
