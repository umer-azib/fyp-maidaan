export const isVercel=()=>process.env.VERCEL==='1';
export const isProduction=()=>isVercel()||process.env.NODE_ENV==='production';
export const temporaryAdminId='9717427b-fd7e-46ba-a666-b83874dbc72c';
