'use client';

import { useEffect, useState } from 'react';
import { Table, Badge, Button, Modal, Input, Select } from '@/components/ui';
import { Plus, Link as LinkIcon, Calendar, Users, Send, Copy, Check, UserPlus, MessageCircle, Phone } from 'lucide-react';
import type { Subscription, Service, Customer } from '@/types';

interface SlotData {
  slot_number: number;
  is_occupied?: boolean;
  customer?: {
    id: string;
    name: string;
    telegram_username?: string;
    whatsapp?: string;
  };
  invite_link?: string | null;
  is_link_active?: boolean;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<SlotData[]>([]);
  const [subscriptionSlots, setSubscriptionSlots] = useState<Record<string, SlotData[]>>({});
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [sendLinkModalOpen, setSendLinkModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [slotDetailModalOpen, setSlotDetailModalOpen] = useState(false);
  const [selectedSlotDetail, setSelectedSlotDetail] = useState<SlotData | null>(null);

  const [formData, setFormData] = useState({
    service_id: '',
    provider_account: '',
    invite_link: '',
    renewal_date: '',
    notes: '',
  });

  const [assignData, setAssignData] = useState({
    customer_id: '',
    slot_number: 1,
  });

  const [linkData, setLinkData] = useState({
    slot_number: 1,
    invite_link: '',
  });

  const [sendData, setSendData] = useState({
    slot_number: 1,
    method: 'telegram', // 'telegram' or 'whatsapp'
  });

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.data);
        // Fetch slot details for each subscription
        const slotPromises = data.data.map(async (sub: Subscription) => {
          try {
            const slotRes = await fetch(`/api/subscriptions/${sub.id}/slots`);
            if (slotRes.ok) {
              const slotData = await slotRes.json();
              return { id: sub.id, slots: slotData.data?.slots || [] };
            }
          } catch (err) {
            console.error('Gagal fetch slot:', err);
          }
          return { id: sub.id, slots: [] };
        });
        const slotResults = await Promise.all(slotPromises);
        const slotMap: Record<string, SlotData[]> = {};
        slotResults.forEach(r => { slotMap[r.id] = r.slots; });
        setSubscriptionSlots(slotMap);
      }
    } catch (err) {
      console.error('Gagal mengambil langganan:', err);
    }
    setLoading(false);
  };

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        const data = await res.json();
        setServices(data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil layanan:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil pelanggan:', err);
    }
  };

  const fetchSlotDetails = async (subId: string): Promise<SlotData[]> => {
    try {
      const res = await fetch(`/api/subscriptions/${subId}/slots`);
      if (res.ok) {
        const data = await res.json();
        const slots = data.data?.slots || [];
        setSelectedSlots(slots);
        return slots;
      }
    } catch (err) {
      console.error('Gagal mengambil detail slot:', err);
    }
    return [];
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchServices();
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          service_id: '',
          provider_account: '',
          invite_link: '',
          renewal_date: '',
          notes: '',
        });
        fetchSubscriptions();
      }
    } catch (err) {
      console.error('Gagal membuat langganan:', err);
    }
  };

  const getDaysUntilRenewal = (date: string) => {
    const today = new Date();
    const renewal = new Date(date);
    return Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getRenewalBadge = (date: string) => {
    const days = getDaysUntilRenewal(date);
    if (days <= 0) return { variant: 'danger' as const, text: 'Expired' };
    if (days <= 7) return { variant: 'danger' as const, text: `${days} hari` };
    if (days <= 30) return { variant: 'warning' as const, text: `${days} hari` };
    return { variant: 'success' as const, text: `${days} hari` };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const openSlotManagement = (sub: Subscription) => {
    setSelectedSub(sub);
    fetchSlotDetails(sub.id);
    setAssignModalOpen(true);
  };

  const openLinkManagement = (sub: Subscription) => {
    setSelectedSub(sub);
    fetchSlotDetails(sub.id);
    setLinkModalOpen(true);
  };

  const openSendLink = (sub: Subscription) => {
    setSelectedSub(sub);
    fetchSlotDetails(sub.id);
    setSendLinkModalOpen(true);
  };

  const viewSlotDetail = async (sub: Subscription, slot: number) => {
    setSelectedSub(sub);
    const slots = await fetchSlotDetails(sub.id);
    const slotData = slots.find(s => s.slot_number === slot);
    setSelectedSlotDetail(slotData || null);
    setSlotDetailModalOpen(true);
  };

  const handleAssignCustomer = async () => {
    if (!selectedSub) return;

    try {
      const res = await fetch(`/api/subscriptions/${selectedSub.id}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: assignData.customer_id,
          slot_number: assignData.slot_number,
        }),
      });

      if (res.ok) {
        setAssignModalOpen(false);
        setAssignData({ customer_id: '', slot_number: 1 });
        fetchSubscriptions();
      }
    } catch (err) {
      console.error('Gagal assign customer:', err);
    }
  };

  const handleAddLink = async () => {
    if (!selectedSub) return;

    try {
      const res = await fetch(`/api/subscriptions/${selectedSub.id}/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_number: linkData.slot_number,
          invite_link: linkData.invite_link,
        }),
      });

      if (res.ok) {
        alert(`Link untuk slot ${linkData.slot_number} berhasil disimpan!`);
        setLinkModalOpen(false);
        setLinkData({ slot_number: 1, invite_link: '' });
        // Refresh slot data
        const slots = await fetchSlotDetails(selectedSub.id);
        // Update subscriptionSlots for this subscription
        setSubscriptionSlots(prev => ({
          ...prev,
          [selectedSub.id]: slots,
        }));
        // Update slot detail modal if open
        if (slotDetailModalOpen && selectedSlotDetail) {
          const updatedSlot = slots.find(s => s.slot_number === selectedSlotDetail.slot_number);
          if (updatedSlot) setSelectedSlotDetail(updatedSlot);
        }
        fetchSubscriptions();
      } else {
        const error = await res.json();
        alert(`Gagal menyimpan link: ${error.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Gagal menambahkan link:', err);
      alert('Gagal menyimpan link. Silakan coba lagi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Langganan</h1>
          <p className="text-base text-slate-700 mt-1">Kelola instance family plan dan slot invite</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Langganan
        </Button>
      </div>

      {/* Subscriptions List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-blue-200">
          <p className="text-xl text-slate-700 font-semibold">Tidak ada langganan ditemukan</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-6">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Langganan Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {subscriptions.map((sub) => {
            const renewal = getRenewalBadge(sub.renewal_date);
            const stats = sub.stats || { total: 6, used: 0, available: 6 };

            return (
              <div
                key={sub.id}
                className="bg-white rounded-xl border-2 border-blue-200 p-6 hover:shadow-xl hover:border-blue-400 transition-all"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h3 className="font-bold text-xl text-slate-800">
                        {sub.service?.display_name || 'Layanan Tidak Dikenal'}
                      </h3>
                      <Badge variant={sub.status === 'active' ? 'success' : 'danger'}>
                        {sub.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                      </Badge>
                      <Badge variant={renewal.variant}>{renewal.text}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-base">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold">Perpanjang {new Date(sub.renewal_date).toLocaleDateString('id-ID')}</span>
                      </div>
                      {sub.provider_account && (
                        <div className="text-slate-700">
                          <span className="font-semibold">Akun:</span> <span className="font-bold">{sub.provider_account}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-700">
                        <Users className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold">{stats.used}/{stats.total} slot digunakan</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openLinkManagement(sub)}>
                      <LinkIcon className="w-4 h-4 mr-1" />
                      Kelola Link
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openSendLink(sub)}>
                      <Send className="w-4 h-4 mr-1" />
                      Kirim Link
                    </Button>
                    <Button onClick={() => openSlotManagement(sub)}>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Kelola Slot
                    </Button>
                  </div>
                </div>

                {/* Slot Grid */}
                <div className="mt-4">
                  <h4 className="font-semibold text-lg text-slate-800 mb-3">Slot Invite</h4>
                  <div className="flex flex-wrap gap-3">
                    {Array.from({ length: stats.total }, (_, i) => i + 1).map((slot) => {
                      const isOccupied = slot <= stats.used;
                      const slotDetail = subscriptionSlots[sub.id]?.find(s => s.slot_number === slot);
                      const hasLink = slotDetail?.invite_link;
                      return (
                        <div
                          key={slot}
                          className={`w-full md:w-56 p-4 rounded-xl border-2 cursor-pointer hover:shadow-lg transition-all ${
                            isOccupied
                              ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-500'
                              : hasLink
                                ? 'bg-blue-50 border-blue-300 hover:border-blue-500'
                                : 'bg-slate-50 border-slate-200 hover:border-blue-400'
                          }`}
                          onClick={() => viewSlotDetail(sub, slot)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-bold text-lg ${
                              isOccupied ? 'text-emerald-700' : hasLink ? 'text-blue-700' : 'text-slate-500'
                            }`}>
                              Slot {slot}
                            </span>
                            {isOccupied ? (
                              <Check className="w-5 h-5 text-emerald-500" />
                            ) : hasLink ? (
                              <LinkIcon className="w-5 h-5 text-blue-500" />
                            ) : (
                              <span className="text-sm text-slate-400">Kosong</span>
                            )}
                          </div>
                          {isOccupied ? (
                            <p className="text-sm text-emerald-600 font-medium">Terpakai - Klik untuk detail</p>
                          ) : hasLink ? (
                            <p className="text-sm text-blue-600 font-medium">Link Tersedia - Klik untuk detail</p>
                          ) : (
                            <p className="text-sm text-slate-500">Klik untuk tambah link</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Slot Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(stats.used / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-base font-semibold text-blue-700">
                      {stats.available} slot tersedia
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Subscription Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Langganan Baru">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Layanan"
            name="service_id"
            value={formData.service_id}
            onChange={(v) => setFormData({ ...formData, service_id: v })}
            options={services.map((s) => ({ value: s.id, label: s.display_name }))}
            required
          />
          <Input
            label="Akun Provider"
            name="provider_account"
            value={formData.provider_account}
            onChange={(v) => setFormData({ ...formData, provider_account: v })}
            placeholder="email@example.com"
          />
          <Input
            label="Link Invite Utama"
            name="invite_link"
            type="url"
            value={formData.invite_link}
            onChange={(v) => setFormData({ ...formData, invite_link: v })}
            placeholder="https://..."
          />
          <Input
            label="Tanggal Perpanjangan"
            name="renewal_date"
            type="date"
            value={formData.renewal_date}
            onChange={(v) => setFormData({ ...formData, renewal_date: v })}
            required
          />
          <div>
            <label className="block text-base font-semibold text-slate-800 mb-2">Catatan</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Batal
            </Button>
            <Button type="submit">Tambah Langganan</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Customer Modal */}
      <Modal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title={`Kelola Slot - ${selectedSub?.service?.display_name || ''}`}>
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-slate-800 mb-2">Pilih Slot</label>
            <select
              value={assignData.slot_number}
              onChange={(e) => setAssignData({ ...assignData, slot_number: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {Array.from({ length: selectedSub?.service?.total_slots || 6 }, (_, i) => i + 1).map((slot) => (
                <option key={slot} value={slot}>Slot {slot}</option>
              ))}
            </select>
          </div>

          <Select
            label="Pilih Pelanggan"
            name="customer_id"
            value={assignData.customer_id}
            onChange={(v) => setAssignData({ ...assignData, customer_id: v })}
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)} type="button">
              Batal
            </Button>
            <Button onClick={handleAssignCustomer}>Assign Pelanggan</Button>
          </div>
        </div>
      </Modal>

      {/* Link Management Modal */}
      <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title={`Kelola Link Invite - ${selectedSub?.service?.display_name || ''}`}>
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-slate-800 mb-2">Pilih Slot</label>
            <select
              value={linkData.slot_number}
              onChange={(e) => setLinkData({ ...linkData, slot_number: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {Array.from({ length: selectedSub?.service?.total_slots || 6 }, (_, i) => i + 1).map((slot) => (
                <option key={slot} value={slot}>Slot {slot}</option>
              ))}
            </select>
          </div>

          <Input
            label="Link Invite untuk Slot ini"
            name="invite_link"
            type="url"
            value={linkData.invite_link}
            onChange={(v) => setLinkData({ ...linkData, invite_link: v })}
            placeholder="https://..."
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setLinkModalOpen(false)} type="button">
              Batal
            </Button>
            <Button onClick={handleAddLink}>Simpan Link</Button>
          </div>
        </div>
      </Modal>

      {/* Send Link Modal */}
      <Modal isOpen={sendLinkModalOpen} onClose={() => setSendLinkModalOpen(false)} title={`Kirim Link Invite - ${selectedSub?.service?.display_name || ''}`}>
        <div className="space-y-5">
          <div>
            <label className="block text-base font-semibold text-slate-800 mb-2">Pilih Slot</label>
            <select
              value={sendData.slot_number}
              onChange={(e) => setSendData({ ...sendData, slot_number: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {Array.from({ length: selectedSub?.service?.total_slots || 6 }, (_, i) => i + 1).map((slot) => {
                const slotInfo = selectedSlots.find(s => s.slot_number === slot);
                return (
                  <option key={slot} value={slot}>
                    Slot {slot} {slotInfo?.is_occupied ? `- ${slotInfo.customer?.name || 'Terpakai'}` : '- Kosong'}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-800 mb-2">Metode Pengiriman</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setSendData({ ...sendData, method: 'telegram' })}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  sendData.method === 'telegram'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                }`}
              >
                <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">Telegram</p>
              </button>
              <button
                type="button"
                onClick={() => setSendData({ ...sendData, method: 'whatsapp' })}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  sendData.method === 'whatsapp'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-green-300'
                }`}
              >
                <Phone className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">WhatsApp</p>
              </button>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
            <p className="text-base text-blue-800">
              <strong>Catatan:</strong> Untuk mengirim link, Anda perlu mengklik slot di bawah dan menyalin link invite, lalu mengirim secara manual ke customer via {sendData.method === 'telegram' ? 'Telegram' : 'WhatsApp'}.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setSendLinkModalOpen(false)} type="button">
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Slot Detail Modal */}
      <Modal isOpen={slotDetailModalOpen} onClose={() => setSlotDetailModalOpen(false)} title={`Detail Slot ${selectedSlotDetail?.slot_number}`}>
        <div className="space-y-5">
          <div className={`p-4 rounded-xl border-2 ${selectedSlotDetail?.is_occupied ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl text-slate-800">Slot {selectedSlotDetail?.slot_number}</h3>
              {selectedSlotDetail?.is_occupied ? (
                <Badge variant="success">Terpakai</Badge>
              ) : (
                <Badge variant="default">Kosong</Badge>
              )}
            </div>

            {selectedSlotDetail?.is_occupied && selectedSlotDetail.customer && (
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-sm text-slate-600">Nama Pelanggan</p>
                  <p className="font-bold text-lg text-slate-800">{selectedSlotDetail.customer.name}</p>
                </div>
                {selectedSlotDetail.customer.telegram_username && (
                  <div>
                    <p className="text-sm text-slate-600">Telegram</p>
                    <p className="font-semibold text-slate-700">@{selectedSlotDetail.customer.telegram_username}</p>
                  </div>
                )}
                {selectedSlotDetail.customer.whatsapp && (
                  <div>
                    <p className="text-sm text-slate-600">WhatsApp</p>
                    <p className="font-semibold text-slate-700">{selectedSlotDetail.customer.whatsapp}</p>
                  </div>
                )}
              </div>
            )}

            {selectedSlotDetail?.invite_link ? (
              <div className="mt-4">
                <p className="text-sm text-slate-600 mb-2">Link Invite</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedSlotDetail.invite_link}
                    className="flex-1 px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-sm"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(selectedSlotDetail.invite_link!)}
                  >
                    {copiedLink === selectedSlotDetail.invite_link ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                {copiedLink === selectedSlotDetail.invite_link && (
                  <p className="text-sm text-emerald-600 mt-2 font-semibold">Link berhasil disalin!</p>
                )}
              </div>
            ) : (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-amber-700 text-sm">Belum ada link invite untuk slot ini.</p>
                <p className="text-amber-600 text-xs mt-1">Klik "Kelola Link" untuk menambahkan link invite.</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {selectedSlotDetail?.invite_link && (
              <>
                {selectedSlotDetail.customer?.telegram_username && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const message = encodeURIComponent(`Hai ${selectedSlotDetail.customer?.name}! Berikut link invite kamu:\n${selectedSlotDetail.invite_link}`);
                      window.open(`https://t.me/${selectedSlotDetail.customer?.telegram_username}`, '_blank');
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Kirim via Telegram
                  </Button>
                )}
                {selectedSlotDetail.customer?.whatsapp && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const message = encodeURIComponent(`Hai ${selectedSlotDetail.customer?.name}! Berikut link invite kamu:\n${selectedSlotDetail.invite_link}`);
                      window.open(`https://wa.me/${selectedSlotDetail.customer?.whatsapp?.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
                    }}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Kirim via WhatsApp
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setSlotDetailModalOpen(false)} type="button">
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}