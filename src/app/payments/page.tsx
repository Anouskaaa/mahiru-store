'use client';

import { useEffect, useState } from 'react';
import { Table, Badge, Button, Modal, Input, Select } from '@/components/ui';
import { Plus, DollarSign, AlertTriangle, CheckCircle, Clock, QrCode, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Payment } from '@/types';

interface QRISPaymentData {
  transaction_id: string;
  reff_id: string;
  qr_string: string;
  link: string;
  amount: number;
  total_to_pay: number;
  expired_at: string;
  status: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qrisModalOpen, setQrisModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [qrisData, setQrisData] = useState<QRISPaymentData | null>(null);
  const [creatingQRIS, setCreatingQRIS] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copiedQRIS, setCopiedQRIS] = useState(false);
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

  const openQRISPayment = async (payment: Payment) => {
    setSelectedPayment(payment);
    setQrisData(null);
    setQrisModalOpen(true);
  };

  const createQRISPayment = async () => {
    if (!selectedPayment) return;

    setCreatingQRIS(true);
    try {
      // If payment already has qris_data, use that
      const existingQRIS = (selectedPayment as any).qris_data;
      if (existingQRIS && existingQRIS.qr_string) {
        setQrisData({
          transaction_id: selectedPayment.transaction_ref || existingQRIS.transaction_id,
          reff_id: existingQRIS.reff_id,
          qr_string: existingQRIS.qr_string,
          link: existingQRIS.link,
          amount: existingQRIS.amount || selectedPayment.amount,
          total_to_pay: existingQRIS.total_to_pay || selectedPayment.amount,
          expired_at: existingQRIS.expired_at,
          status: 'pending',
        });
        setCreatingQRIS(false);
        return;
      }

      // Create new QRIS payment
      const res = await fetch('/api/payments/qris/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: selectedPayment.id,
          amount: Math.ceil(Number(selectedPayment.amount) / 1000) * 1000, // Round to nearest 1000
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQrisData(data.data);
      } else {
        const error = await res.json();
        alert(`Gagal membuat QRIS: ${error.message}`);
      }
    } catch (err) {
      console.error('Gagal membuat QRIS:', err);
      alert('Gagal membuat QRIS. Silakan coba lagi.');
    }
    setCreatingQRIS(false);
  };

  const checkQRISStatus = async () => {
    if (!qrisData?.transaction_id) return;

    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/payments/qris/check?transaction_id=${qrisData.transaction_id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data.status === 'success') {
          alert('Pembayaran berhasil! QRIS sudah dibayar.');
          setQrisModalOpen(false);
          fetchPayments();
          fetchSummary();
        } else {
          alert(`Status: ${data.data.status}. Silakan bayar terlebih dahulu.`);
        }
      }
    } catch (err) {
      console.error('Gagal cek status:', err);
    }
    setCheckingStatus(false);
  };

  const copyQRString = () => {
    if (qrisData?.qr_string) {
      navigator.clipboard.writeText(qrisData.qr_string);
      setCopiedQRIS(true);
      setTimeout(() => setCopiedQRIS(false), 2000);
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
            const hasQRIS = (payment as any).qris_data?.qr_string;

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
                  <div className="flex gap-2">
                    {payment.status !== 'paid' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openQRISPayment(payment)}
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        QRIS
                      </Button>
                    )}
                  </div>
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
                { value: 'qris', label: 'QRIS' },
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

      {/* QRIS Payment Modal */}
      <Modal
        isOpen={qrisModalOpen}
        onClose={() => setQrisModalOpen(false)}
        title={`QRIS - Rp ${selectedPayment ? Number(selectedPayment.amount).toLocaleString('id-ID') : ''}`}
      >
        <div className="space-y-5">
          {!qrisData ? (
            <div className="text-center py-8">
              <QrCode className="w-16 h-16 mx-auto mb-4 text-blue-500" />
              <p className="text-lg text-slate-700 mb-2">Generate QRIS untuk pembayaran ini</p>
              <p className="text-sm text-slate-500 mb-6">QRIS akan expire dalam 24 jam</p>
              <Button onClick={createQRISPayment} disabled={creatingQRIS}>
                {creatingQRIS ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Membuat QRIS...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QRIS
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* QR Code Display */}
              <div className="bg-white p-6 rounded-xl border-2 border-slate-200 text-center">
                <p className="text-sm text-slate-600 mb-3">Scan QR code di bawah ini</p>
                <div className="inline-block bg-white p-4 rounded-xl border border-slate-300">
                  <QRCodeSVG
                    value={qrisData.qr_string}
                    size={256}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="text-lg font-bold text-blue-700 mt-4">
                  Total: Rp {qrisData.total_to_pay.toLocaleString('id-ID')}
                </p>
                {qrisData.expired_at && (
                  <p className="text-sm text-slate-500 mt-2">
                    Expired: {new Date(qrisData.expired_at).toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              {/* QR String */}
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-slate-600">QR String</p>
                  <button
                    onClick={copyQRString}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                  >
                    {copiedQRIS ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedQRIS ? 'Tersalin!' : 'Salin'}
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={qrisData.qr_string}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-600 font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {qrisData.link && (
                  <Button
                    variant="secondary"
                    onClick={() => window.open(qrisData.link, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Buka Link Pembayaran
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={checkQRISStatus}
                  disabled={checkingStatus}
                >
                  {checkingStatus ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                      Mengecek...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Cek Status Pembayaran
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={() => setQrisModalOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}