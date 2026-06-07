// Service types
export interface Service {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  total_slots: number;
  owner_cost: number;
  resale_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceInput {
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  total_slots?: number;
  owner_cost: number;
  resale_price: number;
}

// Subscription types
export interface Subscription {
  id: string;
  service_id: string;
  provider_account: string | null;
  invite_link: string | null;
  renewal_date: string;
  status: 'active' | 'expired' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  service?: Service;
  stats?: { total: number; used: number; available: number };
}

export interface CreateSubscriptionInput {
  service_id: string;
  provider_account?: string;
  invite_link?: string;
  renewal_date: string;
  notes?: string;
}

// Customer types
export interface Customer {
  id: string;
  name: string;
  telegram_id: string | null;
  telegram_username: string | null;
  whatsapp: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  active_subscriptions_count?: number;
}

export interface CreateCustomerInput {
  name: string;
  telegram_id?: string;
  telegram_username?: string;
  whatsapp?: string;
  email?: string;
  notes?: string;
}

// Customer Subscription (slot assignment) types
export interface CustomerSubscription {
  id: string;
  customer_id: string;
  subscription_id: string;
  slot_number: number;
  status: 'active' | 'pending' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: Customer;
  subscription?: Subscription;
  next_payment?: Payment;
}

// Payment types
export interface Payment {
  id: string;
  customer_subscription_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  paid_date: string | null;
  payment_method: string | null;
  transaction_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: Customer;
  service?: Service;
  subscription?: Subscription;
}

export interface CreatePaymentInput {
  customer_subscription_id: string;
  amount: number;
  payment_method?: string;
  transaction_ref?: string;
  paid_date?: string;
  notes?: string;
}

// Invite Link types
export interface InviteLink {
  id: string;
  subscription_id: string;
  link: string;
  is_primary: boolean;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

// Dashboard Stats types
export interface DashboardStats {
  total_customers: number;
  active_subscriptions: number;
  revenue: {
    this_month: number;
    last_month: number;
    growth: number;
  };
  upcoming_renewals: {
    this_week: number;
    this_month: number;
  };
  overdue_payments: {
    count: number;
    total: number;
  };
  service_breakdown: Array<{
    service: string;
    active_slots: number;
    revenue: number;
  }>;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Slot types
export interface Slot {
  number: number;
  customer?: Customer;
  status: 'occupied' | 'available';
}

export interface SubscriptionSlots {
  subscription_id: string;
  service: string;
  total_slots: number;
  available_slots: number[];
  occupied_slots: Array<{
    slot: number;
    customer: Customer;
  }>;
}