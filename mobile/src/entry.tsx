import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { accountEntries, welcomeSubtitle, webPortalLogin, canPreview, type Portal } from '../../shared/demo-auth';
import { useGames } from './store';
import { configured, demoAuth, accountAuth } from './services';
import { Button, Chip, Field, Icon, Screen, T, s } from './components/maidaan-ui';
import { colors } from '../../shared/tokens';

export function WelcomeScreen(){return <Screen>
  <T style={{fontSize:34,fontWeight:'800',letterSpacing:-1.5}}>maidaan<T style={{fontSize:34,color:colors.primary}}>.</T></T>
  <Image source={require('../assets/community-football.png')} accessibilityLabel="Friends playing football together" style={{width:'100%',height:280,borderRadius:24}}/>
  <T style={{fontSize:36,lineHeight:43,fontWeight:'700'}}>Your people.{'\n'}Your game.{'\n'}Your <T style={{fontSize:36,lineHeight:43,color:colors.primary,fontWeight:'700'}}>Maidaan.</T></T>
  <T muted>{welcomeSubtitle}</T>
  {accountEntries.map(entry=><Pressable key={entry.role} accessibilityRole="button" onPress={()=>router.push(entry.role==='player'?'/player/login':entry.role==='hub'?'/hub/login':'/admin/login')}
    style={({pressed})=>({padding:20,borderRadius:16,borderWidth:1,borderColor:entry.role==='player'?colors.primary:colors.border,backgroundColor:entry.role==='player'?colors.primary:colors.surface,opacity:pressed?.6:1})}>
    <View style={s.row}><View style={{flex:1,gap:6}}><T style={{fontWeight:'700',color:entry.role==='player'?'white':colors.primary}}>{entry.title}</T><T style={{fontSize:13,color:entry.role==='player'?'white':colors.muted}}>{entry.subtitle}</T></View><Icon name="arrow" color={entry.role==='player'?'white':colors.primary}/></View>
  </Pressable>)}
</Screen>}

export function AuthScreen({portal:propPortal}:{portal?:Portal}){
  const params=useLocalSearchParams<{mode?:string}>();const portal=propPortal||'player';
  const {demoEnabled,demoSession,logout}=useGames();
  const signup=false;
  const [localDemo,setLocalDemo]=useState(demoEnabled&&!signup),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState('');
  const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(){setBusy(true);setMessage('');try{
    if(!username.trim()||!password)throw new Error('Enter your '+(localDemo?'username':'email')+' and password.');
    if(localDemo)await demoAuth.login(portal,username,password);
    else {
      if(!configured)throw new Error('Application API is not configured.');
      if(signup&&(!name.trim()||password.length<8))throw new Error('Enter your name and a password of at least 8 characters.');
      await demoAuth.logout();
      await accountAuth.login(username.trim(),password);
    }
    if(portal==='player')router.replace(signup?'/preferences':'/discover');else router.replace({pathname:'/portal',params:{role:portal}});
  }catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
  if(params.mode==='signup'&&portal==='player')return <Redirect href="/signup"/>;
  return <Screen back={()=>router.replace('/welcome')} eyebrow={portal==='hub'?'VENUE OWNER LOGIN':portal==='admin'?'ADMIN LOGIN':'PLAYER LOGIN'} title={signup?'Join your people.':'Welcome back.'}>
    {localDemo&&<Chip>Local development preview</Chip>}
    {!localDemo&&!configured&&<T>Real sign in is not configured. See docs/SETUP.md.</T>}
    {signup&&<Field label="Full name" value={name} onChangeText={setName} maxLength={80}/>}
    <Field label={localDemo?'Username':'Username or email'} value={username} onChangeText={setUsername} autoCapitalize="none" keyboardType={'default'}/>
    <Field label="Password" secureTextEntry={!show} autoCapitalize="none" value={password} onChangeText={setPassword} maxLength={128}/>
    <Button secondary onPress={()=>setShow(!show)}>{show?'Hide password':'Show password'}</Button>
    <Button disabled={busy||(!localDemo&&!configured)} onPress={submit}>{busy?'Signing in...':signup?'Create Player account':'Login'}</Button>
    {message&&<T style={{color:colors.danger}}>{message}</T>}
    {demoEnabled&&!signup&&<Button secondary onPress={()=>{setLocalDemo(!localDemo);setUsername('');setPassword('');setMessage('')}}>{localDemo?'Use account sign in':'Use local demo login'}</Button>}
    {portal==='hub'&&<Button secondary onPress={()=>{try{const url=webPortalLogin(process.env.EXPO_PUBLIC_WEB_URL,'hub').replace('/hub/login','/hub/signup');void Linking.openURL(url).catch(e=>setMessage(e.message))}catch(e){setMessage((e as Error).message)}}}>Register your venue on web</Button>}
    {portal==='player'&&<Button secondary onPress={()=>router.push('/signup')}>{signup?'Already playing? Sign in':'Create a real Player account'}</Button>}
    {demoSession&&<Button secondary onPress={()=>logout().then(()=>router.replace('/welcome')).catch(e=>setMessage(e.message))}>Logout</Button>}
  </Screen>;
}

export function PortalHandoff(){
  const params=useLocalSearchParams<{role?:string}>();const {userId,authReady,demoSession,logout}=useGames();
  const role=params.role==='admin'?'admin':'hub';const [message,setMessage]=useState('');
  const allowed=!!userId&&(!demoSession||canPreview(demoSession,role));
  let url='',urlError='';try{url=webPortalLogin(process.env.EXPO_PUBLIC_WEB_URL,role)}catch(e){urlError=(e as Error).message}
  const attempted=useRef('');
  const openPortal=useCallback(()=>{if(!url)return;void Linking.openURL(url).then(()=>setMessage('Web login opened. Sign in there separately; no session or password is transferred.')).catch(e=>setMessage(e.message));},[url]);
  useEffect(()=>{const key=role+':'+userId;if(authReady&&allowed&&url&&attempted.current!==key){attempted.current=key;openPortal();}},[authReady,allowed,role,userId,url,openPortal]);
  if(!authReady)return <Screen title="Restoring session..."/>;
  if(!userId)return <Redirect href={role==='admin'?'/admin/login':'/hub/login'}/>;
  if(!allowed)return <Screen title="Access required"><T>This preview belongs to a different account.</T><Button onPress={()=>router.replace('/welcome')}>Choose an account</Button></Screen>;
  return <Screen back={()=>router.replace('/welcome')} title={role==='admin'?'Admin web portal':'Venue owner web portal'}><T>The full dashboard is available in the web app. No mobile dashboard is simulated here.</T><Button onPress={openPortal}>Open web login</Button>{(message||urlError)&&<T>{message||urlError}</T>}<Button secondary onPress={()=>logout().then(()=>router.replace('/welcome')).catch(e=>setMessage(e.message))}>Logout</Button></Screen>;
}
