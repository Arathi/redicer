import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import EventEmitter from "node:events";
import { randomUUID } from 'node:crypto';
import { 
  createOpenAPI,
  createWebsocket, 
  Config as GuildBotConfig,
  GetWsParam as WSConfig,
  AvailableIntentsEventsEnum as Intents,
  IMessage,
  MessageToCreate,
  IUser,
} from "qq-guild-bot";

import { formatRollResult, parseRollOptions, roll } from "./dice";

type GuildBotClient = ReturnType<typeof createOpenAPI>;
type WebSocketClient = ReturnType<typeof createWebsocket>;

const {
  DIRECT_MESSAGE,
  GUILD_MESSAGES,
} = Intents;

type Session = {
  id: string;
  diceType?: number;
};

type BotConfig = GuildBotConfig & {
  logDir?: string;
};

export default class Bot extends EventEmitter {
  client: GuildBotClient;
  ws: WebSocketClient;
  me?: IUser;
  logDir: string;
  sessions: Record<string, Session | undefined> = {};

  constructor({
    appID,
    token,
    sandbox = false,
    logDir = resolve(process.cwd(), 'logs'),
  }: BotConfig) {
    super();

    this.logDir = logDir;

    const config: GuildBotConfig = {
      appID,
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
    this.client.meApi.me().then(resp => {
      this.me = resp.data;
    });

    this.ws = createWebsocket(wsParam);

    this.ws.on(DIRECT_MESSAGE, ({eventType, eventId, msg}) => {
      this.onDirectMessage(msg);
    });

    this.ws.on(GUILD_MESSAGES, ({eventType, eventId, msg}) => {
      this.onGuildMessages(msg);
    });
  }

  updateSession(channel: string, patch: Partial<Session>) {
    const session: Session | undefined = this.sessions[channel];
    if (session !== undefined) {
      this.sessions[channel] = {
        ...session,
        ...patch,
      };
      console.info(`${channel} 会话信息更新：`, this.sessions[channel]);
    }
  }

  onDirectMessage(msg: IMessage) {
    this.saveMessage('direct', msg);

    const reply: MessageToCreate = {
      msg_id: msg.id,
    };

    if (msg.content.startsWith(".r")) {
      console.info(`${msg.author.username}: ${msg.content}`);
      const command = msg.content.substring(1);
      reply.content = this.generateRollReplyContent(command);
      console.info(`${this.me?.username}: ${reply}`);
    }
    
    if (reply.content !== undefined && reply.content.length > 0) {
      this.client.directMessageApi.postDirectMessage(msg.guild_id, reply);
    }
  }

  onGuildMessages(msg: IMessage) {
    this.saveMessage('guild', msg);

    let session: Session | undefined = this.sessions[msg.channel_id];

    const reply: MessageToCreate = {
      msg_id: msg.id,
      message_reference: {
        message_id: msg.id,
      },
    };

    if (msg.content === ".start") {
      if (session === undefined) {
        session = {
          id: randomUUID(),
          diceType: 6,
        }
        this.sessions[msg.channel_id] = session;
        console.info(`${msg.channel_id} 开始会话：${session.id}`);
        reply.content = `开始会话：${session.id}`;
      } else {
        reply.content = `会话已存在：${session.id}`;
      }
    }

    if (msg.content === '.end') {
      if (session === undefined) {
        reply.content = `当前频道未开始会话`;
        console.warn(`${msg.channel_id} 目前没有会话`);
      } else {
        reply.content = `结束会话：${session.id}`;
        console.info(`${msg.channel_id} 结束会话：${session.id}`);
        this.sessions[msg.channel_id] = undefined;
      }
    }

    if (msg.content.startsWith(".set ")) {
      if (session !== undefined) {
        const params = msg.content.substring(5);
        const tokens = params.split(" ").filter(p => p.length > 0);
        if (tokens.length == 2) {
          const [key, value] = tokens;
          switch (key) {
            case "dice":
            case "dice-type":
            case "dice-face":
            case "dt":
            case "df":
              const face = parseInt(value);
              if (!isNaN(face) && face >= 4 && face <=100) {
                reply.content = `默认骰子类型设置为：D${face}`;
                this.updateSession(msg.channel_id, {
                  diceType: face,
                });
              } else {
                reply.content = `无效的骰子面数：${value}`;
              }
              break;
            default:
              console.warn(`未知参数：`, key);
              break;
          }
        }
      }
    }

    if (msg.content.startsWith(".r")) {
      console.info(`${msg.channel_id} / ${msg.author.username}: ${msg.content}`);
      const command = msg.content.substring(1);
      reply.content = this.generateRollReplyContent(command, session);
      console.info(`${msg.channel_id} / ${this.me?.username}: ${reply.content}`);
    }

    if (reply.content !== undefined && reply.content.length > 0) {
      this.client.messageApi.postMessage(msg.channel_id, reply);
    }
  }

  generateRollReplyContent(
    command: string, 
    session: Session | undefined = undefined,
  ): string {
    try {
      const defaultFace = session?.diceType;
      const options = parseRollOptions(command, defaultFace);
      const result = roll(options);
      return formatRollResult(result);
    }
    catch (error) {
      return `${error}`;
    }
  }

  saveMessage(intent: string, msg: IMessage) {
    const dir = resolve(this.logDir, intent);
    const path = resolve(
      this.logDir,
      intent, 
      `${msg.guild_id}-${msg.channel_id}-${msg.author.id}-${msg.id}.json`,
    );
    const content = JSON.stringify(msg);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, content);
  }
}
