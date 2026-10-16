import config from '../web/eslint.config.js';
export default [...config, { files:['**/*.ts'], languageOptions:{globals:{process:'readonly',console:'readonly',Buffer:'readonly',setTimeout:'readonly',fetch:'readonly',URL:'readonly'}},rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}]} }];
