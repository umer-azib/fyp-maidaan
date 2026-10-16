export const colors = { background: '#FAFAFA', text: '#161616', muted: '#787878', primary: '#7847BA', lavender: '#E9DDF5', surface: '#F2F2F2', border: '#E1E1E1', success: '#257450', danger: '#B33345' };
export const sports = ['Cricket', 'Football', 'Badminton', 'Padel'] as const;
export type Sport = typeof sports[number];
