export const lahoreCenter:[number,number]=[31.5204,74.3587];
export const osmTiles='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export function directions(latitude:number,longitude:number){return 'https://www.google.com/maps/dir/?api=1&destination='+latitude+','+longitude}
export function distanceKm(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){const rad=Math.PI/180,dlat=(b.latitude-a.latitude)*rad,dlon=(b.longitude-a.longitude)*rad;return 6371*2*Math.asin(Math.sqrt(Math.min(1,Math.sin(dlat/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dlon/2)**2)))}
