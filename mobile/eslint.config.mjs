import config from '../web/eslint.config.js';
export default [{ignores:['.expo/**','dist/**']},...config, { files:['**/*.{ts,tsx}'], rules:{ '@typescript-eslint/no-require-imports':['error',{allow:['\\.(png|jpg|ttf)$']}] } }];
