import { Tabs } from 'expo-router';
import { RequirePlayer } from '../../live';
import { Icon } from '../../components/maidaan-ui';
import { colors } from '../../../../shared/tokens';
export default function TabLayout() { return <RequirePlayer><Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border }, tabBarLabelStyle: { fontSize: 10 } }}>{([{ name: 'discover', label: 'Discover', icon: 'explore' }, { name: 'map', label: 'Map', icon: 'map' }, { name: 'create', label: 'Create', icon: 'add' }, { name: 'my-games', label: 'My Games', icon: 'calendar' }, { name: 'ai', label: 'AI', icon: 'ai' }, { name: 'profile', label: 'Profile', icon: 'person' }] as const).map(t => <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label, tabBarIcon: ({ color }) => <Icon name={t.icon} color={color}/> }}/>)}</Tabs></RequirePlayer>; }
