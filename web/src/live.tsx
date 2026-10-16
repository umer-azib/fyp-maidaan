import {VenueExplorer} from './maps';
import {Loading} from './loading';
import {useDataRevision} from './use-data-revision';
import { Reviews } from './social';
import { BookingPicker } from './bookings';
import { encodeImage } from '../../shared/account-client';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useGames } from './store';
import { configured, accountAuth, demoAuth } from './services';
import { Avatar, Button, Chip, Icon } from './ui';
import { profileCompleteness, type VenueDetail } from '../../shared/contracts';
import { sports } from '../../shared/tokens';
import { canPreview, portalHome, type Portal } from '../../shared/demo-auth';

export function DataStatus() {
  const { error, loading, refresh }=useGames();
  return <>{loading&&<Loading label="Loading Maidaan..."/>}{error&&<div role="alert" className="panel"><p className="error">{error}</p><Button secondary onClick={()=>void refresh()}>Retry</Button></div>}</>;
}
export function AuthForm({signup=false,onSuccess,portal='player'}:{signup?:boolean;onSuccess:()=>void;portal?:Portal}) {
 const {demoEnabled}=useGames();const [localDemo,setLocalDemo]=useState(false);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false);
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{
  if(!email.trim()||!password)throw new Error('Enter your '+(localDemo?'username':'username or email')+' and password.');
  if(localDemo){await demoAuth.login(portal,email,password);onSuccess();return;}
  if(!configured)throw new Error('Application API is not configured.');
  await demoAuth.logout();
  if(signup)throw new Error('Use the guided account signup.');
  await accountAuth.login(email,password);onSuccess();
 }catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
 return <><form onSubmit={submit} className="auth-form">
  {localDemo&&<Chip>Local development preview</Chip>}
  {!localDemo&&!configured&&<p role="alert" className="error">Real sign in is not configured. See docs/SETUP.md.</p>}
  <label>{localDemo?'Username':'Username or email'}<input required type="text" autoComplete={localDemo?'username':'username or email'} autoCapitalize="none" value={email} onChange={e=>setEmail(e.target.value)}/></label>
  <label>Password<div className="password-field"><input aria-label="Password" required type={show?'text':'password'} minLength={signup?8:1} maxLength={128} autoComplete={signup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={show?'Hide password':'Show password'} aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></label>
  <Button loading={busy} disabled={busy||(!localDemo&&!configured)}>{busy?'Signing in...':signup?'Create Player account':'Login'}</Button>
  {message&&<p role="alert" className="error">{message}</p>}
 </form>{demoEnabled&&!signup&&<button className="text-link" onClick={()=>{setLocalDemo(!localDemo);setEmail('');setPassword('');setMessage('')}}>{localDemo?'Use account sign in':'Use local demo login'}</button>}</>;
}
export function LoginPage({portal='player'}:{portal?:Portal}) {
 const navigate=useNavigate();const {demoSession,logout}=useGames();const [error,setError]=useState('');const signup=false;
 return <div className="welcome-page login-page"><div className="welcome-photo"><img src="/community-football.png" alt="Community football"/><Link className="brand" to="/welcome">maidaan.</Link></div><section><Link className="text-link" to="/welcome">Back</Link><p className="eyebrow violet">{portal==='player'?'PLAYER':portal==='hub'?'VENUE OWNER':'ADMINISTRATOR'} LOGIN</p><h1>{signup?'Join your people.':'Welcome back.'}</h1>
 <AuthForm key={String(signup)} signup={signup} portal={portal} onSuccess={()=>navigate(portalHome(portal),{replace:true})}/>
 {portal!=='admin'&&<Link className="text-link" to={'/'+portal+'/signup'}>{portal==='hub'?'Register your venue':'Create a Player account'}</Link>}
 {demoSession&&<Button secondary onClick={()=>logout().then(()=>navigate('/welcome',{replace:true})).catch(e=>setError(e.message))}>Logout</Button>}{error&&<p role="alert">{error}</p>}
 </section></div>;
}
export function PortalGate({area,children}:{area:'hub'|'admin';children:ReactNode}) {
 const {userId,authReady,demoSession,api}=useGames();const location=useLocation();
 const [state,setState]=useState({path:'',userId:'',allowed:false,message:''});
 useEffect(()=>{let active=true;if(userId&&!demoSession)api.request('/'+area+'/access').then(()=>{if(active)setState({path:location.pathname,userId,allowed:true,message:''})}).catch(e=>{if(active)setState({path:location.pathname,userId,allowed:false,message:e.message})});return()=>{active=false}},[userId,area,location.pathname,demoSession,api]);
 if(!authReady)return <p className="empty">Restoring session...</p>;
 if(demoSession)return canPreview(demoSession,area)?children:<AccessDenied/>;
 if(!userId)return <Navigate to={'/'+area+'/login'} replace/>;
 if(state.path!==location.pathname||state.userId!==userId)return <p className="empty">Checking workspace access...</p>;
 if(!state.allowed)return <AccessDenied message={state.message}/>;return children;
}
export function AccessDenied({message='This demo account cannot open this workspace.'}:{message?:string}){return <div className="empty"><h1>Access required</h1><p role="alert">{message}</p><Link className="button secondary" to="/welcome">Choose an account</Link></div>}
export function PlayerGate({children}:{children:ReactNode}) {
 const {userId,authReady,demoSession}=useGames();if(!authReady)return <p>Restoring session...</p>;if(demoSession&&!canPreview(demoSession,'player'))return <AccessDenied/>;if(!userId)return <Navigate to="/player/login" replace/>;return children;
}
export function SessionTools({area='player'}:{area?:Portal}){
 const {demoSession,logout,myGames}=useGames();const navigate=useNavigate();const [error,setError]=useState('');
 return <><span className="demo-badge">{demoSession?'LOCAL DEMO | SAMPLE DATA':area==='hub'?'VENUE OWNER ACCOUNT':area==='admin'?'ADMINISTRATOR ACCOUNT':'PLAYER ACCOUNT'}</span><Button secondary onClick={()=>logout().then(()=>navigate('/welcome',{replace:true})).catch(e=>setError(e.message))}>Logout</Button>{error&&<p role="alert">{error}</p>}{demoSession?.role==='player'&&<span className="sr-only">Sample history: {myGames.filter(g=>g.status==='completed').length} completed games</span>}</>;
}
export function GameLoader({children}:{children:ReactNode}) {
 const revision=useDataRevision();const {id}=useParams();const {ensureGame,userId}=useGames();const [state,setState]=useState({id:'',error:''});
 useEffect(()=>{let active=true;if(id&&userId)ensureGame(id).then(()=>{if(active)setState({id,error:''})}).catch(e=>{if(active)setState({id,error:e.message})});return()=>{active=false}},[id,userId,ensureGame,revision]);
 if(state.id!==id)return <p>Loading game…</p>;if(state.error)return <p role="alert" className="error">{state.error}</p>;return children;
}
export function LocationPicker(){
 const {cities,areas,location,setLocation,demoSession}=useGames();const [error,setError]=useState('');
 function gps(){setError('');if(!navigator.geolocation){setError('Location is unavailable in this browser.');return;}navigator.geolocation.getCurrentPosition(p=>setLocation({...location,latitude:p.coords.latitude,longitude:p.coords.longitude,radiusKm:20}),e=>setError(e.message),{timeout:15000,maximumAge:60000});}
 return <div className="panel location-picker"><label>City<select value={location.cityId} disabled={!cities.length} onChange={e=>setLocation({cityId:e.target.value})}>{!cities.length&&<option value="lahore">Lahore (awaiting API)</option>}{cities.map(c=><option key={c.id} value={c.id}>{c.name}, Pakistan</option>)}</select></label><label>Area<select value={location.areaId||''} onChange={e=>setLocation({...location,areaId:e.target.value||undefined,latitude:undefined,longitude:undefined})}><option value="">All areas</option>{areas.filter(a=>a.cityId===location.cityId).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><Button secondary disabled={!!demoSession} onClick={gps}><Icon name="pin"/>{location.latitude===undefined?'Use GPS':'Update GPS (20 km)'}</Button>{location.latitude!==undefined&&<button className="text-link" onClick={()=>setLocation({cityId:location.cityId,areaId:location.areaId})}>Clear GPS</button>}{error&&<p role="alert" className="error">{error}</p>}</div>;
}
export function DiscoveryLinks(){return <div className="sport-tabs"><Link className="button secondary" to="/player/venues">Find Venues</Link><Link className="button secondary" to="/player/games">Find Open Games</Link><Link className="text-link" to="/player/map">Map</Link></div>}
export function VenueDiscovery(){return <VenueExplorer/>}
export function VenuePage(){
 const {id}=useParams();const {api,demoSession}=useGames();const [venue,setVenue]=useState<VenueDetail|null>(null),[error,setError]=useState('');
 const [query]=useSearchParams();const [courtId,setCourtId]=useState(()=>query.get('court')||'');
 useEffect(()=>{let active=true;if(id)api.venue(id).then(v=>{if(active)setVenue(v)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[id,api]);

 if(error)return <p className="error" role="alert">{error}</p>;if(!venue)return <p>Loading venue…</p>;
 return <><Link to="/player" className="text-link">Back to venues</Link><h1>{venue.name}</h1><Link className="text-link" to={'/player/map?venue='+venue.id}>View on Map</Link><Chip>{venue.developmentFixture?'Development fixture':venue.verified?'Verified venue':'Discovery only — no verified availability'}</Chip>{!venue.photos.length&&<img className="venue-cover" src="/venue-fallback.svg" alt="Sports illustration, not a photograph of this venue"/>}<div className="game-grid">{venue.photos.filter(url=>url.startsWith('https://')).map(url=><img key={url} src={url} alt={venue.name} style={{width:'100%',height:240,objectFit:'cover',borderRadius:24}}/>)}</div><p>{venue.description}</p><p>{venue.address}</p><p className="muted">{venue.latitude}, {venue.longitude}</p>{venue.phone&&<p><a href={'tel:'+venue.phone.replace(/[^+\d]/g,'')}>{venue.phone}</a></p>}{!demoSession&&<a className="text-link" target="_blank" rel="noreferrer" href={'https://www.google.com/maps/dir/?api=1&destination='+venue.latitude+','+venue.longitude}>Open directions</a>}<p>{venue.facilities.join(' · ')}</p>{venue.source==='directory'&&<section className="panel"><h2>Real public location. FYP management only.</h2><p>This business has not verified ownership or partnered with Maidaan. Booking inventory is unavailable here.</p><p>{venue.directory?.coordinateBasis}</p>{venue.directory?.sources.map(url=><p key={url}><a className="text-link" href={url} target="_blank" rel="noreferrer">Listing source</a></p>)}</section>}<h2>Individual courts</h2><div className="game-grid">{venue.courts.map(c=><div className="panel" key={c.id}><Chip>{c.sport}</Chip><h3>{c.name}</h3>{c.photos?.map(url=><img className="announcement-image" src={url} key={url} alt={c.name}/>)}{venue.bookingEnabled?<Button secondary onClick={()=>{setCourtId(c.id)}}>Choose court and time</Button>:<p>FYP court configuration only / not public booking inventory.</p>}</div>)}</div>{!venue.courts.length&&<p>No courts or schedules have been published.</p>}{venue.bookingEnabled&&courtId&&venue.courts.some(c=>c.id===courtId)&&<BookingPicker key={courtId+query.toString()} courtId={courtId} initialDate={query.get('date')||undefined} suggestedTime={query.get('time')||undefined}/>}<Reviews venueId={venue.id}/><section className="invitation"><div><h2>Already arranged a court elsewhere?</h2><p>Create an open game with an explicitly unverified external booking.</p></div><Link className="button secondary" to="/player/create">Recruit players</Link></section></>;
}
export function ProfilePanel(){
 const {profile,editProfile,saveProfile,location,userId,demoSession,logout,myGames,cities,areas,api}=useGames();const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState<string|null>(null);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 if(!profile)return <><DataStatus/><p role="status">Your profile has not loaded yet. Use Retry above if loading failed.</p></>;
 async function save(e:FormEvent){e.preventDefault();setBusy(true);try{await saveProfile();setMessage('Profile saved.')}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
 async function photo(file?:File){if(demoSession){setMessage('Photo uploads are disabled in local preview.');return;}if(!file||!userId)return;setBusy(true);try{if(file.size>5242880||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPEG, PNG or WebP image under 5 MB.');setPreview(URL.createObjectURL(file));const result=await api.request<{path:string}>('/me/avatar','POST',{mime:file.type,base64:encodeImage(new Uint8Array(await file.arrayBuffer()))});const path=result.path;await saveProfile({...profile!,avatarPath:path});setPreview(null);setMessage('Profile photo updated successfully.')}catch(e){setPreview(null);setMessage((e as Error).message)}finally{setBusy(false)}}
 return <><div className="page-head"><div><p className="eyebrow violet">ONE PLAYER. ENDLESS POSSIBILITIES.</p><h1>Your player profile.</h1></div><Chip>{profileCompleteness(profile)}% complete</Chip></div><form className="panel profile-panel" onSubmit={save}><div className="row profile-identity">{(preview||profile.avatarUrl)?<img className="avatar" src={preview||profile.avatarUrl!} alt="Your profile"/>:<Avatar name={profile.name||'Player'}/>}<h2>{profile.name||'Complete your name'}</h2></div>{'mediaWarning' in profile&&<p role="status" className="muted">{String(profile.mediaWarning)}</p>}<label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!!demoSession} onChange={e=>void photo(e.target.files?.[0])}/></label><label>Full name<input required maxLength={80} value={profile.name} onChange={e=>editProfile({name:e.target.value})}/></label><label>Username<input pattern="[a-z0-9_]{3,30}" maxLength={30} value={profile.username||''} onChange={e=>editProfile({username:e.target.value||null})}/></label><label>Bio<textarea maxLength={1000} value={profile.bio} onChange={e=>editProfile({bio:e.target.value})}/></label><LocationPicker/><Button type="button" secondary onClick={()=>editProfile({cityId:location.cityId,areaId:location.areaId||null})}>Use selected city/area in my profile</Button><p className="muted">Saved profile location: {cities.find(c=>c.id===profile.cityId)?.name||profile.cityId} / {areas.find(a=>a.id===profile.areaId)?.name||profile.areaId||'All areas'}</p><Button type="button" secondary loading={busy} disabled={busy||!profile.avatarPath||!!demoSession} onClick={async()=>{setBusy(true);try{await api.request('/me/avatar','DELETE');setPreview(null);await saveProfile({...profile!,avatarPath:null});setMessage('Profile photo removed.')}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}}>Remove photo</Button><h3>Your sports and skill levels</h3>{demoSession&&<div className="panel"><Chip>Sample history and statistics</Chip><p>{myGames.filter(g=>g.players.some(p=>p.id===userId)).length} joined | {myGames.filter(g=>g.hostId===userId).length} hosted | {myGames.filter(g=>g.status==='completed').length} completed</p><Link className="text-link" to="/player/my-games">View sample game history</Link></div>}{sports.map(s=>{const selected=profile.sports.find(p=>p.sport===s);return <div className="panel" key={s}><label className="row"><input type="checkbox" checked={!!selected} onChange={()=>editProfile({sports:selected?profile.sports.filter(p=>p.sport!==s):[...profile.sports,{sport:s,skill:'All levels',positions:[],formats:[]}]})}/>{s}</label>{selected&&<><label>Skill<select value={selected.skill} onChange={e=>editProfile({sports:profile.sports.map(p=>p.sport===s?{...p,skill:e.target.value as typeof p.skill}:p)})}>{['All levels','Beginner','Intermediate','Advanced'].map(l=><option key={l}>{l}</option>)}</select></label><label>Preferred formats (comma separated)<input value={selected.formats.join(', ')} onChange={e=>editProfile({sports:profile.sports.map(p=>p.sport===s?{...p,formats:e.target.value.split(',').map(s=>s.trim())}:p)})}/></label>{s==='Football'&&<label>Positions (comma separated)<input value={selected.positions.join(', ')} onChange={e=>editProfile({sports:profile.sports.map(p=>p.sport===s?{...p,positions:e.target.value.split(',').map(s=>s.trim())}:p)})}/></label>}</>}</div>})}<p className="muted"></p><Button loading={busy} disabled={busy}>{busy?'Saving…':'Save profile'}</Button>{message&&<p role="status">{message}</p>}<Button type="button" secondary onClick={async()=>{try{await logout()}catch(e){setMessage((e as Error).message)}}}>Sign out</Button></form></>;
}
