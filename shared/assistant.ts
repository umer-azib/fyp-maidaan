export type SearchIntent={intent:'games'|'courts'|'venues'|'players'|'weather'|'help';sport:'Badminton'|'Padel'|'Football'|'Cricket'|null;area:string|null;date:string|null;time:string|null;period:'morning'|'afternoon'|'evening'|null};
export type AssistantCard={kind:'game'|'court'|'venue'|'player';id:string;title:string;subtitle:string;venueId?:string;courtId?:string;startsAt?:string;date?:string;pricePkr?:number;remaining?:number;developmentFixture:boolean;directoryOnly?:boolean};
export type WeatherPoint={at:string;temperatureC:number;rainProbability:number|null;windKph:number;conditions:string};
export type WeatherReport={source:'Open-Meteo';latitude:number;longitude:number;timezone:'Asia/Karachi';fetchedAt:string;location:string;point:WeatherPoint|null;warning:string|null;message:string};
export type AssistantReply={answer:string;filters:SearchIntent;cards:AssistantCard[];weather?:WeatherReport;searchedAt:string};
export const assistantPrompts=['Find a badminton game tomorrow at 6 PM','Anyone looking for a padel partner in DHA?','Show available courts near me',"What's the weather in Lahore?",'Find an open football match'];
export function assistantLink(card:AssistantCard,mobile=false){
 if(card.kind==='game')return (mobile?'/game/':'/player/games/')+card.id;
 if(card.kind==='player')return mobile?'/player-profile/'+card.id:'/player/players/'+card.id;
 const base=(mobile?'/venue/':'/player/venues/')+(card.venueId||card.id);
 if(card.kind!=='court')return base;
 return base+'?'+new URLSearchParams({court:card.courtId||card.id,date:card.date||'',time:card.startsAt||''}).toString();
}
