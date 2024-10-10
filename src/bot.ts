import { Bot, Composer, Context } from "grammy";
import { ParseModeFlavor, parseMode } from "@grammyjs/parse-mode";

import bot_token_handler from "./handlers/bot_token";
import get_chat_handler from "./handlers/get_chat";
import help_handler from "./handlers/help";
import owner_only from "./handlers/owner_only";
import rem_chat_handler from "./handlers/rem_chat";
import set_chat_handler from "./handlers/set_chat";
import set_owner_handler from "./handlers/set_owner";
import start_handler from "./handlers/start";

export type BotContext = ParseModeFlavor<Context>;

const composer = new Composer<BotContext>();

export const WEBHOOK_HOST = process.env.WEBHOOK_HOST;
export const bots = new Map<string, Bot<BotContext>>();

export const botCreator = (token: string) => {
    const bot = new Bot<BotContext>(token, {
        client: {
            canUseWebhookReply: (method) => method === "sendChatAction"
        }
    });
    bot.api.config.use(parseMode("HTML"));
    bot.api.setMyCommands([
        {
            command: "start",
            description: "Start the bot"
        },
        {
            command: "help",
            description: "Show help message"
        },
        {
            command: "set",
            description: "Set a new chat forwarding"
        },
        {
            command: "get",
            description: "Get an existing setting"
        },
        {
            command: "rem",
            description: "Remove a chat forwarding"
        },
        {
            command: "set_owner",
            description: "Set the owner of the bot"
        }
    ]);
    bots.set(token, bot);
    bot.use(composer);
    return bot;
};

const wrapper =
    (handler: (ctx: BotContext) => Promise<void>) =>
    async (ctx: BotContext) => {
        handler(ctx).catch((err) => {
            console.error(`Error in ${handler.name}: ${err}`);
            ctx.reply("An error has occurred. Please try again later.");
        });
    };

const privateChat = composer.chatType("private");

privateChat.command("start", wrapper(start_handler));
privateChat.command(["set_owner", "setowner"], wrapper(set_owner_handler));
privateChat.command(["help", "settings"], wrapper(help_handler));

privateChat.command("set").filter(owner_only, wrapper(set_chat_handler));
privateChat.command("get").filter(owner_only, wrapper(get_chat_handler));
privateChat.command("rem").filter(owner_only, wrapper(rem_chat_handler));

privateChat.on("msg:text").filter(
    // @ts-ignore
    (ctx) => ctx.msg.forward_from?.username?.toLowerCase() === "botfather",
    wrapper(bot_token_handler)
);

// Function to check for ETH address
const isEthAddress = (address: string) => /^0x[a-fA-F0-9]{40}$/.test(address);

// Function to check for Solana address with "pump" at the end
const isSolanaAddress = (address: string) => /^[A-HJ-NP-Za-km-z1-9]{44}pump$/.test(address);

// Function to check for social media links
const isSocialMediaLink = (url: string) => {
    const socialMediaPatterns = [
        /https?:\/\/(www\.)?(twitter|instagram|tiktok)\.com\/[^\s]+/i,
        /https?:\/\/(m\.)?(twitter|instagram|tiktok)\.com\/[^\s]+/i,
        /twitter\.com\/[^\s]+/i,
        /instagram\.com\/[^\s]+/i,
        /tiktok\.com\/[^\s]+/i,
    ];
    return socialMediaPatterns.some(pattern => pattern.test(url));
};

// Define your array of chat IDs
const chatIds = [
    'CHAT_ID_1',
    'CHAT_ID_2',
    'CHAT_ID_3',
    'CHAT_ID_4',
    'CHAT_ID_5'
];

const message_handler = async (ctx: Context) => {
    const messageText = ctx.msg.text;
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name; // Get username or first name

    // Check if the message contains a contract address or a social media link
    if (messageText) {
        const words = messageText.split(/\s+/);
        for (const word of words) {
            if (isEthAddress(word) || isSolanaAddress(word) || isSocialMediaLink(word)) {
                // Forward the message to all specified chat IDs with the user's name
                const forwardMessage = `${username} sent: ${messageText}`;
                for (const chatId of chatIds) {
                    await ctx.api.sendMessage(chatId, forwardMessage);
                }
                break; // Exit after the first valid address or link is found
            }
        }
    }
};

// Register the updated message handler
composer.on("message", message_handler);

export default composer;
