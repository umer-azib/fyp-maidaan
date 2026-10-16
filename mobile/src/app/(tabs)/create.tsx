import { GameFormScreen } from '../../screens';
import { RequirePlayer } from '../../live';
import {useState} from 'react';
import {router} from 'expo-router';
import {Screen,Button,T} from '../../components/maidaan-ui';
export default function Route(){const [external,setExternal]=useState(false);return <RequirePlayer>{external?<GameFormScreen/>:<Screen title="Bring your people together." eyebrow="YOUR COURT. YOUR GAME."><T>Reserve a managed court first, then recruit players from your confirmed booking.</T><Button onPress={()=>router.push('/discover')}>Find venues and book a court</Button><Button secondary onPress={()=>router.push('/bookings')}>Use my confirmed booking</Button><Button secondary onPress={()=>setExternal(true)}>Already booked elsewhere / unverified</Button></Screen>}</RequirePlayer>;}
