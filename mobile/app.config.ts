import type {ConfigContext,ExpoConfig} from 'expo/config';
export default ({config}:ConfigContext):ExpoConfig=>{
 if(process.env.EAS_BUILD==='true'){
  const endpoint=process.env.EXPO_PUBLIC_API_URL||'';
  let valid=false;try{const url=new URL(endpoint);valid=url.protocol==='https:'&&!['localhost','127.0.0.1','0.0.0.0','::1','[::1]'].includes(url.hostname)&&!url.hostname.endsWith('.invalid')}catch{/* Build must fail without a reachable HTTPS API configuration. */}
  if(!valid)throw new Error('Set EXPO_PUBLIC_API_URL to your reachable HTTPS Express API in the EAS preview/production environment before building. localhost cannot be used on a phone.');
 }
 return {...config,name:'Maidaan',slug:config.slug||'mobile',android:{...config.android,package:'com.maidaan.fyp'}};
};
