import {Loading} from './loading';
import { useRef, useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router';
import type { Game } from '../../shared/games';
import { dateLabel, spots, effectiveGameStatus } from '../../shared/games';
const codes: Record<string, string> = { sparkles: 'e65f', expand: 'e5d0', explore: 'e87a', map: 'e55b', add: 'e145', calendar: 'ebcc', person: 'e7fd', arrow: 'e5c8', pin: 'e55f', clock: 'e8b5', group: 'e7ef', tune: 'e429', bell:'e7f4',close: 'e5cd', check: 'e5ca', stadium: 'eb90', shield: 'e9e0', logout: 'e9ba', sports: 'ea30' };
export function Icon({ name }: {
    name: string;
}) { return <span aria-hidden="true" className="icon">{String.fromCodePoint(parseInt(codes[name] || codes.sports, 16))}</span>; }
export function Button({ children, secondary = false, loading=false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
    secondary?: boolean;loading?:boolean;
}) { return <button className={secondary ? 'button secondary' : 'button'} {...props} disabled={loading||props.disabled} aria-busy={loading}>{loading&&<Loading inline/>}{children}</button>; }
export function Chip({ children }: {
    children: ReactNode;
}) { return <span className="chip">{children}</span>; }
export function Avatar({name,url}:{name:string;url?:string|null}){const [failedUrl,setFailedUrl]=useState<string|null>(null);return url&&url!==failedUrl?<img className="avatar" src={url} alt={name} onError={()=>setFailedUrl(url)}/>:<span className="avatar" aria-label={name}>{name.split(' ').map(n=>n[0]).join('').slice(0,2)}</span>}
export function Dialog({ title, children, onClose, dismissible=true }: {
    title: string;
    children: ReactNode;
    onClose: () => void;
    dismissible?:boolean;
}) { const ref = useRef<HTMLDialogElement>(null); useEffect(() => { ref.current?.showModal(); }, []); return <dialog ref={ref} onCancel={e=>{e.preventDefault();if(dismissible)onClose()}} onClick={e => { if (dismissible && e.target === e.currentTarget)
    onClose(); }}><div className="row between"><h2>{title}</h2>{dismissible&&<button autoFocus className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button>}</div>{children}</dialog>; }
export function GameCard({ game: g }: {
    game: Game;
}) { return <Link className={'game-card ' + (g.sport === 'Football' ? 'photo-card' : '')} to={'/player/games/' + g.id}>{g.sport === 'Football' && <img src="/community-football.png" alt="Friends playing football at sunset"/>}<div className="card-content"><div className="row between"><Chip>{g.sport}</Chip><span className="availability">{effectiveGameStatus({status:g.status,startsAt:g.startsAt,maxPlayers:g.maxPlayers,participants:g.players.length,joinMode:g.joinMode})+' / '+spots(g)+' spots'}</span></div><div className="card-bottom"><p className="eyebrow">{g.joinMode === 'instant' ? 'INSTANT JOIN' : 'REQUEST TO JOIN'}</p><h2>{g.title}</h2><p className="row"><Icon name="pin"/>{g.venue}</p><p className="row"><Icon name="calendar"/>{dateLabel(g)}</p><div className="row between"><span>{g.skill} · {g.players.length}/{g.maxPlayers} players</span><span className="round-arrow"><Icon name="arrow"/></span></div></div></div></Link>; }
