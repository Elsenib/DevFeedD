const dotenv = require('dotenv');
dotenv.config();
console.log('DATABASE_URL RAW:', process.env.DATABASE_URL || '(none)');
console.log('NODE_ENV:', process.env.NODE_ENV || '(none)');
