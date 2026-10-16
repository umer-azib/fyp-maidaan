import type {ReactNode} from 'react';
import {Avatar,Chip} from './ui';
import {pakistanTime} from '../../shared/account-client';
export type ReviewRecord={id:string;body?:string;authorName?:string;avatarUrl?:string|null;createdAt?:string;venueName?:string;rating?:number;quality?:number;sportsmanship?:number;category?:string;verified?:boolean;developmentFixture?:boolean;status?:string};
export function ReviewCard({review:r,children}:{review:ReviewRecord;children?:ReactNode}){
 const rating=r.rating||r.quality||r.sportsmanship||0;
 return <article className="panel review-card"><div className="row"><Avatar name={r.authorName||'Player'} url={r.avatarUrl}/><div><strong>{r.authorName||'Player'}</strong>{r.createdAt&&<small>{pakistanTime(r.createdAt)}</small>}</div><span className="review-stars" aria-label={rating+' out of 5'}>{'\u2605'.repeat(Math.round(rating))}{'\u2606'.repeat(5-Math.round(rating))}</span></div><p>{r.body}</p><div className="row form-actions"><Chip>{r.category||'Participation review'}</Chip>{r.verified&&<Chip>{r.developmentFixture?'Sample verified participation':'Verified participation'}</Chip>}{r.status==='hidden'&&<Chip>Hidden</Chip>}</div>{r.venueName&&<small>{r.venueName}</small>}{children}</article>;
}
