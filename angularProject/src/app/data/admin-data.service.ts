import { Injectable } from '@angular/core';

export interface OrderItem {
  id: string;
  customer: string;
  status: string;
  amount: number;
}

export interface CreditItem {
  id: number;
  customerId: string;
  amount: number;
  action: 'Add Credit' | 'Edit Credit';
}

export interface CustomerItem {
  id: number;
  name: string;
  email: string;
  company: string;
}

export interface InterviewScheduleItem {
  id: number;
  candidate: string;
  role: string;
  time: string;
}

export interface ContractRequestItem {
  id: number;
  company: string;
  contractType: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

interface AdminDataStore {
  orders: OrderItem[];
  credits: CreditItem[];
  customers: CustomerItem[];
  interviews: InterviewScheduleItem[];
  contractRequests: ContractRequestItem[];
}

const STORAGE_KEY = 'admin-data-v1';


export class OrderApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const defaultData: AdminDataStore = {
  orders: [
    { id: '#1001', customer: 'Acme Corp', status: 'Processing', amount: 2300 },
    { id: '#1002', customer: 'Globex', status: 'Completed', amount: 1150 },
  ],
  credits: [{ id: 1, customerId: 'CUST-1001', amount: 300, action: 'Add Credit' }],
  customers: [
    { id: 1, name: 'Riya Patel', email: 'riya@acme.com', company: 'Acme Corp' },
    { id: 2, name: 'Karan Shah', email: 'karan@globex.com', company: 'Globex' },
  ],
  interviews: [
    { id: 1, candidate: 'Riya Patel', role: 'UI Developer', time: '09:30 AM' },
    { id: 2, candidate: 'Karan Shah', role: 'Node.js Engineer', time: '11:15 AM' },
  ],
  contractRequests: [
    { id: 1, company: 'Acme Corp', contractType: '6-month', status: 'Pending' },
    { id: 2, company: 'Globex', contractType: '12-month', status: 'Approved' },
  ],
};

@Injectable({ providedIn: 'root' })
export class AdminDataService {
  private data: AdminDataStore = this.load();

  getOrders() { return this.data.orders; }
  saveOrder(order: OrderItem, editId?: string) {
    this.upsert('orders', order, editId, (item) => item.id);
  }

  async getOrdersFromDb(): Promise<OrderItem[]> {
    if (typeof window === 'undefined') {
      return this.data.orders;
    }

    const response = await fetch('/api/orders');
    if (!response.ok) {
      throw new OrderApiError(response.status, 'Failed to load orders from database.');
    }

    const orders = (await response.json()) as OrderItem[];
    this.data = { ...this.data, orders };
    this.persist();
    return orders;
  }

  async saveOrderToDb(order: OrderItem, editId?: string): Promise<void> {
    if (typeof window === 'undefined') {
      this.saveOrder(order, editId);
      return;
    }

    const response = await fetch(editId ? `/api/orders/${encodeURIComponent(editId)}` : '/api/orders', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      throw new OrderApiError(response.status, payload.message ?? 'Failed to save order.');
    }

    await this.getOrdersFromDb();
  }

  getCredits() { return this.data.credits; }
  saveCredit(credit: CreditItem, editId?: number) {
    this.upsert('credits', credit, editId, (item) => item.id);
  }

  getCustomers() { return this.data.customers; }
  saveCustomer(customer: CustomerItem, editId?: number) {
    this.upsert('customers', customer, editId, (item) => item.id);
  }

  getInterviews() { return this.data.interviews; }
  saveInterview(interview: InterviewScheduleItem, editId?: number) {
    this.upsert('interviews', interview, editId, (item) => item.id);
  }

  getContractRequests() { return this.data.contractRequests; }
  saveContractRequest(contractRequest: ContractRequestItem, editId?: number) {
    this.upsert('contractRequests', contractRequest, editId, (item) => item.id);
  }

  nextId(list: 'credits' | 'customers' | 'interviews' | 'contractRequests'): number {
    const items = this.data[list];
    return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
  }

  private upsert<K extends keyof AdminDataStore, T extends AdminDataStore[K][number]>(
    key: K,
    item: T,
    editId: unknown,
    getId: (item: T) => unknown,
  ) {
    const list = [...(this.data[key] as T[])];
    if (editId !== undefined) {
      const index = list.findIndex((entry) => getId(entry) === editId);
      if (index > -1) {
        list[index] = item;
      }
    } else {
      list.push(item);
    }

    this.data = { ...this.data, [key]: list };
    this.persist();
  }

  private load(): AdminDataStore {
    try {
      if (typeof localStorage === 'undefined') {
        return defaultData;
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AdminDataStore) : defaultData;
    } catch {
      return defaultData;
    }
  }

  private persist() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }
  }
}
