import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { accountAuth, api, demoAuth } from './services';
import { Button, Choices, Field, Panel, Screen, T } from './components/maidaan-ui';
import { sports } from '../../shared/tokens';
import { formats } from '../../shared/formats';
import type { Area, City, ProfileInput, SportProfile } from '../../shared/contracts';
import { encodeImage } from '../../shared/account-client';

export function SignupScreen(){
 const [step,setStep]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[created,setCreated]=useState(false);
 const [account,setAccount]=useState({name:'',username:'',email:'',phone:'',password:'',confirmation:''});
 const [profile,setProfile]=useState<ProfileInput>({name:'',username:null,bio:'',cityId:'lahore',areaId:null,avatarPath:null,sports:[]});
 const [cities,setCities]=useState<City[]>([]),[areas,setAreas]=useState<Area[]>([]),[photo,setPhoto]=useState<{uri:string;mime:string}|null>(null),[dob,setDob]=useState('');
 const [days,setDays]=useState<string[]>([]),[from,setFrom]=useState('18:00'),[to,setTo]=useState('21:00');
 useEffect(()=>{let active=true;if(demoAuth.getSnapshot().session)return;api.locations().then(x=>{if(active){setCities(x.cities);setAreas(x.areas)}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[]);
 async function pick(){try{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.8});if(!result.canceled)setPhoto({uri:result.assets[0].uri,mime:result.assets[0].mimeType||'image/jpeg'})}catch(e){setError((e as Error).message)}}
 async function gps(){try{const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw new Error('Location permission declined. Choose your area manually.');const current=await Location.getCurrentPositionAsync({});const addresses=await Location.reverseGeocodeAsync(current.coords);const match=cities.find(c=>c.name.toLowerCase()===addresses[0]?.city?.toLowerCase());if(match)setProfile({...profile,cityId:match.id,areaId:null});else setError('Your city is not in the current rollout. Choose a supported city manually.')}catch(e){setError((e as Error).message)}}
 function changeSport(value:SportProfile){setProfile({...profile,sports:[...profile.sports.filter(x=>x.sport!==value.sport),value]})}
 async function next(){setError('');if(step===0&&(!account.name.trim()||!/^[a-z0-9_]{3,30}$/.test(account.username)||!account.email.includes('@')||account.password.length<10||account.password!==account.confirmation)){setError('Complete your name, username, email and matching passwords of at least 10 characters.');return;}if(step<3){setStep(step+1);return;}setBusy(true);try{
  await demoAuth.logout();
  if(!created){await accountAuth.register({...account,phone:account.phone||undefined,profile:{bio:profile.bio,cityId:profile.cityId,areaId:profile.areaId,avatarPath:null,sports:profile.sports},dateOfBirth:dob||undefined,preferredAreas:profile.areaId?[profile.areaId]:[],availability:days.map(d=>({dayOfWeek:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(d),startsAt:from,endsAt:to}))});setCreated(true);}
  if(photo){const bytes=new Uint8Array(await (await fetch(photo.uri)).arrayBuffer());const uploaded=await api.request<{path:string}>('/me/avatar','POST',{mime:photo.mime,base64:encodeImage(bytes)});await api.saveProfile({...profile,name:account.name,username:account.username,avatarPath:uploaded.path});setPhoto(null);}
  router.replace('/discover');
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 if(demoAuth.getSnapshot().session)return <Screen title="Use a real account"><T>Logout of the preview before registering.</T><Button onPress={()=>demoAuth.logout().then(()=>router.replace('/welcome'))}>Logout of preview</Button></Screen>;
 return <Screen back={()=>step&&!created?setStep(step-1):router.replace('/player/login')} eyebrow={'PLAYER SIGNUP / STEP '+(step+1)+' OF 4'} title={['Account details','Your profile','Your sports','Ready to play?'][step]}>
 <View style={{height:4,borderRadius:2,backgroundColor:'#e9ddf5'}}><View style={{height:4,borderRadius:2,backgroundColor:'#7847ba',width:((step+1)*25)+'%' as `${number}%`}}/></View>
 {step===0&&<>{(['name','username','email','phone','password','confirmation'] as const).map(key=><Field key={key} label={({name:'Full name',username:'Username',email:'Email',phone:'Pakistani mobile (optional)',password:'Password',confirmation:'Confirm password'})[key]} value={account[key]} autoCapitalize={key==='name'?'words':'none'} secureTextEntry={key==='password'||key==='confirmation'} onChangeText={value=>setAccount({...account,[key]:value})}/>)}</>}
 {step===1&&<>{photo&&<Image source={{uri:photo.uri}} style={{width:88,height:88,borderRadius:44}}/>}<Button secondary onPress={pick}>Choose profile photo</Button><Field label="Short bio" multiline value={profile.bio} onChangeText={bio=>setProfile({...profile,bio})}/><T>City</T><Choices values={cities.length?cities.map(c=>c.name):['Lahore']} value={cities.find(c=>c.id===profile.cityId)?.name||'Lahore'} onChange={name=>setProfile({...profile,cityId:cities.find(c=>c.name===name)?.id||'lahore',areaId:null})}/><T>Preferred area</T><Choices values={['All areas',...areas.filter(a=>a.cityId===profile.cityId).map(a=>a.name)]} value={areas.find(a=>a.id===profile.areaId)?.name||'All areas'} onChange={name=>setProfile({...profile,areaId:areas.find(a=>a.name===name&&a.cityId===profile.cityId)?.id||null})}/><Field label="Date of birth (optional YYYY-MM-DD)" value={dob} onChangeText={setDob}/><Button secondary onPress={gps}>Use my location</Button></>}
 {step===2&&<>{sports.map(s=>{const selected=profile.sports.find(x=>x.sport===s);return <Panel key={s}><Button secondary={!selected} onPress={()=>setProfile({...profile,sports:selected?profile.sports.filter(x=>x.sport!==s):[...profile.sports,{sport:s,skill:'Intermediate',positions:[],formats:[]}]})}>{s}</Button>{selected&&<><Choices values={['Beginner','Intermediate','Advanced','All levels']} value={selected.skill} onChange={skill=>changeSport({...selected,skill:skill as SportProfile['skill']})}/><T>Preferred formats</T><Choices values={formats[s]} value={selected.formats} onChange={f=>changeSport({...selected,formats:selected.formats.includes(f)?selected.formats.filter(x=>x!==f):[...selected.formats,f]})}/>{s==='Football'&&<Field label="Positions (comma separated)" value={selected.positions.join(',')} onChangeText={text=>changeSport({...selected,positions:text.split(',').map(x=>x.trim())})}/>}</>}</Panel>})}<T>Preferred days</T><Choices values={['Sun','Mon','Tue','Wed','Thu','Fri','Sat']} value={days} onChange={day=>setDays(days.includes(day)?days.filter(x=>x!==day):[...days,day])}/><Field label="From (Pakistan time HH:MM)" value={from} onChangeText={setFrom}/><Field label="Until (HH:MM)" value={to} onChangeText={setTo}/></>}
 {step===3&&<Panel><T style={{fontSize:22,fontWeight:'700'}}>{account.name}</T><T>@{account.username}</T><T>{account.email}</T><T>{profile.sports.map(x=>x.sport+' / '+x.skill).join(', ')}</T><T muted>Email remains unverified. Your profile and preferences will be saved to your application account.</T></Panel>}
 {error&&<T style={{color:'#b33345'}}>{error}</T>}<Button disabled={busy} onPress={next}>{busy?'Saving...':step===3?created?'Retry remaining setup':'Create account':'Continue'}</Button>
 </Screen>
}
