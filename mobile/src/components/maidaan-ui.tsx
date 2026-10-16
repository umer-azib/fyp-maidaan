import {NativeNotifications} from '../notifications';
import { NativeAnnouncements } from '../content';
import { Text, View, Pressable, TextInput, ScrollView, StyleSheet, Modal, Image, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { router, usePathname } from 'expo-router';
import { useGames } from '../store';
import { colors as c } from '../../../shared/tokens';
import { dateLabel, spots, type Game } from '../../../shared/games';
const names = { ai:{ios: 'sparkles',android: 'auto_awesome',web: 'auto_awesome'}, explore: { ios: 'safari', android: 'explore', web: 'explore' }, map: { ios: 'map', android: 'map', web: 'map' }, add: { ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }, calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }, person: { ios: 'person', android: 'person', web: 'person' }, pin: { ios: 'mappin', android: 'location_on', web: 'location_on' }, sports: { ios: 'sportscourt', android: 'sports', web: 'sports' }, arrow: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }, back: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }, close: { ios: 'xmark', android: 'close', web: 'close' }, check: { ios: 'checkmark', android: 'check', web: 'check' } } as const;
export function Icon({ name, color = c.primary, size = 24 }: {
    name: keyof typeof names;
    color?: import('react-native').ColorValue;
    size?: number;
}) { return <SymbolView name={names[name]} tintColor={color} size={size}/>; }
export function T({ children, muted = false, style }: {
    children: ReactNode;
    muted?: boolean;
    style?: import('react-native').TextStyle;
}) { return <Text style={[s.text, muted && { color: c.muted }, style]}>{children}</Text>; }
export function Button({ children, onPress, secondary = false, disabled = false }: {
    children: ReactNode;
    onPress: () => void;
    secondary?: boolean;
    disabled?: boolean;
}) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && { backgroundColor: c.lavender }, (pressed || disabled) && { opacity: .5 }]}><T style={{ color: secondary ? c.primary : 'white', fontWeight: '600', textAlign: 'center' }}>{children}</T></Pressable>; }
export function Chip({ children }: {
    children: ReactNode;
}) { return <View style={s.chip}><T style={{ fontSize: 11, color: c.primary, fontWeight: '600' }}>{children}</T></View>; }
export function Avatar({ name }: {
    name: string;
}) { return <View accessibilityLabel={name} style={s.avatar}><T style={{ color: c.primary, fontWeight: '700' }}>{name.split(' ').map(x => x[0]).join('').slice(0, 2)}</T></View>; }
export function Field({ label, ...props }: TextInputProps & {
    label: string;
}) { return <View style={{ gap: 8 }}><T style={{ fontSize: 13 }}>{label}</T><TextInput accessibilityLabel={label} placeholderTextColor={c.muted} {...props} style={[s.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]}/></View>; }
export function Choices({ values, value, onChange }: {
    values: readonly string[];
    value: string | string[];
    onChange: (v: string) => void;
}) { return <View style={s.wrap}>{values.map(v => <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: typeof value === 'string' ? v === value : value.includes(v) }} onPress={() => onChange(v)} style={[s.choice, (typeof value === 'string' ? value === v : value.includes(v)) && s.selected]}><T style={{ fontSize: 13, color: (typeof value === 'string' ? value === v : value.includes(v)) ? c.primary : c.muted }}>{v}</T></Pressable>)}</View>; }
export function Screen({ children, title, eyebrow, back }: {
    children?: ReactNode;
    title?: string;
    eyebrow?: string;
    back?: () => void;
}) { const {demoSession,logout,userId}=useGames();const path=usePathname();const [error,setError]=useState('');return <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>{userId&&!demoSession&&!['/welcome','/auth','/signup','/portal'].includes(path)&&!path.endsWith('/login')&&<><NativeNotifications/><NativeAnnouncements/></>}{demoSession&&path!=='/welcome'&&path!=='/auth'&&!path.endsWith('/login')&&<View style={{gap:12}}><Chip>LOCAL DEMO | SAMPLE DATA</Chip><Button secondary onPress={()=>logout().then(()=>router.replace('/welcome')).catch(e=>setError(e.message))}>Logout</Button>{error&&<T>{error}</T>}</View>}{back && <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={back} style={{ minHeight: 44, justifyContent: 'center' }}><Icon name="back" color={c.text}/></Pressable>}{eyebrow && <T style={s.eyebrow}>{eyebrow}</T>}{title && <T style={s.heading}>{title}</T>}{children}</ScrollView></SafeAreaView>; }
export function Panel({ children, style }: {
    children: ReactNode;
    style?: ViewStyle;
}) { return <View style={[s.panel, style]}>{children}</View>; }
export function GameCard({ game: g, onPress }: {
    game: Game;
    onPress: () => void;
}) { return <Pressable accessibilityRole="button" accessibilityLabel={g.title + ', ' + spots(g) + ' spots, ' + g.sport} onPress={onPress} style={[s.gameCard, g.sport === 'Cricket' && { backgroundColor: '#EFEDF4' }, g.sport === 'Badminton' && { backgroundColor: '#EAF0EA' }, g.sport === 'Padel' && { backgroundColor: '#F2EEE8' }]}>{g.sport === 'Football' && <Image source={require('../../assets/community-football.png')} style={StyleSheet.absoluteFill} resizeMode="cover"/>}<View style={[s.cardContent, g.sport === 'Football' && { backgroundColor: '#0004' }]}><View style={s.between}><Chip>{g.sport}</Chip><Chip>{g.status === 'open' ? spots(g) + ' spots left' : g.status}</Chip></View><View style={[{ gap: 12, padding: 16, borderRadius: 16 }, g.sport === 'Football' && { backgroundColor: '#161616C9' }]}><T style={{ color: g.sport === 'Football' ? c.lavender : c.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>{g.joinMode === 'instant' ? 'INSTANT JOIN' : 'REQUEST TO JOIN'}</T><T style={{ fontSize: 27, fontWeight: '700', lineHeight: 32, color: g.sport === 'Football' ? 'white' : c.text }}>{g.title}</T><T style={{ fontSize: 13, color: g.sport === 'Football' ? 'white' : c.muted }}>{g.venue}</T><T style={{ fontSize: 12, color: g.sport === 'Football' ? 'white' : c.muted }}>{dateLabel(g)}</T><View style={s.between}><T style={{ fontSize: 11, color: g.sport === 'Football' ? 'white' : c.muted }}>{g.skill} · {g.players.length}/{g.maxPlayers} players</T><Icon name="arrow" color={g.sport === 'Football' ? 'white' : c.primary}/></View></View></View></Pressable>; }
export function Confirm({ title, copy, onClose, onConfirm }: {
    title: string;
    copy: string;
    onClose: () => void;
    onConfirm: () => void;
}) { return <Modal transparent animationType="fade" onRequestClose={onClose}><View style={s.scrim}><View accessibilityViewIsModal style={s.dialog}><T style={{ fontSize: 24, fontWeight: '700' }}>{title}</T><T muted>{copy}</T><Button onPress={onConfirm}>Confirm</Button><Button secondary onPress={onClose}>Keep it</Button></View></View></Modal>; }
// eslint-disable-next-line react-refresh/only-export-components
export const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: c.background }, page: { padding: 20, gap: 18, paddingBottom: 40, width:'100%',maxWidth:760,alignSelf:'center' }, text: { fontSize: 15, lineHeight: 22, color: c.text, flexShrink:1 }, heading: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -.8 }, eyebrow: { fontSize: 10, letterSpacing: 1.4, fontWeight: '700', color: c.primary }, button: { minHeight: 48, borderRadius: 99, backgroundColor: c.primary, paddingVertical: 13, paddingHorizontal: 22, justifyContent: 'center' }, chip: { alignSelf: 'flex-start', backgroundColor: c.lavender, borderRadius: 99, paddingVertical: 4, paddingHorizontal: 12 }, avatar: { height: 44, width: 44, borderRadius: 22, backgroundColor: c.lavender, alignItems: 'center', justifyContent: 'center' }, input: { minHeight: 48, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 15 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, choice: { borderWidth: 1, borderColor: c.border, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 99 }, selected: { borderColor: c.primary, backgroundColor: c.lavender }, panel: { borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 20, gap: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink:1 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, gameCard: { borderRadius: 24, overflow: 'hidden', backgroundColor: c.surface, minHeight: 320 }, cardContent: { minHeight: 320, padding: 18, justifyContent: 'space-between', gap: 40 }, scrim: { flex: 1, backgroundColor: '#0009', justifyContent: 'center', padding: 24 }, dialog: { backgroundColor: c.background, borderRadius: 24, padding: 26, gap: 20 } });
