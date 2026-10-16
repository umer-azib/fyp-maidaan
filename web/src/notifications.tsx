import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router';
import {useGames} from './store';
import {notificationStreamUrl} from './services';
import {Icon,Button} from './ui';
import {Loading} from './loading';
import {toast} from './feedback-events';
import {pakistanTime} from '../../shared/account-client';
export type NotificationItem={id:string;type:string;gameId:string|null;bookingId:string|null;title:string;message:string;createdAt:string;readAt:string|null};
export function NotificationBell({area='player'}:{area?:'player'|'hub'|'admin'}){
 const {api,userId,demoSession,refresh,ensureGame}=useGames();const [items,setItems]=useState<NotificationItem[]>([]),[unread,setUnread]=useState(0),[open,setOpen]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true);const cursor=useRef('0');
 useEffect(()=>{if(!userId||demoSession)return;let active=true,source:EventSource|undefined,healthy=false,working=false;
 const updateGame=async()=>{await refresh();if(!active)return;const path=/^\/player\/games\/([a-f0-9-]{36})/.exec(window.location.pathname);if(path)await ensureGame(path[1]).catch(()=>{});window.dispatchEvent(new Event('maidaan:live-update'));};
 const merge=(rows:NotificationItem[],notify:boolean)=>{if(!active)return;const fresh=rows.filter(n=>BigInt(n.id)>BigInt(cursor.current));if(rows.length)cursor.current=rows.reduce((a,n)=>BigInt(n.id)>BigInt(a)?n.id:a,cursor.current);setItems(previous=>[...new Map([...previous,...rows].map(n=>[n.id,n])).values()].sort((a,b)=>BigInt(a.id)>BigInt(b.id)?-1:1).slice(0,30));if(fresh.length){if(notify)toast(fresh.at(-1)!.title,'info');void updateGame();}};
 const load=async(notify=false)=>{if(working)return;working=true;try{const result=await api.request<{data:NotificationItem[];unreadCount:number}>('/notifications');if(!active)return;merge(result.data,notify);setUnread(result.unreadCount);setError('');}catch(e){if(active)setError((e as Error).message)}finally{working=false;if(active)setLoading(false)}};
 void load().then(()=>{if(!active)return;source=new EventSource(notificationStreamUrl(cursor.current),{withCredentials:true});source.addEventListener('ready',()=>{healthy=true});source.addEventListener('notifications',event=>{healthy=true;const payload=JSON.parse((event as MessageEvent).data) as {data:NotificationItem[];unreadCount:number};merge(payload.data,true);if(active)setUnread(payload.unreadCount)});source.addEventListener('heartbeat',event=>{healthy=true;if(active)setUnread(JSON.parse((event as MessageEvent).data).unreadCount)});source.onerror=()=>{healthy=false};});
 const fallback=setInterval(()=>{if(!healthy)void load(true)},15000);const changed=()=>void load(false);window.addEventListener('focus',changed);window.addEventListener('maidaan:data-changed',changed);
 return()=>{active=false;source?.close();clearInterval(fallback);window.removeEventListener('focus',changed);window.removeEventListener('maidaan:data-changed',changed);cursor.current='0'};
 },[api,userId,demoSession,refresh,ensureGame]);
 async function read(id?:string){try{const result=await api.request<{unreadCount:number}>(id?'/notifications/'+id+'/read':'/notifications/read-all',id?'PATCH':'POST',{});setUnread(result.unreadCount);setItems(rows=>rows.map(n=>!id||id===n.id?{...n,readAt:new Date().toISOString()}:n));}catch(e){setError((e as Error).message)}}
 if(!userId||demoSession)return null;
 return <div className="notification-bell"><button className="icon-button" aria-label={'Notifications, '+unread+' unread'} aria-expanded={open} onClick={()=>setOpen(!open)}><Icon name="bell"/>{unread>0&&<span className="unread-count">{unread>99?'99+':unread}</span>}</button>{open&&<section className="notification-panel panel" aria-label="Recent notifications"><div className="row between"><h2>Notifications</h2><Button secondary onClick={()=>void read()} disabled={!unread}>Mark all read</Button></div>{loading&&<Loading label="Loading notifications..."/>}{error&&<p role="alert" className="error">{error}</p>}{!loading&&!error&&!items.length&&<p>No notifications yet.</p>}{items.map(n=><Link key={n.id} className={'notification-item '+(!n.readAt?'unread':'')} to={n.gameId?'/player/games/'+n.gameId:area==='hub'?'/hub/bookings':'/player/bookings'} onClick={()=>{void read(n.id);setOpen(false)}}><strong>{n.title}</strong><p>{n.message}</p><small>{pakistanTime(n.createdAt)}</small></Link>)}</section>}</div>;
}
