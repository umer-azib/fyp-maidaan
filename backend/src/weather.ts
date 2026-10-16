import {z} from 'zod';
import {HttpError} from './data';
import type {WeatherPoint,WeatherReport} from '../../shared/assistant';

const point=z.object({time:z.number(),temperature_2m:z.number(),weather_code:z.number(),wind_speed_10m:z.number()});
const response=z.object({current:point,hourly:z.object({time:z.array(z.number()),temperature_2m:z.array(z.number().nullable()),precipitation_probability:z.array(z.number().nullable()),weather_code:z.array(z.number().nullable()),wind_speed_10m:z.array(z.number().nullable())})});
export function weatherCondition(code:number){if(code===0)return 'Clear sky';if(code<=3)return 'Partly cloudy';if(code===45||code===48)return 'Fog';if(code>=51&&code<=57)return 'Drizzle';if(code>=61&&code<=67)return 'Rain';if(code>=71&&code<=77)return 'Snow';if(code>=80&&code<=82)return 'Rain showers';if(code>=85&&code<=86)return 'Snow showers';if(code>=95)return 'Thunderstorm';return 'Conditions unavailable'}
export function weatherService(request:typeof fetch=fetch){
 const cache=new Map<string,{until:number;data:z.infer<typeof response>;fetchedAt:string}>();
 return async(latitude:number,longitude:number,at?:string,location='Lahore',outdoor=false):Promise<WeatherReport>=>{
  const key=latitude.toFixed(4)+','+longitude.toFixed(4);let cached=cache.get(key);
  if(!cached||cached.until<Date.now()){
   const url=new URL('https://api.open-meteo.com/v1/forecast');url.search=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),current:'temperature_2m,weather_code,wind_speed_10m',hourly:'temperature_2m,precipitation_probability,weather_code,wind_speed_10m',forecast_days:'16',timezone:'Asia/Karachi',timeformat:'unixtime',wind_speed_unit:'kmh'}).toString();
   try{const res=await request(url,{signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error();cached={data:response.parse(await res.json()),until:Date.now()+600000,fetchedAt:new Date().toISOString()};if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,cached)}catch{throw new HttpError(503,'WEATHER_UNAVAILABLE','Weather is temporarily unavailable. Please try again later.')}
  }
  const {current,hourly}=cached.data;const target=at?Date.parse(at)/1000:current.time;const index=hourly.time.findIndex(t=>t<=target&&t+3600>target);let selected:WeatherPoint|null=null;
  if(!at)selected={at:new Date(current.time*1000).toISOString(),temperatureC:current.temperature_2m,windKph:current.wind_speed_10m,conditions:weatherCondition(current.weather_code),rainProbability:index<0?null:hourly.precipitation_probability[index]??null};
  else if(index>=0&&hourly.temperature_2m[index]!=null&&hourly.wind_speed_10m[index]!=null&&hourly.weather_code[index]!=null)selected={at:new Date(hourly.time[index]*1000).toISOString(),temperatureC:hourly.temperature_2m[index]!,windKph:hourly.wind_speed_10m[index]!,conditions:weatherCondition(hourly.weather_code[index]!),rainProbability:hourly.precipitation_probability[index]??null};
  const risks=outdoor&&selected?[...(selected.temperatureC>=38?['High heat expected. Plan shade, water and breaks.']:[]),...((selected.rainProbability??0)>=50||/Rain|Thunderstorm/.test(selected.conditions)?['Rain may affect outdoor play. Check with your host before travelling.']:[])]:[];
  return {source:'Open-Meteo',latitude,longitude,timezone:'Asia/Karachi',fetchedAt:cached.fetchedAt,location,point:selected,warning:risks.join(' ')||null,message:selected?'Forecast estimates may change.':'The requested time is outside the available forecast window.'};
 };
}
