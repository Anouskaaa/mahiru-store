'use client';

import { useEffect, useState } from 'react';
import { Table, Badge, Button, Modal, Input, Select } from '@/components/ui';
import { Plus, Users, DollarSign } from 'lucide-react';
import type { Service } from '@/types';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    icon: '',
    total_slots: '6',
    owner_cost: '',
    resale_price: '',
  });

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        const data = await res.json();
        setServices(data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil layanan:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          total_slots: parseInt(formData.total_slots),
          owner_cost: parseFloat(formData.owner_cost),
          resale_price: parseFloat(formData.resale_price),
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          display_name: '',
          description: '',
          icon: '',
          total_slots: '6',
          owner_cost: '',
          resale_price: '',
        });
        fetchServices();
      }
    } catch (err) {
      console.error('Gagal membuat layanan:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Layanan</h1>
          <p className="text-base text-slate-700 mt-1">Kelola penawaran langganan Anda</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Layanan
        </Button>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-blue-200">
          <p className="text-xl text-slate-700 font-semibold">Tidak ada layanan ditemukan</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-6">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Layanan Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl border-2 border-blue-200 p-6 hover:shadow-xl hover:border-blue-400 transition-all"
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-bold text-xl text-slate-800">{service.display_name}</h3>
                  <p className="text-base text-slate-600 mt-1">{service.name}</p>
                </div>
                <Badge variant={service.is_active ? 'success' : 'danger'}>
                  {service.is_active ? 'Aktif' : 'Tidak Aktif'}
                </Badge>
              </div>

              {service.description && (
                <p className="text-base text-slate-700 mb-5">{service.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="flex items-center gap-2 text-base text-slate-700">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold">{service.total_slots} slot</span>
                </div>
                <div className="flex items-center gap-2 text-base text-slate-700">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  <span className="font-bold text-blue-700">Rp {service.resale_price.toLocaleString('id-ID')}/bln</span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-200">
                <p className="text-base text-slate-700">
                  <span className="font-semibold">Biaya:</span> <span className="font-bold text-slate-800">Rp {service.owner_cost.toLocaleString('id-ID')}/bln</span>
                </p>
                <p className="text-base text-emerald-700 font-bold bg-emerald-100 inline-block px-3 py-2 rounded mt-3">
                  Profit: Rp {(service.resale_price - service.owner_cost).toLocaleString('id-ID')}/bln
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Layanan Baru">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nama"
              name="name"
              value={formData.name}
              onChange={(v) => setFormData({ ...formData, name: v })}
              placeholder="spotify_family"
              required
            />
            <Input
              label="Nama Tampilan"
              name="display_name"
              value={formData.display_name}
              onChange={(v) => setFormData({ ...formData, display_name: v })}
              placeholder="Spotify Family"
              required
            />
          </div>
          <div>
            <label className="block text-base font-semibold text-slate-800 mb-2">Deskripsi</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Total Slot"
              name="total_slots"
              type="number"
              value={formData.total_slots}
              onChange={(v) => setFormData({ ...formData, total_slots: v })}
            />
            <Input
              label="Biaya Anda (Rp)"
              name="owner_cost"
              type="number"
              value={formData.owner_cost}
              onChange={(v) => setFormData({ ...formData, owner_cost: v })}
              required
            />
            <Input
              label="Harga Jual (Rp)"
              name="resale_price"
              type="number"
              value={formData.resale_price}
              onChange={(v) => setFormData({ ...formData, resale_price: v })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Batal
            </Button>
            <Button type="submit">Tambah Layanan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}