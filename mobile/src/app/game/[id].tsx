import { DetailsScreen } from '../../screens';
import { RequirePlayer, LoadedGame } from '../../live';
export default function Route(){return <RequirePlayer><LoadedGame><DetailsScreen/></LoadedGame></RequirePlayer>;}
