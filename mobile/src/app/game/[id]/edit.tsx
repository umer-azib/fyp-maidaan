import { GameFormScreen } from '../../../screens';
import { RequirePlayer, LoadedGame } from '../../../live';
export default function Route(){return <RequirePlayer><LoadedGame><GameFormScreen/></LoadedGame></RequirePlayer>;}
