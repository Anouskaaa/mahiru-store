/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
/**
 * Telegram Bot for Mahiru Store Dashboard
 *
 * This bot handles customer interactions via Telegram.
 *
 * Commands:
 *   /start - Register with the bot
 *   /order - Order a new subscription (generates QRIS)
 *   /status - Check subscription status
 *   /link - Request an invite link
 *   /renewal - Check renewal dates
 *   /cekbayar - Check QRIS payment status
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

console.log('🤖 Mahiru Store Telegram Bot started!');
console.log(`📡 Connected to API at: ${API_BASE}`);

// Store pending orders (chatId -> order data)
const pendingOrders = new Map();

// Store generated QRIS data (chatId -> qris data)
const qrisData = new Map();

// Helper function to call our API
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const url = `${API_BASE.replace(/\/$/, '')}${endpoint}`;
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
  return `Rp ${Number(amount).toLocaleString('id-ID')}`;
}

// === /start command ===
bot.onText(/\/start/, async (msg: any) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  const firstName = msg.from.first_name || 'Customer';

  const welcomeMessage = `
👋 Halo ${firstName}! Selamat datang di Mahiru Store

Saya di sini untuk membantu kamu memesan langganan premium dengan mudah.

📋 Fitur yang tersedia:
• /order - Pesan langganan baru (QRIS)
• /status - Cek status langganan kamu
• /link - Minta link invite
• /renewal - Cek tanggal perpanjangan
• /cekbayar - Cek status pembayaran QRIS
• /help - Lihat semua perintah

💡 Cukup ketik /order untuk mulai memesan!
  `;

  bot.sendMessage(chatId, welcomeMessage);
});

// === /help command ===
bot.onText(/\/help/, (msg: any) => {
  const chatId = msg.chat.id;

  const helpMessage = `
📚 Perintah yang Tersedia

🛒 /order - Pesan langganan baru
   Gunakan ini untuk memesan layanan baru
   Pembayaran via QRIS otomatis

📋 /status - Cek status langganan
   Lihat langganan aktif kamu

🔗 /link - Minta link invite
   Usage: /link [nama_layanan]
   Contoh: /link spotify_family

📅 /renewal - Cek perpanjangan
   Lihat tanggal perpanjangan

💳 /cekbayar - Cek pembayaran
   Cek status pembayaran QRIS kamu

❓ /help - Tampilkan pesan ini

Butuh bantuan? Hubungi admin!
  `;

  bot.sendMessage(chatId, helpMessage);
});

// === /order command - Order subscription with QRIS ===
bot.onText(/\/order/, async (msg: any) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  bot.sendMessage(chatId, '⏳ Mengambil daftar layanan...');

  // Get available services
  const result = await apiCall('/api/services');

  if (result.error || !result.data) {
    bot.sendMessage(chatId, '❌ Gagal mengambil daftar layanan. Coba lagi nanti.');
    return;
  }

  const services = result.data.filter((s: any) => s.is_active);

  if (services.length === 0) {
    bot.sendMessage(chatId, '❌ Saat ini belum ada layanan tersedia.');
    return;
  }

  // Store services for this user
  pendingOrders.set(chatId, { step: 'select_service', services });

  let message = `🛒 Pesan Langganan Baru\n\n`;
  message += `Pilih layanan yang kamu inginkan:\n\n`;

  services.forEach((service: any, index: number) => {
    message += `${index + 1}. ${service.display_name}\n`;
    message += `   💰 Harga: ${formatCurrency(service.resale_price)}\n`;
    message += `   📦 Slot: ${service.total_slots}\n\n`;
  });

  message += `\nBalas dengan nomor layanan (1-${services.length})`;

  // Create inline keyboard for quick selection
  const keyboard = {
    inline_keyboard: services.map((service: any, index: number) => [
      { text: `${index + 1}. ${service.display_name} - ${formatCurrency(service.resale_price)}`, callback_data: `order_${index}` }
    ])
  };

  bot.sendMessage(chatId, message, { reply_markup: keyboard });
});

// Handle callback query from inline keyboard
bot.on('callback_query', async (query: any) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const telegramId = query.from.id.toString();

  if (data.startsWith('order_')) {
    const index = parseInt(data.replace('order_', ''));
    const orderData = pendingOrders.get(chatId);

    if (!orderData || !orderData.services) {
      bot.answerCallbackQuery(query.id, { text: '❌ Sesi expired. Ketik /order lagi.' });
      return;
    }

    const service = orderData.services[index];
    if (!service) {
      bot.answerCallbackQuery(query.id, { text: '❌ Layanan tidak ditemukan.' });
      return;
    }

    // Confirm selection
    bot.answerCallbackQuery(query.id, { text: `Memproses ${service.display_name}...` });

    const confirmMessage = `
🎉 Layanan Dipilih

📦 ${service.display_name}
💰 Total: ${formatCurrency(service.resale_price)}

Konfirmasi pemesanan?
`;

    // Store selected service
    pendingOrders.set(chatId, {
      ...orderData,
      step: 'confirm',
      selectedService: service
    });

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Ya, Pesan', callback_data: 'confirm_yes' },
          { text: '❌ Batal', callback_data: 'confirm_no' }
        ]
      ]
    };

    bot.sendMessage(chatId, confirmMessage, { reply_markup: keyboard });
  }

  if (data === 'confirm_yes') {
    const orderData = pendingOrders.get(chatId);
    if (!orderData?.selectedService) {
      bot.answerCallbackQuery(query.id, { text: '❌ Sesi expired. Ketik /order lagi.' });
      return;
    }

    const service = orderData.selectedService;
    bot.answerCallbackQuery(query.id, { text: '⏳ Membuat QRIS...' });

    // Create QRIS payment
    const qrisResult = await apiCall('/api/telegram/create-order', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: telegramId,
        service_id: service.id,
        amount: service.resale_price
      })
    });

    if (qrisResult.error) {
      bot.sendMessage(chatId, `❌ Gagal membuat QRIS: ${qrisResult.error || 'Unknown error'}`);
      return;
    }

    // Store QRIS data for this user
    const qris = qrisResult.data;
    qrisData.set(chatId, qris);
    pendingOrders.delete(chatId);

    // Send QRIS info
    const qrisMessage = `
💳 QRIS Pembayaran

📦 Layanan: ${service.display_name}
💰 Total: ${formatCurrency(qris.total_to_pay)}

⏰ Expired: ${new Date(qris.expired_at).toLocaleString('id-ID')}

Silakan scan QR code di bawah ini untuk membayar.
Setelah membayar, ketik /cekbayar untuk verifikasi.
`;

    bot.sendMessage(chatId, qrisMessage);

    // Send QR code image
    if (qris.qr_string) {
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qris.qr_string)}`;
      bot.sendPhoto(chatId, qrImageUrl, {
        caption: '📱 Scan QR code di atas untuk pembayaran'
      });
    }

    // Send payment link as backup
    if (qris.link) {
      bot.sendMessage(chatId, `🔗 Atau buka link pembayaran: ${qris.link}`, {
        reply_markup: {
          inline_keyboard: [[
            { text: '💳 Bayar Sekarang', url: qris.link }
          ]]
        }
      });
    }
  }

  if (data === 'confirm_no') {
    pendingOrders.delete(chatId);
    bot.answerCallbackQuery(query.id, { text: 'Pesanan dibatalkan.' });
    bot.sendMessage(chatId, '❌ Pesanan dibatalkan.\n\nKetik /order untuk memesan lagi.');
  }
});

// === /cekbayar command - Check QRIS payment status ===
bot.onText(/\/cekbayar/, async (msg: any) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  const qris = qrisData.get(chatId);

  if (!qris) {
    bot.sendMessage(chatId, `
💳 Cek Pembayaran

Tidak ada pembayaran aktif.
Ketik /order untuk membuat pesanan baru.
`);
    return;
  }

  bot.sendMessage(chatId, '⏳ Mengecek status pembayaran...');

  const result = await apiCall(`/api/telegram/check-payment?transaction_id=${qris.transaction_id}`);

  if (result.error) {
    bot.sendMessage(chatId, `❌ Gagal mengecek pembayaran: ${result.message || 'Unknown error'}`);
    return;
  }

  const status = result.data.status;

  if (status === 'success' || status === 'paid') {
    qrisData.delete(chatId);

    // Get invite link
    const linkResult = await apiCall(`/api/telegram/get-link/${telegramId}`);

    const successMessage = `
✅ PEMBAYARAN BERHASIL!

🎉 Selamat! Langganan kamu sudah aktif.

${linkResult.data?.invite_link ? `🔗 Link Invite:\n${linkResult.data.invite_link}` : 'Link invite akan dikirim oleh admin.'}
`;

    bot.sendMessage(chatId, successMessage, {
      reply_markup: linkResult.data?.invite_link ? {
        inline_keyboard: [[
          { text: '🔗 Buka Link Invite', url: linkResult.data.invite_link }
        ]]
      } : undefined
    });
  } else if (status === 'pending') {
    bot.sendMessage(chatId, `
⏳ Pembayaran Masih Pending

QRIS belum dibayar.
Silakan scan QR code dan lakukan pembayaran.
Setelah membayar, tunggu 1-2 menit lalu ketik /cekbayar lagi.
`);
  } else {
    bot.sendMessage(chatId, `
❌ Pembayaran Gagal atau Kadaluarsa

Silakan buat pesanan baru dengan /order.
`);
    qrisData.delete(chatId);
  }
});

// === /status command - Check subscription status ===
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
    bot.sendMessage(chatId, `📭 Kamu belum memiliki langganan aktif.\n\nKetik /order untuk memesan!`);
    return;
  }

  let message = `📋 Langganan Aktif Kamu\n\n`;

  for (const sub of subscriptions) {
    message += `🎵 ${sub.service}\n`;
    message += `   Slot: #${sub.slot_number}\n`;
    message += `   Status: ✅ Aktif\n`;

    if (sub.next_payment) {
      message += `   Next Payment: ${formatCurrency(sub.next_payment.amount)}\n`;
      message += `   Due: ${new Date(sub.next_payment.due_date).toLocaleDateString('id-ID')}\n`;
    }

    message += `\n`;
  }

  bot.sendMessage(chatId, message);
});

// === /link command - Request invite link ===
bot.onText(/\/link(?:\s+(.+))?/, async (msg: any, match: any) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  const serviceName = match[1]?.trim();

  if (!serviceName) {
    bot.sendMessage(chatId, `
📤 Minta Link Invite

Usage: /link [nama_layanan]

Contoh: /link spotify_family

Layanan tersedia:
• spotify_family
• apple_music_family
• canva_pro
• youtube_premium_family
• disney_plus
    `);
    return;
  }

  bot.sendMessage(chatId, '⏳ Mencari slot yang tersedia...');

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
✅ Link Invite Kamu!

Layanan: ${result.service}
Link: ${result.invite_link}

${result.message || 'Klik link untuk bergabung!'}
  `;

  bot.sendMessage(chatId, inviteMessage, {
    reply_markup: {
      inline_keyboard: [[
        { text: '🔗 Buka Link', url: result.invite_link }
      ]]
    }
  });
});

// === /renewal command - Check renewal dates ===
bot.onText(/\/renewal/, async (msg: any) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  bot.sendMessage(chatId, '⏳ Mengecek tanggal perpanjangan...');

  const result = await apiCall(`/api/telegram/renewal/${telegramId}`);

  if (result.error) {
    bot.sendMessage(chatId, `❌ ${result.error}\n\n${result.action || ''}`);
    return;
  }

  const { subscriptions } = result.data;

  if (!subscriptions || subscriptions.length === 0) {
    bot.sendMessage(chatId, `📭 Kamu belum memiliki langganan aktif.`);
    return;
  }

  let message = `📅 Tanggal Perpanjangan\n\n`;

  for (const sub of subscriptions) {
    const emoji = sub.status === 'urgent' ? '🔴' : sub.status === 'soon' ? '🟡' : '🟢';
    message += `${emoji} ${sub.service}\n`;
    message += `   Perpanjangan: ${new Date(sub.renewal_date).toLocaleDateString('id-ID')}\n`;
    message += `   Dalam: ${sub.days_until_renewal} hari\n\n`;
  }

  bot.sendMessage(chatId, message);
});

// === Handle text input (for order flow) ===
bot.on('message', (msg: any) => {
  // Ignore commands and non-text messages
  if (msg.text?.startsWith('/')) return;
  if (msg.text === undefined) return;

  const chatId = msg.chat.id;
  const orderData = pendingOrders.get(chatId);

  if (orderData?.step === 'select_service' && orderData.services) {
    const index = parseInt(msg.text) - 1;
    const service = orderData.services[index];

    if (!service) {
      bot.sendMessage(chatId, '❌ Pilihan tidak valid. Pilih angka 1-' + orderData.services.length);
      return;
    }

    // Show confirmation
    pendingOrders.set(chatId, {
      ...orderData,
      step: 'confirm',
      selectedService: service
    });

    const confirmMessage = `
🎉 Layanan Dipilih

📦 ${service.display_name}
💰 Total: ${formatCurrency(service.resale_price)}

Konfirmasi pemesanan?
`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Ya, Pesan', callback_data: 'confirm_yes' },
          { text: '❌ Batal', callback_data: 'confirm_no' }
        ]
      ]
    };

    bot.sendMessage(chatId, confirmMessage, { reply_markup: keyboard });
  }
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
