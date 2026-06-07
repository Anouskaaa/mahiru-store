'use client';

import { useEffect, useState } from 'react';
import { Table, Badge, Button, Modal, Input } from '@/components/ui';
import { Plus, Search, MessageCircle, Mail, Phone } from 'lucide-react';
import type { Customer } from '@/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    telegram_id: '',
    telegram_username: '',
    whatsapp: '',
    email: '',
    notes: '',
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${search}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil pelanggan:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          telegram_id: '',
          telegram_username: '',
          whatsapp: '',
          email: '',
          notes: '',
        });
        fetchCustomers();
      }
    } catch (err) {
      console.error('Gagal membuat pelanggan:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Pelanggan</h1>
          <p className="text-base text-slate-700 mt-1">Kelola pelanggan Anda</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pelanggan
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
        <input
          type="text"
          placeholder="Cari pelanggan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-slate-800"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-blue-200">
          <p className="text-xl text-slate-700 font-semibold">Tidak ada pelanggan ditemukan</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-6">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pelanggan Pertama
          </Button>
        </div>
      ) : (
        <Table headers={['Nama', 'Kontak', 'Langganan', 'Status', 'Aksi']}>
          {customers.map((customer) => (
            <tr key={customer.id} className="hover:bg-blue-50">
              <td className="px-6 py-5">
                <div>
                  <p className="font-bold text-lg text-slate-800">{customer.name}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Ditambahkan {new Date(customer.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </td>
              <td className="px-6 py-5">
                <div className="space-y-2">
                  {customer.telegram_username && (
                    <p className="text-base text-slate-700 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-blue-500" />
                      @{customer.telegram_username}
                    </p>
                  )}
                  {customer.whatsapp && (
                    <p className="text-base text-slate-700 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-blue-500" />
                      {customer.whatsapp}
                    </p>
                  )}
                  {customer.email && (
                    <p className="text-base text-slate-700 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-500" />
                      {customer.email}
                    </p>
                  )}
                </div>
              </td>
              <td className="px-6 py-5">
                <span className="font-bold text-xl text-blue-700">
                  {customer.active_subscriptions_count || 0}
                </span>
              </td>
              <td className="px-6 py-5">
                <Badge variant={customer.is_active ? 'success' : 'danger'}>
                  {customer.is_active ? 'Aktif' : 'Tidak Aktif'}
                </Badge>
              </td>
              <td className="px-6 py-5">
                <Button variant="ghost" size="sm" className="font-semibold">
                  Lihat
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* Add Customer Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Pelanggan Baru">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nama"
            name="name"
            value={formData.name}
            onChange={(v) => setFormData({ ...formData, name: v })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Username Telegram"
              name="telegram_username"
              value={formData.telegram_username}
              onChange={(v) => setFormData({ ...formData, telegram_username: v })}
              placeholder="@username"
            />
            <Input
              label="WhatsApp"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={(v) => setFormData({ ...formData, whatsapp: v })}
              placeholder="+6281234567890"
            />
          </div>
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(v) => setFormData({ ...formData, email: v })}
          />
          <div>
            <label className="block text-base font-semibold text-slate-800 mb-2">Catatan</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Batal
            </Button>
            <Button type="submit">Tambah Pelanggan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}