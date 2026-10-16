import { Stack } from 'expo-router';
import { GameProvider } from '../store';
import { colors } from '../../../shared/tokens';
export default function RootLayout() { return <GameProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}/></GameProvider>; }
