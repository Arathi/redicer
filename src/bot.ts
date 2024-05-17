import { 
  createOpenAPI,
  createWebsocket, 
  Config as GuildBotConfig,
  GetWsParam as WSConfig,
  AvailableIntentsEventsEnum as Intents,
  IMessage,
  MessageToCreate,
} from "qq-guild-bot";
import { resolve } from "path";
import { mkdirSync, writeFileSync } from "fs";
import { formatRollResult, parseRollOptions, roll } from "./dice";

type GuildBotClient = ReturnType<typeof createOpenAPI>;
type WebSocketClient = ReturnType<typeof createWebsocket>;

const {
  DIRECT_MESSAGE,
  GUILD_MESSAGES,
} = Intents;

type BotConfig = GuildBotConfig & {
  logDir?: string;
};

export default class Bot {
  client: GuildBotClient;
  ws: WebSocketClient;

  logDir: string;

  constructor({
    appID,
    token,
    sandbox = false,
    logDir = resolve(process.cwd(), 'logs'),
  }: BotConfig) {
    this.logDir = logDir;

    const config: GuildBotConfig = {
      appID: appID,
      token,
      sandbox,
    };

    const shards: number[] | undefined = undefined;
    const intents: Intents[] = [
      DIRECT_MESSAGE,
      GUILD_MESSAGES,
    ];
    const maxRetry = 3;

    const wsParam: WSConfig = {
      ...config,
      shards,
      intents,
      maxRetry,
    }
  
    this.client = createOpenAPI(config);
    this.ws = createWebsocket(wsParam);

    this.ws.on(DIRECT_MESSAGE, ({eventType, eventId, msg}) => {
      this.onDirectMessage(msg);
    });

    this.ws.on(GUILD_MESSAGES, ({eventType, eventId, msg}) => {
      this.onGuildMessages(msg);
    });
  }

  onDirectMessage(msg: IMessage) {
    console.info(`接收到私信：`, msg);
    this.saveMessage('direct', msg);

    if (msg.content.startsWith(".r")) {
      const command = msg.content.substring(1);
      const reply = this.buildRollReply(msg.id, command);
      this.client.directMessageApi.postDirectMessage(msg.guild_id, reply);
    }
  }

  onGuildMessages(msg: IMessage) {
    console.info(`接收到私域频道消息：`, msg);
    this.saveMessage('guild', msg);

    if (msg.content.startsWith(".r")) {
      const command = msg.content.substring(1);
      const reply = this.buildRollReply(msg.id, command);
      this.client.messageApi.postMessage(msg.channel_id, reply);
    }
  }

  buildRollReply(msg_id: string, command: string): MessageToCreate {
    const options = parseRollOptions(command);
    const reply: MessageToCreate = {
      msg_id,
    };

    if (options == null) {
      reply.content = `.rd命令格式错误！`;
    } else {
      const result = roll(options);
      reply.content = formatRollResult(result);
    }

    return reply;
  }

  saveMessage(intent: string, msg: IMessage) {
    const dir = resolve(this.logDir, intent);
    const path = resolve(
      this.logDir,
      intent, 
      `${msg.guild_id}-${msg.channel_id}-${msg.author.id}-${msg.id}.json`,
    );
    const content = JSON.stringify(msg);

    // console.debug(`正在创建报文目录：`, dir);
    mkdirSync(dir, { recursive: true });

    // console.debug(`正在写入文件：`, path);
    writeFileSync(path, content);
  }
}
