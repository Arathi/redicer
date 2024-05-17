import 'dotenv/config';
import Bot from './bot';

const APPID = process.env.QQ_BOT_APPID ?? '';
const TOKEN = process.env.QQ_BOT_TOKEN ?? '';

const bot = new Bot({
  appID: APPID,
  token: TOKEN,
});
