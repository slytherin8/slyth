import React, { useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import ErrorBoundary from "./src/components/ErrorBoundary";
import notificationService from "./src/services/notificationService";

import WelcomeScreen from "./src/screens/WelcomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import AdminSignupScreen from "./src/screens/AdminSignupScreen";
import AdminDashboard from "./src/screens/AdminDashboard";
import AdminSetPinScreen from "./src/screens/AdminSetPinScreen";
import AdminEditCompanyScreen from "./src/screens/AdminEditCompanyScreen";
import CreateEmployeeScreen from "./src/screens/CreateEmployeeScreen";
import CreateGroupScreen from "./src/screens/CreateGroupScreen";
import GroupChatScreen from "./src/screens/GroupChatScreen";
import DirectChatScreen from "./src/screens/DirectChatScreen";
import DebugAuthScreen from "./src/screens/DebugAuthScreen";
import EmployeeHome from "./src/screens/EmployeeHome";
import EditGroupScreen from "./src/screens/EditGroupScreen";
import GroupInfoScreen from "./src/screens/GroupInfoScreen";
import GroupDeleteScreen from "./src/screens/GroupDeleteScreen";

// Admin pages
import AdminChatScreen from "./src/screens/AdminChatScreen";
import AdminMeetScreen from "./src/screens/AdminMeetScreen";
import AdminWorkScreen from "./src/screens/AdminWorkScreen";
import AdminFilesScreen from "./src/screens/AdminFilesScreen";
import AdminVaultScreen from "./src/screens/AdminVaultScreen";
import AdminProfileScreen from "./src/screens/AdminProfileScreen";
import AdminLogoutScreen from "./src/screens/AdminLogoutScreen";
import EmployeeWorkspaceScreen from "./src/screens/EmployeeWorkspaceScreen";
import ProjectTasksScreen from "./src/screens/ProjectTasksScreen";
import ProfileSetupScreen from "./src/screens/ProfileSetupScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

// Employee pages
import EmployeeChatScreen from "./src/screens/EmployeeChatScreen";
import EmployeeMeetScreen from "./src/screens/EmployeeMeetScreen";
import EmployeeWorkScreen from "./src/screens/EmployeeWorkScreen";
import EmployeeProfileScreen from "./src/screens/EmployeeProfileScreen";
import EmployeeProfileEditScreen from "./src/screens/EmployeeProfileEditScreen";
import EmployeeLogoutScreen from "./src/screens/EmployeeLogoutScreen";

const Stack = createStackNavigator();

export default function App() {
  const navigationRef = useRef();

  useEffect(() => {
    // Register for push notifications
    notificationService.registerForPushNotificationsAsync();

    // Initialize listeners with navigation ref
    notificationService.initListeners(navigationRef.current);

    return () => {
      notificationService.cleanup();
    };
  }, []);

  return (
    <ErrorBoundary>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* Auth */}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="AdminSignup" component={AdminSignupScreen} />
          <Stack.Screen name="DebugAuth" component={DebugAuthScreen} />

          {/* Admin */}
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          <Stack.Screen name="AdminSetPin" component={AdminSetPinScreen} />
          <Stack.Screen name="AdminEditCompany" component={AdminEditCompanyScreen} />
          <Stack.Screen name="CreateEmployee" component={CreateEmployeeScreen} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
          <Stack.Screen name="EditGroup" component={EditGroupScreen} />
          <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
          <Stack.Screen name="GroupDelete" component={GroupDeleteScreen} />
          <Stack.Screen name="GroupChat" component={GroupChatScreen} />
          <Stack.Screen name="DirectChat" component={DirectChatScreen} />
          <Stack.Screen name="AdminChat" component={AdminChatScreen} />
          <Stack.Screen name="AdminMeet" component={AdminMeetScreen} />
          <Stack.Screen name="AdminWork" component={AdminWorkScreen} />
          <Stack.Screen name="AdminFiles" component={AdminFilesScreen} />
          <Stack.Screen name="AdminVault" component={AdminVaultScreen} />
          <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
          <Stack.Screen name="AdminLogout" component={AdminLogoutScreen} />
          <Stack.Screen name="EmployeeWorkspace" component={EmployeeWorkspaceScreen} />
          <Stack.Screen name="ProjectTasks" component={ProjectTasksScreen} />
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
          <Stack.Screen name="EmployeeProfileEdit" component={EmployeeProfileEditScreen} />
          <Stack.Screen name="EmployeeLogout" component={EmployeeLogoutScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
