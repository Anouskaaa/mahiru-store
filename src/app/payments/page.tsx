'use client';

import { useEffect, useState } from 'react';
import { Table, Badge, Button, Modal, Input, Select } from '@/components/ui';
import { Plus, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { Payment } from '@/types';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_subscription_id: '',
    amount: '',
    due_date: '',
    payment_method: '',
    transaction_ref: '',
    paid_date: '',
  });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/api/payments?status=${statusFilter}`
        : '/api/payments';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil pembayaran:', err);
    }
    setLoading(false);
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/payments/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil ringkasan:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchSummary();
  }, [statusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          customer_subscription_id: '',
          amount: '',
          due_date: '',
          payment_method: '',
          transaction_ref: '',
          paid_date: '',
        });
        fetchPayments();
        fetchSummary();
      }
    } catch (err) {
      console.error('Gagal membuat pembayaran:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return { variant: 'success' as const, icon: CheckCircle, text: 'Lunas' };
      case 'pending':
        return { variant: 'warning' as const, icon: Clock, text: 'Tertunda' };
      case 'overdue':
        return { variant: 'danger' as const, icon: AlertTriangle, text: 'Terlambat' };
      default:
        return { variant: 'default' as const, icon: Clock, text: status };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Pembayaran</h1>
          <p className="text-base text-slate-700 mt-1">Lacak pendapatan dan kelola pembayaran</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Catat Pembayaran
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-emerald-500 rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3 text-white mb-3">
              <CheckCircle className="w-6 h-6" />
              <span className="font-bold text-lg">Diterima</span>
            </div>
            <p className="text-2xl font-bold text-white">
              Rp {summary.this_month.total_collected.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-amber-500 rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3 text-white mb-3">
              <Clock className="w-6 h-6" />
              <span className="font-bold text-lg">Tertunda</span>
            </div>
            <p className="text-2xl font-bold text-white">
              Rp {summary.this_month.total_pending.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-red-600 rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3 text-white mb-3">
              <AlertTriangle className="w-6 h-6" />
              <span className="font-bold text-lg">Terlambat</span>
            </div>
            <p className="text-2xl font-bold text-white">
              Rp {summary.this_month.total_overdue.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-blue-600 rounded-xl p-6 shadow-md">
            <div className="flex items-center gap-3 text-white mb-3">
              <DollarSign className="w-6 h-6" />
              <span className="font-bold text-lg">Pertumbuhan</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {summary.growth >= 0 ? '+' : ''}{summary.growth}%
            </p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-base font-semibold text-slate-800">Filter berdasarkan status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-slate-800 font-medium"
        >
          <option value="">Semua</option>
          <option value="paid">Lunas</option>
          <option value="pending">Tertunda</option>
          <option value="overdue">Terlambat</option>
        </select>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-blue-200">
          <p className="text-xl text-slate-700 font-semibold">Tidak ada pembayaran ditemukan</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-6">
            <Plus className="w-4 h-4 mr-2" />
            Catat Pembayaran Pertama
          </Button>
        </div>
      ) : (
        <Table headers={['Pelanggan', 'Layanan', 'Jumlah', 'Tanggal Jatuh Tempo', 'Status', 'Aksi']}>
          {payments.map((payment) => {
            const badge = getStatusBadge(payment.status);
            const StatusIcon = badge.icon;

            return (
              <tr key={payment.id} className="hover:bg-blue-50">
                <td className="px-6 py-5 font-bold text-lg text-slate-800">
                  {(payment as any).customer_subscription?.customer?.name || 'Tidak Dikenal'}
                </td>
                <td className="px-6 py-5 text-base text-slate-700">
                  {(payment as any).customer_subscription?.subscription?.service?.display_name || 'Tidak Dikenal'}
                </td>
                <td className="px-6 py-5 font-bold text-xl text-blue-700">
                  Rp {Number(payment.amount).toLocaleString('id-ID')}
                </td>
                <td className="px-6 py-5 text-base text-slate-700">
                  {new Date(payment.due_date).toLocaleDateString('id-ID')}
                </td>
                <td className="px-6 py-5">
                  <Badge variant={badge.variant}>
                    <StatusIcon className="w-4 h-4 mr-1" />
                    {badge.text}
                  </Badge>
                </td>
                <td className="px-6 py-5">
                  <Button variant="ghost" size="sm" className="font-semibold">
                    Lihat
                  </Button>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Record Payment Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Catat Pembayaran">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="ID Langganan Pelanggan"
            name="customer_subscription_id"
            value={formData.customer_subscription_id}
            onChange={(v) => setFormData({ ...formData, customer_subscription_id: v })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Jumlah"
              name="amount"
              type="number"
              step="1"
              value={formData.amount}
              onChange={(v) => setFormData({ ...formData, amount: v })}
              required
            />
            <Input
              label="Tanggal Jatuh Tempo"
              name="due_date"
              type="date"
              value={formData.due_date}
              onChange={(v) => setFormData({ ...formData, due_date: v })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Metode Pembayaran"
              name="payment_method"
              value={formData.payment_method}
              onChange={(v) => setFormData({ ...formData, payment_method: v })}
              options={[
                { value: 'telegram', label: 'Telegram' },
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'transfer', label: 'Transfer Bank' },
                { value: 'tunai', label: 'Tunai' },
              ]}
            />
            <Input
              label="Referensi Transaksi"
              name="transaction_ref"
              value={formData.transaction_ref}
              onChange={(v) => setFormData({ ...formData, transaction_ref: v })}
            />
          </div>
          <Input
            label="Tanggal Bayar (kosongkan jika belum lunas)"
            name="paid_date"
            type="date"
            value={formData.paid_date}
            onChange={(v) => setFormData({ ...formData, paid_date: v })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Batal
            </Button>
            <Button type="submit">Catat Pembayaran</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}