import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import WelcomeScreen from "./src/screens/WelcomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import AdminSignupScreen from "./src/screens/AdminSignupScreen";
import AdminDashboard from "./src/screens/AdminDashboard";
import CreateEmployeeScreen from "./src/screens/CreateEmployeeScreen";
import EmployeeHome from "./src/screens/EmployeeHome";

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="AdminSignup" component={AdminSignupScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="CreateEmployee" component={CreateEmployeeScreen} />
        <Stack.Screen name="EmployeeHome" component={EmployeeHome} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
