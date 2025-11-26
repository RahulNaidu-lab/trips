
export interface Expense {
  id: string;
  category: string;
  amount: number;
  description?: string;
}

export interface Truck {
  id:string;
  number: string;
  model?: string;
  capacity?: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  license?: string;
  photo?: string;
}

export interface Customer {
  id:string;
  name: string;
  phone?: string;
  isTemporary: boolean;
  village?: string;
  companyName?: string;
  isStarred?: boolean;
}

export enum LoadStatus {
  Active = 'Active',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export enum TripStatus {
  Planned = 'Planned',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export interface Trip {
  id: string;
  name: string;
  driverId: string;
  truckId: string;
  status: TripStatus;
  startLocation: string;
  endLocation: string;
  stops: string[];
  totalDieselLitres?: number;
  totalDieselCost?: number;
  driverWages?: number;
  driverAdvance?: number;
}

export interface CustomerPayment {
  amount: number;
  date: string;
  method: string;
  photo?: string;
}

export interface Load {
  id: string;
  customerId: string;
  driverId: string;
  truckId: string;
  tripId?: string;
  
  pickupLocation: string;
  deliveryLocation: string;
  pickupDateTime: string;
  deliveryDateTime?: string;
  
  // Financials from customer
  totalAmount: number;
  customerAdvance: number;
  customerAdvancePaymentMethod?: string; 
  customerPayments?: CustomerPayment[];

  // Expenses
  driverWages: number;
  dieselPrice?: number;
  driverAdvance?: number;
  driverAdvancePaymentMethod?: string; 
  fastagCharges?: number;
  otherExpenses?: Expense[]; // for any other expenses

  driverPayments?: { amount: number; date: string; method: string }[];

  status: LoadStatus;

  // Optional details
  parts: { commodity: string; weight: number }[];
  notes?: string;
  photos?: string[];
  tag?: string; // e.g. GCC, PRIVATE MILLS
}

export interface MaterialEntry {
  id: string;
  materialName: string;
  date: string; // YYYY-MM-DD
  units: number;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  notes?: string;
}

export interface MaterialSale {
  id: string;
  materialEntryId: string;
  customerId: string;
  date: string;
  unitsSold: number;
  salePricePerUnit: number;
  totalSaleAmount: number;
  amountPaid: number;
  payments?: CustomerPayment[];
  notes?: string;
}
