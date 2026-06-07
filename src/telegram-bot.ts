/**
 * Telegram Bot for Mahiru Store Dashboard
 *
 * This bot handles customer interactions via Telegram.
 * Commands:
 *   /start - Register with the bot
 *   /status - Check subscription status
 *   /link - Request an invite link
 *   /renewal - Check renewal dates
 *   /help - Show available commands
 *
 * Setup:
 * 1. Create a bot via @BotFather and get your token
 * 2. Set TELEGRAM_BOT_TOKEN in your .env.local
 * 3. Run with: npx ts-node src/telegram-bot.ts
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const TelegramBot = require('node-telegram-bot-api');

// Configuration
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

// Validate token
if (!TOKEN) {
  console.error('ERROR: TELEGRAM_BOT_TOKEN not set in environment variables');
  console.log('Please set your Telegram bot token in .env.local');
  process.exit(1);
}

// Initialize bot
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('🤖 Shuuush Telegram Bot started!');
console.log(`📡 Connected to API at: ${API_BASE}`);

// Helper function to call our API
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    return { error: 'Failed to connect to server' };
  }
}

// Format currency
function formatCurrency(amount: number) {
  return `$${Number(amount).toFixed(2)}`;
}

// /start command - Welcome message and registration
bot.onText(/\/start/, async (msg: any) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  const welcomeMessage = `
👋 Welcome to Mahirustore

I'm here to help you manage your subscriptions.

Available commands:
/start - Show this message
/status - Check your subscription status
/link [service] - Request an invite link
/renewal - Check upcoming renewals
/help - Show all commands

To get started, make sure you've been registered by the admin.
  `;

  bot.sendMessage(chatId, welcomeMessage);
});

// /help command - Show all commands
bot.onText(/\/help/, (msg: any) => {
  const chatId = msg.chat.id;

  const helpMessage = `
📚 Available Commands

• /start - Welcome message
• /status - Check your subscription status
• /link [service] - Request an invite link
  Examples:
  /link spotify_family
  /link apple_music_family
• /renewal - Check upcoming renewals
• /help - Show this help message

Need assistance? Contact the admin!
  `;

  bot.sendMessage(chatId, helpMessage);
});

// /status command - Check subscription status
bot.onText(/\/status/, async (msg: any) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  bot.sendMessage(chatId, '⏳ Checking your status...');

  const result = await apiCall(`/api/telegram/status/${telegramId}`);

  if (result.error) {
    bot.sendMessage(chatId, `❌ ${result.error}\n\n${result.action || ''}`);
    return;
  }

  const { customer } = result.data;
  const subscriptions = customer.active_subscriptions;

  if (!subscriptions || subscriptions.length === 0) {
    bot.sendMessage(chatId, `📭 You don't have any active subscriptions yet.`);
    return;
  }

  let message = `📋 Your Subscriptions\n\n`;

  for (const sub of subscriptions) {
    message += `🎵 ${sub.service}\n`;
    message += `   Slot: #${sub.slot_number}\n`;
    message += `   Status: ${sub.status}\n`;

    if (sub.next_payment) {
      message += `   Next Payment: ${formatCurrency(sub.next_payment.amount)}\n`;
      message += `   Due: ${new Date(sub.next_payment.due_date).toLocaleDateString()}\n`;
    }

    message += `\n`;
  }

  bot.sendMessage(chatId, message);
});

// /link command - Request invite link
bot.onText(/\/link(?:\s+(.+))?/, async (msg: any, match: any) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  const serviceName = match[1]?.trim();

  if (!serviceName) {
    bot.sendMessage(chatId, `
📤 Request Invite Link

Usage: /link [service_name]

Example: /link spotify_family

Available services:
• spotify_family
• apple_music_family
• canva_pro
• youtube_premium_family
• disney_plus
    `);
    return;
  }

  bot.sendMessage(chatId, '⏳ Looking for available slots...');

  const result = await apiCall('/api/telegram/request-link', {
    method: 'POST',
    body: JSON.stringify({
      telegram_id: telegramId,
      service_name: serviceName.toLowerCase().replace(/\s+/g, '_'),
    }),
  });

  if (result.error) {
    bot.sendMessage(chatId, `❌ ${result.error}\n\n${result.message || ''}`);
    return;
  }

  const inviteMessage = `
✅ Here's your invite link!

Service: ${result.service}
Link: ${result.invite_link}

${result.message || 'Click the link to join!'}
  `;

  bot.sendMessage(chatId, inviteMessage, {
    reply_markup: {
      inline_keyboard: [[
        { text: 'Open Link', url: result.invite_link }
      ]]
    }
  });
});

// /renewal command - Check renewal dates
bot.onText(/\/renewal/, async (msg: any) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  bot.sendMessage(chatId, '⏳ Checking renewal dates...');

  const result = await apiCall(`/api/telegram/renewal/${telegramId}`);

  if (result.error) {
    bot.sendMessage(chatId, `❌ ${result.error}\n\n${result.action || ''}`);
    return;
  }

  const { subscriptions } = result.data;

  if (!subscriptions || subscriptions.length === 0) {
    bot.sendMessage(chatId, `📭 You don't have any active subscriptions.`);
    return;
  }

  let message = `📅 Upcoming Renewals\n\n`;

  for (const sub of subscriptions) {
    const emoji = sub.status === 'urgent' ? '🔴' : sub.status === 'soon' ? '🟡' : '🟢';
    message += `${emoji} ${sub.service}\n`;
    message += `   Renewal: ${new Date(sub.renewal_date).toLocaleDateString()}\n`;
    message += `   In: ${sub.days_until_renewal} days\n\n`;
  }

  bot.sendMessage(chatId, message);
});

// Error handling
bot.on('polling_error', (error: any) => {
  console.error('Polling error:', error);
});

bot.on('webhook_error', (error: any) => {
  console.error('Webhook error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Bot stopped');
  bot.close();
  process.exit();
});

module.exports = bot;