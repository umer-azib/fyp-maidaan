import {useEffect,useState} from 'react';
import {useGames} from './store';
import {Button,Dialog} from './ui';
import {Loading} from './loading';
import {pakistanTime} from '../../shared/account-client';
import type {WeatherReport} from '../../shared/assistant';
export function WeatherCard({gameId}:{gameId?:string}){
 const {api,demoSession}=useGames();const [data,setData]=useState<WeatherReport|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[dismissed,setDismissed]=useState(false);
 useEffect(()=>{let active=true;if(demoSession)return;api.request<WeatherReport>('/weather'+(gameId?'?gameId='+gameId:'')).then(result=>{if(active){setData(result);setError('')}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[api,demoSession,gameId,retry]);
 if(demoSession)return null;const p=data?.point;const key='maidaan:weather-warning:'+gameId+':'+p?.at;const warn=!!gameId&&!!data?.warning&&!dismissed&&!sessionStorage.getItem(key);
 return <section className="panel weather-card"><div className="row between"><div><p className="eyebrow violet">{gameId?'GAME FORECAST':'LAHORE WEATHER'}</p><h3>{data?.location||'Checking the forecast'}</h3></div>{p&&<strong className="weather-temperature">{Math.round(p.temperatureC)}<span>&deg;C</span></strong>}</div>{error?<><p className="muted" role="status">{error}</p><Button secondary onClick={()=>setRetry(n=>n+1)}>Retry weather</Button></>:!data?<Loading label="Loading weather..."/>:p?<><p>{p.conditions}</p><div className="weather-facts"><span>Rain {p.rainProbability===null?'unavailable':p.rainProbability+'%'}</span><span>Wind {p.windKph} km/h</span></div><small>{pakistanTime(p.at)} / Pakistan time</small></>:<p>{data.message}</p>}<small className="weather-attribution"><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo</a>{data&&' / Updated '+pakistanTime(data.fetchedAt)}</small>{warn&&<Dialog title="A quick weather heads-up" onClose={()=>{sessionStorage.setItem(key,'dismissed');setDismissed(true)}}><p>{data!.warning}</p><p className="muted">{p&&pakistanTime(p.at)}. Forecasts can change.</p><Button onClick={()=>{sessionStorage.setItem(key,'dismissed');setDismissed(true)}}>Got it</Button></Dialog>}</section>;
}
