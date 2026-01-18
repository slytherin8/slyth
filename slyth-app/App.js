import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import WelcomeScreen from "./src/screens/WelcomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import AdminSignupScreen from "./src/screens/AdminSignupScreen";
import AdminDashboard from "./src/screens/AdminDashboard";
import CreateEmployeeScreen from "./src/screens/CreateEmployeeScreen";
import EmployeeHome from "./src/screens/EmployeeHome";

// Admin pages
import AdminChatScreen from "./src/screens/AdminChatScreen";
import AdminMeetScreen from "./src/screens/AdminMeetScreen";
import AdminWorkScreen from "./src/screens/AdminWorkScreen";
import AdminFilesScreen from "./src/screens/AdminFilesScreen";
import AdminProfileScreen from "./src/screens/AdminProfileScreen";
import ProfileSetupScreen from "./src/screens/ProfileSetupScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

// Employee pages
import EmployeeChatScreen from "./src/screens/EmployeeChatScreen";
import EmployeeMeetScreen from "./src/screens/EmployeeMeetScreen";
import EmployeeWorkScreen from "./src/screens/EmployeeWorkScreen";
import EmployeeProfileScreen from "./src/screens/EmployeeProfileScreen";

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AdminSignup" component={AdminSignupScreen} />

        {/* Admin */}
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="CreateEmployee" component={CreateEmployeeScreen} />
        <Stack.Screen name="AdminChat" component={AdminChatScreen} />
        <Stack.Screen name="AdminMeet" component={AdminMeetScreen} />
        <Stack.Screen name="AdminWork" component={AdminWorkScreen} />
        <Stack.Screen name="AdminFiles" component={AdminFilesScreen} />
        <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
         <Stack.Screen
  name="Profile"
  component={ProfileScreen}
/>

        {/* Employee */}
        <Stack.Screen name="EmployeeHome" component={EmployeeHome} />
        <Stack.Screen name="EmployeeChat" component={EmployeeChatScreen} />
        <Stack.Screen name="EmployeeMeet" component={EmployeeMeetScreen} />
        <Stack.Screen name="EmployeeWork" component={EmployeeWorkScreen} />
        <Stack.Screen name="EmployeeProfile" component={EmployeeProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
