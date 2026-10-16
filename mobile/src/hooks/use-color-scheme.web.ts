import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
const subscribe = () => () => {};
// Keep the server and first hydration render consistent before reading the client scheme.
export function useColorScheme() {
 const hasHydrated = useSyncExternalStore(subscribe, () => true, () => false);
 const scheme = useRNColorScheme();
 return hasHydrated ? scheme : 'light';
}
