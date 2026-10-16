import {RingLoader} from 'react-spinners';
export function Loading({inline=false,label='Loading...'}:{inline?:boolean;label?:string}){return <span className={inline?'loading-inline':'loading-centered'} role="status" aria-label={label}><RingLoader color="#36d7b7" size={inline?18:38}/>{!inline&&<span>{label}</span>}</span>}
