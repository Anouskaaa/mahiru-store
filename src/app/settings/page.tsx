'use client';

import { Button } from '@/components/ui';
import { Key, Database, MessageCircle } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-700">Pengaturan</h1>
        <p className="text-base text-slate-700 mt-1">Konfigurasi dashboard dan integrasi Anda</p>
      </div>

      {/* API Keys Section */}
      <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-slate-800">Status API Keys</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div>
              <p className="font-bold text-lg text-slate-800">Konfigurasi Supabase</p>
              <p className="text-base text-slate-600 mt-1">Lihat file .env.local</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold px-4 py-2 bg-blue-100 text-blue-700 rounded-lg border border-blue-300">
                Lihat .env.local
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div>
              <p className="font-bold text-lg text-slate-800">Token Bot Telegram</p>
              <p className="text-base text-slate-600 mt-1">Token dari @BotFather</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold px-4 py-2 bg-blue-100 text-blue-700 rounded-lg border border-blue-300">
                Lihat .env.local
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 p-5 bg-blue-100 border-2 border-blue-300 rounded-lg">
          <h3 className="font-bold text-lg text-blue-900 mb-3">Variabel Lingkungan</h3>
          <p className="text-base text-blue-800 mb-4">
            Konfigurasi ini di file <code className="bg-blue-200 px-2 py-1 rounded font-mono">.env.local</code> Anda:
          </p>
          <div className="space-y-3 text-base font-mono">
            <p className="text-blue-900 font-semibold">NEXT_PUBLIC_SUPABASE_URL=url_anda</p>
            <p className="text-blue-900 font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY=kunci_anda</p>
            <p className="text-blue-900 font-semibold">SUPABASE_SERVICE_ROLE_KEY=kunci_anda</p>
            <p className="text-blue-900 font-semibold">API_SECRET_KEY=rahasia_anda</p>
            <p className="text-blue-900 font-semibold">TELEGRAM_BOT_TOKEN=token_anda</p>
          </div>
        </div>
      </div>

      {/* Telegram Integration Section */}
      <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-slate-800">Setup Bot Telegram</h2>
        </div>

        <div className="space-y-4">
          <div className="p-5 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h3 className="font-bold text-lg text-slate-800 mb-3">Perintah Bot</h3>
            <p className="text-base text-slate-700 mb-4">
              Bot Telegram Anda harus dikonfigurasi dengan perintah ini:
            </p>
            <div className="space-y-3 text-base">
              <div className="flex justify-between">
                <code className="bg-slate-200 px-3 py-2 rounded-lg font-mono font-semibold text-slate-800">/start</code>
                <span className="text-slate-700 font-medium">Memulai bot dan registrasi</span>
              </div>
              <div className="flex justify-between">
                <code className="bg-slate-200 px-3 py-2 rounded-lg font-mono font-semibold text-slate-800">/status</code>
                <span className="text-slate-700 font-medium">Cek status langganan</span>
              </div>
              <div className="flex justify-between">
                <code className="bg-slate-200 px-3 py-2 rounded-lg font-mono font-semibold text-slate-800">/link [layanan]</code>
                <span className="text-slate-700 font-medium">Minta link invite</span>
              </div>
              <div className="flex justify-between">
                <code className="bg-slate-200 px-3 py-2 rounded-lg font-mono font-semibold text-slate-800">/renewal</code>
                <span className="text-slate-700 font-medium">Cek tanggal perpanjangan</span>
              </div>
            </div>
          </div>

          <div className="p-5 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h3 className="font-bold text-lg text-slate-800 mb-3">API Endpoints</h3>
            <p className="text-base text-slate-700 mb-4">
              Endpoint ini tersedia untuk bot Telegram Anda:
            </p>
            <div className="space-y-3 text-base font-mono">
              <p className="bg-slate-200 px-3 py-2 rounded-lg text-slate-800 font-semibold">
                GET /api/telegram/status/:telegramId
              </p>
              <p className="bg-slate-200 px-3 py-2 rounded-lg text-slate-800 font-semibold">
                POST /api/telegram/request-link
              </p>
              <p className="bg-slate-200 px-3 py-2 rounded-lg text-slate-800 font-semibold">
                GET /api/telegram/renewal/:telegramId
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Database Section */}
      <div className="bg-white rounded-xl border-2 border-blue-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-slate-800">Setup Database</h2>
        </div>

        <div className="p-5 bg-blue-50 rounded-lg border-2 border-blue-200">
          <h3 className="font-bold text-lg text-slate-800 mb-3">Schema Supabase</h3>
          <p className="text-base text-slate-700 mb-4">
            Jalankan schema SQL di SQL Editor Supabase untuk membuat tabel yang diperlukan:
          </p>
          <div className="bg-white p-4 rounded-lg border-2 border-slate-300">
            <code className="text-base font-mono text-slate-800">
              supabase/schema.sql
            </code>
          </div>
          <Button variant="secondary" className="mt-5">
            Lihat File Schema
          </Button>
        </div>
      </div>
    </div>
  );
}