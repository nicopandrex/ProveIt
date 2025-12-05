import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { loadOnboardingProgress } from '../services/onboardingService';

// Import onboarding screens
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import AppOverviewScreen from '../screens/onboarding/AppOverviewScreen';
import FirstNameScreen from '../screens/onboarding/FirstNameScreen';
import UsernameScreen from '../screens/onboarding/UsernameScreen';
import EmailScreen from '../screens/onboarding/EmailScreen';
import ProfilePictureScreen from '../screens/onboarding/ProfilePictureScreen';
import PasswordScreen from '../screens/onboarding/PasswordScreen';
import GoalIntroScreen from '../screens/onboarding/GoalIntroScreen';
import FirstGoalTitleScreen from '../screens/onboarding/FirstGoalTitleScreen';
import GoalFrequencyScreen from '../screens/onboarding/GoalFrequencyScreen';
import GoalDeadlineScreen from '../screens/onboarding/GoalDeadlineScreen';
import GoalCompletedScreen from '../screens/onboarding/GoalCompletedScreen';
import SuccessScreen from '../screens/onboarding/SuccessScreen';

// Import existing auth screens
import LoginScreen from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();

export default function OnboardingStack() {
  const [initialRoute, setInitialRoute] = useState('Welcome');
  const [initialParams, setInitialParams] = useState({});

  useEffect(() => {
    // Load saved progress on mount
    loadOnboardingProgress().then((progress) => {
      if (progress && progress.step && progress.data) {
        setInitialRoute(progress.step);
        setInitialParams(progress.data);
      }
    });
  }, []);

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
        initialParams={initialParams}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
      />
      <Stack.Screen 
        name="AppOverview" 
        component={AppOverviewScreen}
        initialParams={initialParams}
      />
      <Stack.Screen 
        name="FirstName" 
        component={FirstNameScreen}
        initialParams={initialParams}
      />
      <Stack.Screen 
        name="Username" 
        component={UsernameScreen}
        initialParams={initialParams}
      />
      <Stack.Screen 
        name="Email" 
        component={EmailScreen}
        initialParams={initialParams}
      />
      <Stack.Screen 
        name="ProfilePicture" 
        component={ProfilePictureScreen}
        initialParams={initialParams}
      />
      <Stack.Screen 
        name="Password" 
        component={PasswordScreen}
        initialParams={initialParams}
      />
      <Stack.Screen 
        name="GoalIntro" 
        component={GoalIntroScreen}
        initialParams={initialParams}
      />
      <Stack.Screen 
        name="FirstGoalTitle" 
        component={FirstGoalTitleScreen}
        initialParams={initialParams}
      />
      <Stack.Screen 
        name="GoalFrequency" 
        component={GoalFrequencyScreen}
        initialParams={initialParams}
      />
      <Stack.Screen 
        name="GoalDeadline" 
        component={GoalDeadlineScreen}
        initialParams={initialParams}
      />
      <Stack.Screen 
        name="GoalCompleted" 
        component={GoalCompletedScreen}
        initialParams={initialParams}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen 
        name="Success" 
        component={SuccessScreen}
        initialParams={initialParams}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
