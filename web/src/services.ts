import {mutationFeedback,toast} from './feedback-events';
import { createApi } from '../../shared/api';
import { createAccountClient } from '../../shared/account-client';
import { createDemoAuth, demoEnabledFor } from '../../shared/demo-auth';
export const demoAuth=createDemoAuth(demoEnabledFor(import.meta.env.DEV,import.meta.env.VITE_ENABLE_DEMO_AUTH),{
 async getItem(key){return window.sessionStorage.getItem(key)},async setItem(key,value){window.sessionStorage.setItem(key,value)},async removeItem(key){window.sessionStorage.removeItem(key)},
});
export const api=createApi(import.meta.env.VITE_API_URL||'',async()=>{demoAuth.assertLiveAccess();return undefined;},'web',()=>accountAuth.invalidate(),mutationFeedback,error=>toast(error.message,'error'));
export const accountAuth=createAccountClient(api);
export const configured=!!import.meta.env.VITE_API_URL;

export const notificationStreamUrl=(after:string)=>(import.meta.env.VITE_API_URL||'').replace(/\/$/,'')+'/v1/notifications/stream?after='+encodeURIComponent(after);
