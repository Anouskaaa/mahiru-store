'use client';

import { useDashboard } from '@/components/dashboard-context';
import { Card } from '@/components/ui';
import {
  Users,
  Layers,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { stats, refreshStats, loading } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Dashboard</h1>
          <p className="text-base text-slate-700 mt-1">Ringkasan bisnis langganan Anda</p>
        </div>
        <button
          onClick={() => refreshStats()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-700 rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Total Pelanggan"
          value={stats?.total_customers || 0}
          icon={<Users className="w-6 h-6" />}
          subtitle="Pelanggan aktif"
        />
        <Card
          title="Langganan Aktif"
          value={stats?.active_subscriptions || 0}
          icon={<Layers className="w-6 h-6" />}
          subtitle="Family plan digunakan"
        />
        <Card
          title="Pendapatan Bulan Ini"
          value={`Rp ${(stats?.revenue.this_month || 0).toLocaleString('id-ID')}`}
          icon={<DollarSign className="w-6 h-6" />}
          trend={{
            value: stats?.revenue.growth || 0,
            label: 'vs bulan lalu',
          }}
        />
        <Card
          title="Pembayaran Terlambat"
          value={stats?.overdue_payments.count || 0}
          icon={<AlertTriangle className="w-6 h-6" />}
          subtitle={`Rp ${(stats?.overdue_payments.total || 0).toLocaleString('id-ID')} total`}
          variant={stats?.overdue_payments.count ? 'danger' : 'default'}
        />
      </div>

      {/* Upcoming Renewals */}
      <div className="bg-white rounded-xl border-2 border-blue-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Perpanjangan Mendatang
          </h2>
          <Link
            href="/subscriptions"
            className="text-base font-semibold text-blue-600 hover:text-blue-800"
          >
            Lihat semua
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-amber-500 rounded-xl shadow-md">
            <p className="text-3xl font-bold text-white">
              {stats?.upcoming_renewals.this_week || 0}
            </p>
            <p className="text-base text-white/90 mt-1">Minggu ini</p>
          </div>
          <div className="p-5 bg-blue-600 rounded-xl shadow-md">
            <p className="text-3xl font-bold text-white">
              {stats?.upcoming_renewals.this_month || 0}
            </p>
            <p className="text-base text-white/90 mt-1">Bulan ini</p>
          </div>
        </div>
      </div>

      {/* Service Breakdown */}
      <div className="bg-white rounded-xl border-2 border-blue-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-blue-800 mb-5">Pendapatan per Layanan</h2>
        {stats?.service_breakdown && stats.service_breakdown.length > 0 ? (
          <div className="space-y-4">
            {stats.service_breakdown.map((service, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b-2 border-slate-200 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <span className="font-bold text-lg text-slate-800">{service.service}</span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-700">Rp {service.revenue.toLocaleString('id-ID')}</p>
                  <p className="text-sm text-slate-600">{service.active_slots} slot</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-600 text-center py-10 text-lg">Belum ada data layanan</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/customers"
          className="p-6 bg-white rounded-xl border-2 border-blue-200 hover:border-blue-500 hover:shadow-lg transition-all group"
        >
          <Users className="w-10 h-10 text-blue-500 group-hover:text-blue-700 mb-4" />
          <h3 className="font-bold text-xl text-slate-800 mb-2">Kelola Pelanggan</h3>
          <p className="text-base text-slate-600">Tambah, edit, atau lihat detail pelanggan</p>
        </Link>
        <Link
          href="/subscriptions"
          className="p-6 bg-white rounded-xl border-2 border-blue-200 hover:border-blue-500 hover:shadow-lg transition-all group"
        >
          <Layers className="w-10 h-10 text-blue-500 group-hover:text-blue-700 mb-4" />
          <h3 className="font-bold text-xl text-slate-800 mb-2">Kelola Langganan</h3>
          <p className="text-base text-slate-600">Lacak slot dan link invite</p>
        </Link>
        <Link
          href="/payments"
          className="p-6 bg-white rounded-xl border-2 border-blue-200 hover:border-blue-500 hover:shadow-lg transition-all group"
        >
          <DollarSign className="w-10 h-10 text-blue-500 group-hover:text-blue-700 mb-4" />
          <h3 className="font-bold text-xl text-slate-800 mb-2">Lacak Pembayaran</h3>
          <p className="text-base text-slate-600">Pantau pendapatan dan keterlambatan</p>
        </Link>
      </div>
    </div>
  );
}
