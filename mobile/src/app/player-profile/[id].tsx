import {useEffect,useState} from 'react';
import {Image} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {RequirePlayer} from '../../live';
import {useGames} from '../../store';
import {Panel,Screen,T} from '../../components/maidaan-ui';
type PublicPlayer={id:string;name:string;bio:string;avatarUrl:string|null;sports:{sport:string;skill:string}[]};
function Profile(){const {id}=useLocalSearchParams<{id:string}>();const {api}=useGames();const [profile,setProfile]=useState<PublicPlayer|null>(null),[error,setError]=useState('');useEffect(()=>{let active=true;api.request<PublicPlayer>('/players/'+id).then(p=>{if(active)setProfile(p)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[api,id]);return <Screen title={profile?.name||'Player profile'} back={()=>router.back()}>{error?<T>{error}</T>:!profile?<T>Loading profile...</T>:<Panel>{profile.avatarUrl&&<Image accessibilityLabel={profile.name} source={{uri:profile.avatarUrl}} style={{width:80,height:80,borderRadius:40}}/>}<T>{profile.bio}</T>{profile.sports.map(s=><T key={s.sport}>{s.sport} / {s.skill}</T>)}</Panel>}</Screen>}
export default function Route(){return <RequirePlayer><Profile/></RequirePlayer>}
