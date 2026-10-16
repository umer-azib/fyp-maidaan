export function toast(message:string,type:'success'|'error'|'info'='success'){window.dispatchEvent(new CustomEvent('maidaan:toast',{detail:{message,type}}))}
export function mutationFeedback(path:string,method:string,body:unknown,result:unknown){
 if(path==='/ai/chat')return;
 window.dispatchEvent(new CustomEvent('maidaan:data-changed',{detail:{path,method,body,result}}));
 if(path.includes('/notifications/')||path.includes('/events'))return;
 const input=body as {type?:string}|undefined,r=result as {status?:string;joinMode?:string}|undefined;
 const message=path==='/me/avatar'?(method==='DELETE'?'Profile photo removed.':'Profile photo updated successfully.'):path==='/me/profile'?'Profile updated successfully.':path==='/bookings'?(r?.status==='confirmed'?'Booking confirmed.':'Booking request sent.'):path.endsWith('/game')||path==='/games'?'Your game has been created.':input?.type==='approve'?'Player approved.':input?.type==='reject'?'Join request declined.':input?.type==='join'?(r?.joinMode==='request'?'Join request sent.':'You joined the game.'):input?.type==='leave'?'You left the game.':input?.type==='cancel'?'Cancellation saved.':path==='/auth/login'?'Welcome back.':path==='/auth/register'?'Your account has been created.':path==='/auth/logout'?'You have signed out.':'Changes saved.';
 toast(message);
}
