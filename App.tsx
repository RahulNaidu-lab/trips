
import React, { useState, useContext, createContext, useEffect, useMemo, ReactNode, useRef } from 'react';
import { Truck, Driver, Customer, Load, LoadStatus, CustomerPayment, Expense, Trip, TripStatus } from './types';
import { GoogleGenAI } from "@google/genai";

// --- TYPE DEFINITIONS ---
type Page =
  | { name: 'dashboard' }
  | { name: 'loads' }
  | { name: 'add-load'; loadId?: string }
  | { name: 'trips' }
  | { name: 'add-trip'; tripId?: string }
  | { name: 'trip-details'; tripId: string }
  | { name: 'customers' }
  | { name: 'add-customer'; customerId?: string }
  | { name: 'customer-details'; customerId: string }
  | { name: 'drivers' }
  | { name: 'add-driver'; driverId?: string }
  | { name: 'driver-details'; driverId: string }
  | { name: 'trucks' }
  | { name: 'add-truck'; truckId?: string }
  | { name: 'truck-details'; truckId: string };

// Extend DriverPayment to include photo
interface DriverPayment {
    amount: number;
    date: string;
    method: string;
    photo?: string;
}

// Override Load interface locally if needed or just cast, but better to update types.ts usually. 
// Since I can only update App.tsx in this prompt turn and types.ts is separate, I will cast or augment where I can, 
// but for this single file solution context, I will treat Load's driverPayments as having photos.
// We will update the usage of Load in App.tsx to reflect this structure.

type AppContextType = {
  trucks: Truck[];
  addTruck: (truck: Omit<Truck, 'id'>) => void;
  updateTruck: (truck: Truck) => void;
  drivers: Driver[];
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (driver: Driver) => void;
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateCustomer: (customer: Customer) => void;
  loads: Load[];
  addLoad: (load: Omit<Load, 'id'>) => void;
  updateLoad: (load: Load) => void;
  trips: Trip[];
  addTrip: (trip: Omit<Trip, 'id'>) => void;
  updateTrip: (trip: Trip) => void;
  getTruckById: (id: string) => Truck | undefined;
  getDriverById: (id: string) => Driver | undefined;
  getCustomerById: (id: string) => Customer | undefined;
  getLoadById: (id: string) => Load | undefined;
  getTripById: (id: string) => Trip | undefined;
};

// --- HELPER ---
const downloadImage = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- ICONS ---
const DashboardIcon = ({ active }: { active: boolean }) => ( <div className={`h-6 w-6 ${active ? 'text-yellow-500' : 'text-gray-500'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg></div> );
const LoadsIcon = ({ active }: { active: boolean }) => ( <div className={`h-6 w-6 ${active ? 'text-yellow-500' : 'text-gray-500'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg></div> );
const TripsIcon = ({ active }: { active: boolean }) => ( <div className={`h-6 w-6 ${active ? 'text-yellow-500' : 'text-gray-500'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 16.382V5.618a1 1 0 00-1.447-.894L15 7m0 10V7" /></svg></div> );
const CustomersIcon = ({ active }: { active: boolean }) => ( <div className={`h-6 w-6 ${active ? 'text-yellow-500' : 'text-gray-500'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm-9 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div> );
const DriversIcon = ({ active }: { active: boolean }) => ( <div className={`h-6 w-6 ${active ? 'text-yellow-500' : 'text-gray-500'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div> );
const TrucksIcon = ({ active }: { active: boolean }) => ( <div className={`h-6 w-6 ${active ? 'text-yellow-500' : 'text-gray-500'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 0 1 3.375-3.375h9.75a3.375 3.375 0 0 1 3.375 3.375v1.875M3.375 9h17.25M3.375 9v-1.875a3.375 3.375 0 0 1 3.375-3.375h9.75a3.375 3.375 0 0 1 3.375 3.375V9Z" /></svg></div> );
const BackIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> );
const SearchIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> );
const FilterIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg> );
const EmptyBoxIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> );
const StarIcon = ({ filled = false }: { filled?: boolean }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${filled ? 'text-red-600' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>);
const MicIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg> );
const PencilIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg> );
const TranslateIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg> );

// --- CONTEXT ---
const AppContext = createContext<AppContextType | null>(null);
const useAppContext = () => { const context = useContext(AppContext); if (!context) { throw new Error('useAppContext must be used within an AppProvider'); } return context; };

// --- HOOKS ---
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try { const item = window.localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; }
    catch (error) { console.error(error); return initialValue; }
  });
  const setValue = (value: React.SetStateAction<T>) => {
    try { const valueToStore = value instanceof Function ? value(storedValue) : value; setStoredValue(valueToStore); window.localStorage.setItem(key, JSON.stringify(valueToStore)); }
    catch (error) { console.error(error); }
  };
  return [storedValue, setValue];
};

const useSpeechRecognition = (onResult: (text: string) => void, lang: string = 'en-US') => {
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    recognition.start();
  };

  return { isListening, startListening };
};

// --- GENAI TRANSLATION ---
const translateText = async (text: string): Promise<string> => {
  if (!process.env.API_KEY) {
      alert("API Key not found.");
      return text;
  }
  try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Prompt for automatic detection and translation between English and Telugu
      const prompt = `Translate the following text. If it is in English, translate it to Telugu. If it is in Telugu, translate it to English. Only return the translated text:\n\n${text}`;
      
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
      });
      return response.text || text;
  } catch (e) {
      console.error("Translation failed", e);
      return text;
  }
};

// --- PROVIDER ---
const AppProvider = ({ children }: { children?: React.ReactNode }) => {
  const [trucks, setTrucks] = useLocalStorage<Truck[]>('trucks', []);
  const [drivers, setDrivers] = useLocalStorage<Driver[]>('drivers', []);
  const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', []);
  const [loads, setLoads] = useLocalStorage<Load[]>('loads', []);
  const [trips, setTrips] = useLocalStorage<Trip[]>('trips', []);
  
  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  const addTruck = (truck: Omit<Truck, 'id'>) => setTrucks(prev => [...prev, { ...truck, id: generateId('truck') }]);
  const updateTruck = (updatedTruck: Truck) => setTrucks(prev => prev.map(t => t.id === updatedTruck.id ? updatedTruck : t));
  const addDriver = (driver: Omit<Driver, 'id'>) => setDrivers(prev => [...prev, { ...driver, id: generateId('driver') }]);
  const updateDriver = (updatedDriver: Driver) => setDrivers(prev => prev.map(d => d.id === updatedDriver.id ? updatedDriver : d));
  const addCustomer = (customer: Omit<Customer, 'id'>) => setCustomers(prev => [...prev, { ...customer, id: generateId('customer') }]);
  const updateCustomer = (updatedCustomer: Customer) => setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
  const addLoad = (load: Omit<Load, 'id'>) => setLoads(prev => [...prev, { ...load, id: generateId('load') }]);
  const updateLoad = (updatedLoad: Load) => setLoads(prev => prev.map(load => load.id === updatedLoad.id ? updatedLoad : load));
  
  const addTrip = (tripData: Omit<Trip, 'id'>) => {
    const newTrip = { ...tripData, id: generateId('trip') };
    setTrips(prev => [...prev, newTrip]);

    const route = [newTrip.startLocation, ...newTrip.stops, newTrip.endLocation].filter(loc => loc && loc.trim() !== '');
    if (route.length < 2) return;

    const newLoads: Omit<Load, 'id'>[] = [];
    for (let i = 0; i < route.length - 1; i++) {
      const legLoad: Omit<Load, 'id'> = {
        customerId: '',
        driverId: newTrip.driverId,
        truckId: newTrip.truckId,
        tripId: newTrip.id,
        pickupLocation: route[i],
        deliveryLocation: route[i + 1],
        pickupDateTime: new Date().toISOString(),
        totalAmount: 0,
        customerAdvance: 0,
        driverWages: 0,
        status: LoadStatus.Active,
        parts: [],
      };
      newLoads.push(legLoad);
    }
    
    setLoads(prev => [
      ...prev,
      ...newLoads.map((load, index) => ({ ...load, id: generateId('load') }))
    ]);
  };

  const updateTrip = (updatedTrip: Trip) => {
    setTrips(prev => prev.map(t => (t.id === updatedTrip.id ? updatedTrip : t)));
  };

  const getTruckById = (id: string) => trucks.find(t => t.id === id);
  const getDriverById = (id: string) => drivers.find(d => d.id === id);
  const getCustomerById = (id: string) => customers.find(c => c.id === id);
  const getLoadById = (id: string) => loads.find(l => l.id === id);
  const getTripById = (id: string) => trips.find(t => t.id === id);
    
  const value = {
    trucks, addTruck, updateTruck,
    drivers, addDriver, updateDriver,
    customers, addCustomer, updateCustomer,
    loads, addLoad, updateLoad,
    trips, addTrip, updateTrip,
    getTruckById, getDriverById, getCustomerById, getLoadById, getTripById,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// --- UI COMPONENTS ---
const PageHeader = ({ title, action }: { title: string, action?: ReactNode }) => (
    <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-serif text-gray-800">{title}</h2>
        {action}
    </div>
);
const FormHeader = ({ title, onBack, action }: { title: string, onBack: () => void, action?: ReactNode }) => (
    <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
            <button onClick={onBack} className="text-gray-600 hover:text-gray-900"><BackIcon /></button>
            <h2 className="text-3xl font-serif text-gray-800">{title}</h2>
        </div>
        {action}
    </div>
);
const Input = ({ label, placeholder, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <div>
        <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
        <input className={`block w-full bg-gray-50 border-gray-300 rounded-lg shadow-md focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-4 text-black font-bold transition-shadow duration-200 focus:shadow-lg placeholder:text-gray-400 ${className}`} placeholder={placeholder || `Enter ${label.toLowerCase()}`} {...props} />
    </div>
);

// Enhanced Input with Mic support
const InputWithMic = ({ label, value, onChange, placeholder, lang = 'te-IN', ...props }: any) => {
  const { isListening, startListening } = useSpeechRecognition((text) => {
      const event = { target: { value: text, name: props.name } } as any;
      if (onChange) onChange(event);
  }, lang);

  return (
      <div className="relative">
          <Input label={label} value={value} onChange={onChange} placeholder={placeholder} {...props} />
          <button onClick={startListening} className={`absolute top-8 right-3 p-1 rounded-full transition-colors ${isListening ? 'text-red-600 animate-pulse' : 'text-gray-400 hover:text-indigo-600'}`}>
              <MicIcon />
          </button>
      </div>
  );
};

// Separate component for Stop Input to avoid focus issues
const StopInputWithMic: React.FC<{ index: number, value: string, onChange: (val: string) => void, onRemove?: () => void, disabled?: boolean }> = ({ index, value, onChange, onRemove, disabled }) => {
    const { isListening, startListening } = useSpeechRecognition((text) => {
        onChange(text);
    }, 'te-IN');

    return (
        <div className="relative flex items-center space-x-2 mb-2">
            <div className="relative flex-grow">
                 <input
                    className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-md focus:ring-indigo-500 focus:border-indigo-500 py-2.5 pl-4 pr-10 text-black font-bold transition-shadow duration-200 focus:shadow-lg placeholder:text-gray-400"
                    placeholder={`Stop ${index + 1} (e.g., Surat)`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                 />
                 <button onClick={startListening} className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${isListening ? 'text-red-600 animate-pulse' : 'text-gray-400 hover:text-indigo-600'}`}>
                    <MicIcon />
                </button>
            </div>
            {!disabled && onRemove && (
                <button onClick={onRemove} className="text-red-500 hover:text-red-700 font-extrabold text-2xl p-1 w-8 flex items-center justify-center">
                    &times;
                </button>
            )}
        </div>
    );
};

// Expense Row with Mic
const ExpenseRowWithMic: React.FC<{ description: string, amount: string, onChange: (field: 'description' | 'amount', value: string) => void, onRemove: () => void }> = ({ description, amount, onChange, onRemove }) => {
    const { isListening, startListening } = useSpeechRecognition((text) => {
        onChange('description', text);
    }, 'te-IN');

    return (
         <div className="flex items-center space-x-2 mb-2">
            <div className="relative flex-grow">
                 <input type="text" placeholder="Expense Description" value={description} onChange={(e) => onChange('description', e.target.value)} className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 pr-8 px-3 text-sm font-bold text-black" />
                 <button onClick={startListening} className={`absolute right-2 top-1.5 p-1 rounded-full ${isListening ? 'text-red-600 animate-pulse' : 'text-gray-400'}`}>
                    <MicIcon />
                 </button>
            </div>
            <input type="number" placeholder="Amount" value={amount} onChange={(e) => onChange('amount', e.target.value)} className="block w-24 bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 text-sm font-bold text-black" />
            <button onClick={onRemove} className="text-red-500 hover:text-red-700 font-extrabold text-2xl p-0 h-8 w-8 flex items-center justify-center">&times;</button>
        </div>
    );
};

const Select = ({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>}
        <select className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-md focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-4 text-black font-bold transition-shadow duration-200 focus:shadow-lg" {...props}>{children}</select>
    </div>
);
const PrimaryButton = ({ onClick, children, className = '' }: { onClick?: () => void; children?: ReactNode; className?: string }) => (
    <button onClick={onClick} className={`w-full bg-indigo-900 text-white p-3.5 rounded-lg font-bold hover:bg-indigo-800 transition-colors shadow-lg ${className}`}>
        {children}
    </button>
);
const StatCard = ({ title, value, color, onClick }: { title: string, value: number | string, color: string, onClick?: () => void }) => (
    <div onClick={onClick} className={`p-5 rounded-xl shadow-md flex flex-col justify-between ${color} ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-all' : ''}`}>
        <p className="text-sm font-bold opacity-90 uppercase tracking-wider">{title}</p>
        <p className="text-4xl font-bold self-end">{value}</p>
    </div>
);
const StatusChip = ({ status }: { status: LoadStatus }) => {
    const colors: Record<LoadStatus, string> = {
        [LoadStatus.Active]: 'bg-blue-100 text-blue-800',
        [LoadStatus.Completed]: 'bg-green-100 text-green-800',
        [LoadStatus.Cancelled]: 'bg-red-100 text-red-800',
    };
    return <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${colors[status]}`}>{status}</span>;
};
const StatusSelect = ({ status, onChange }: { status: LoadStatus, onChange: (s: LoadStatus) => void }) => {
    const colors: Record<LoadStatus, string> = {
        [LoadStatus.Active]: 'bg-blue-100 text-blue-800',
        [LoadStatus.Completed]: 'bg-green-100 text-green-800',
        [LoadStatus.Cancelled]: 'bg-red-100 text-red-800',
    };
    return (
        <div className="relative inline-block" onClick={e => e.stopPropagation()}>
            <select 
                value={status} 
                onChange={(e) => onChange(e.target.value as LoadStatus)}
                className={`appearance-none ${colors[status]} font-bold text-xs py-1 pl-2.5 pr-6 rounded-full border-none focus:ring-0 cursor-pointer`}
            >
                 {Object.values(LoadStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-current">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
        </div>
    );
}
const FormSection = ({ title, children }: { title: string, children?: ReactNode }) => (
  <div className="bg-white p-5 rounded-xl shadow-md space-y-4">
    <h3 className="text-xl font-serif text-gray-800 border-b pb-3 mb-4">{title}</h3>
    {children}
  </div>
);
const NavLink = ({ pageName, icon, label, page, setPage }: { pageName: Page['name'], icon: ReactNode, label: string, page: Page, setPage: (page: Page) => void }) => {
    const isActive = page.name.startsWith(pageName);
    return (
        <button onClick={() => setPage({ name: pageName } as Page)} className={`flex flex-col items-center justify-center space-y-1 w-full py-2 transition-colors ${isActive ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-400'}`}>
            {icon}
            <span className={`text-xs font-bold ${isActive ? 'text-indigo-900' : ''}`}>{label}</span>
        </button>
    );
};
const AutocompleteInput = ({ label, value, onSelect, suggestions, displayValue, placeholder }: { label: string; value: string; onSelect: (id: string) => void; suggestions: { id: string; name: string; image?: string }[]; displayValue: (id: string) => string; placeholder: string; }) => {
    const [inputValue, setInputValue] = useState('');
    const [filteredSuggestions, setFilteredSuggestions] = useState<{ id: string; name: string; image?: string }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setInputValue(displayValue(value)); }, [value, displayValue]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) { setShowSuggestions(false); } };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setInputValue(text);
        if (text) { setFilteredSuggestions(suggestions.filter(s => s.name.toLowerCase().includes(text.toLowerCase()))); setShowSuggestions(true); } 
        else { setFilteredSuggestions([]); setShowSuggestions(false); onSelect(''); }
    };

    const handleSelect = (suggestion: { id: string; name: string }) => { setInputValue(suggestion.name); onSelect(suggestion.id); setFilteredSuggestions([]); setShowSuggestions(false); };

    return (
        <div ref={wrapperRef} className="relative">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
            <input type="text" value={inputValue} onChange={handleChange} onFocus={() => { if (inputValue) { setFilteredSuggestions(suggestions.filter(s => s.name.toLowerCase().includes(inputValue.toLowerCase()))); setShowSuggestions(true); } }} placeholder={placeholder} className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-md focus:ring-indigo-500 focus:border-indigo-500 py-2.5 px-4 text-black font-bold transition-shadow duration-200 focus:shadow-lg placeholder:text-gray-400" />
            {showSuggestions && filteredSuggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto shadow-lg">
                    {filteredSuggestions.map(suggestion => ( 
                        <li key={suggestion.id} onClick={() => handleSelect(suggestion)} className="cursor-pointer hover:bg-gray-100 p-2 font-bold text-black flex items-center">
                            {suggestion.image && <img src={suggestion.image} className="w-8 h-8 rounded-full object-cover mr-3 border border-gray-200" alt="" />}
                            <span>{suggestion.name}</span>
                        </li> 
                    ))}
                </ul>
            )}
        </div>
    );
};

type ModalProps = { isOpen: boolean, onClose: () => void, children?: ReactNode };
const Modal = ({ isOpen, onClose, children }: ModalProps) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
};

// --- Payment History Component ---
const PaymentHistory = ({ payments }: { payments: { amount: number, date?: string, method?: string, label?: string, photo?: string }[] }) => {
    const [viewPhoto, setViewPhoto] = useState<string | null>(null);

    if (!payments || payments.length === 0) return null;

    return (
        <>
        <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
            <div className="space-y-2">
                {payments.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                         <span className="text-gray-500 flex items-center">
                            {p.label && <span className="font-bold text-gray-700 mr-1">{p.label}</span>}
                            {p.date ? `on ${new Date(p.date).toLocaleDateString()}` : ''}
                            {p.method ? ` via ${p.method}` : ''}
                            {p.photo && (
                                <button onClick={(e) => { e.stopPropagation(); setViewPhoto(p.photo!); }} className="ml-2 text-indigo-600 hover:text-indigo-800">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </button>
                            )}
                         </span>
                         <span className="font-bold text-gray-800">₹{p.amount.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
        {viewPhoto && (
            <Modal isOpen={true} onClose={() => setViewPhoto(null)}>
                <img src={viewPhoto} className="w-full h-auto rounded" alt="Receipt" />
                <button onClick={() => setViewPhoto(null)} className="mt-4 w-full py-2 bg-gray-200 rounded font-bold">Close</button>
            </Modal>
        )}
        </>
    )
}

const NoteInputModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (text: string) => void }) => {
    const [note, setNote] = useState('');
    const { isListening, startListening } = useSpeechRecognition((text) => {
        setNote(prev => (prev ? prev + ' ' : '') + text);
    }, 'te-IN');

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
             <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Add Note</h3>
            </div>
            <div className="relative">
                 <textarea
                    className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-md focus:ring-indigo-500 focus:border-indigo-500 py-2 px-4 text-black font-bold h-32 resize-none"
                    placeholder="Speak or type note..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                 />
                 <button onClick={startListening} className={`absolute bottom-2 right-2 p-2 rounded-full ${isListening ? 'text-red-600 bg-red-100 animate-pulse' : 'text-gray-400 bg-white shadow-sm hover:text-indigo-600'}`}>
                    <MicIcon />
                </button>
            </div>
            <div className="mt-4 flex space-x-2">
                 <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-bold">Cancel</button>
                 <PrimaryButton onClick={() => onSave(note)} className="flex-1">Save</PrimaryButton>
            </div>
        </Modal>
    );
};

type LoadListCardProps = { load: Load, onClick: () => void, context?: 'loads' | 'customer' | 'driver' | 'truck', onSettle?: () => void };
const LoadListCard: React.FC<LoadListCardProps> = ({ load, onClick, context = 'loads', onSettle }) => {
    const { getCustomerById, getDriverById, updateLoad } = useAppContext();
    const customer = getCustomerById(load.customerId);
    const driver = getDriverById(load.driverId);
    const [showGallery, setShowGallery] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
    const [showNotes, setShowNotes] = useState(false);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedGalleryPhotos, setSelectedGalleryPhotos] = useState<number[]>([]);


    let totalAmount = 0;
    let paidAmount = 0;
    let labelTotal = "Total Amount";
    let labelPaid = "Received";

    if (context === 'driver') {
        totalAmount = load.driverWages;
        paidAmount = (load.driverAdvance || 0) + (load.driverPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);
        labelTotal = "Total Wages";
        labelPaid = "Total Paid";
    } else {
        // Default to customer financials for 'loads', 'customer', 'truck'
        totalAmount = load.totalAmount;
        paidAmount = load.customerAdvance + (load.customerPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);
        labelTotal = "Total Fare";
        labelPaid = "Received";
    }

    const balance = totalAmount - paidAmount;
    const isSettled = balance <= 0;

    const otherExpensesTotal = load.otherExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
    const estExpenses = (load.dieselPrice || 0) + (load.driverWages || 0) + (load.fastagCharges || 0) + otherExpensesTotal;
    const netProfit = load.totalAmount - estExpenses;

    // Construct Payment History
    const paymentHistory = useMemo(() => {
        const history: { amount: number, date?: string, method?: string, label?: string, photo?: string }[] = [];
        if (context === 'driver') {
            if ((load.driverAdvance || 0) > 0) {
                history.push({
                    label: 'Advance',
                    amount: load.driverAdvance || 0,
                    date: load.pickupDateTime, // Approximate date
                    method: load.driverAdvancePaymentMethod || 'Cash'
                });
            }
            if (load.driverPayments) {
                history.push(...load.driverPayments.map(p => ({
                    label: 'Payment',
                    amount: p.amount,
                    date: p.date,
                    method: p.method,
                    photo: (p as any).photo
                })));
            }
        } else {
             if (load.customerAdvance > 0) {
                history.push({
                    label: 'Advance',
                    amount: load.customerAdvance,
                    date: load.pickupDateTime, // Approximate date
                    method: load.customerAdvancePaymentMethod || 'Cash'
                });
            }
            if (load.customerPayments) {
                history.push(...load.customerPayments.map(p => ({
                    label: 'Payment',
                    amount: p.amount,
                    date: p.date,
                    method: p.method,
                    photo: p.photo
                })));
            }
        }
        return history.sort((a,b) => {
            if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
            return 0;
        });
    }, [load, context]);

    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newPhotos = [...(load.photos || []), reader.result as string];
                updateLoad({ ...load, photos: newPhotos });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGalleryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newPhotos = [...(load.photos || []), reader.result as string];
                updateLoad({ ...load, photos: newPhotos });
            };
            reader.readAsDataURL(file);
        }
    }

    const handleSaveNote = (text: string) => {
        updateLoad({ ...load, notes: text });
        setShowNoteInput(false);
    };
    
    const toggleGallerySelection = (index: number) => {
        if (selectedGalleryPhotos.includes(index)) {
            setSelectedGalleryPhotos(prev => prev.filter(i => i !== index));
        } else {
            setSelectedGalleryPhotos(prev => [...prev, index]);
        }
    };

    const deleteSelectedPhotos = () => {
        const newPhotos = (load.photos || []).filter((_, index) => !selectedGalleryPhotos.includes(index));
        updateLoad({ ...load, photos: newPhotos });
        setSelectedGalleryPhotos([]);
        setIsSelectMode(false);
    }

    return (
        <>
            <div onClick={onClick} className="bg-white p-5 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-indigo-900 mb-4 relative">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-grow pr-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-lg text-gray-800">{customer?.name || 'Unassigned Customer'}</p>
                            {load.tag && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold border border-blue-200">{load.tag}</span>}
                            {load.tripId && context !== 'truck' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">Trip Load</span>}
                        </div>
                        {context !== 'driver' && driver && <p className="text-sm text-gray-600 font-semibold mt-1">{driver.name}</p>}
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                            <span>{load.pickupLocation}</span>
                            <span className="mx-2">→</span>
                            <span>{load.deliveryLocation}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{new Date(load.pickupDateTime).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-3 flex-shrink-0">
                        <StatusSelect status={load.status} onChange={(s) => updateLoad({...load, status: s})} />
                        
                        <div className="flex items-center space-x-2">
                            {load.notes ? (
                                <div 
                                    className="h-14 w-14 rounded-lg bg-yellow-100 border border-yellow-300 shadow-sm cursor-pointer hover:opacity-90 transition-opacity flex flex-col items-center justify-center text-yellow-700"
                                    onClick={(e) => { e.stopPropagation(); setShowNotes(true); }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-[10px] font-bold mt-0.5">Note</span>
                                </div>
                            ) : (
                                <div 
                                    className="h-14 w-14 rounded-lg border-2 border-dashed border-indigo-300 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 text-indigo-400"
                                    onClick={(e) => { e.stopPropagation(); setShowNoteInput(true); }}
                                >
                                    <PencilIcon />
                                    <span className="text-[10px] font-bold mt-0.5">Add</span>
                                </div>
                            )}
                             {load.photos && load.photos.length > 0 ? (
                                <div 
                                    className="relative h-14 w-14 rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={(e) => { e.stopPropagation(); setShowGallery(true); }}
                                >
                                    <img src={load.photos[0]} alt="Thumbnail" className="h-full w-full object-cover" />
                                    {load.photos.length > 1 && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                            <span className="text-white font-bold text-xs">+{load.photos.length - 1}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div 
                                    className="h-14 w-14 rounded-lg border-2 border-dashed border-blue-300 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 text-blue-400"
                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                >
                                    <span className="text-2xl font-bold leading-none">+</span>
                                    <span className="text-[10px] font-bold">Photo</span>
                                </div>
                            )}
                             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                        </div>
                    </div>
                </div>

                {/* Financials */}
                <div className="grid grid-cols-3 gap-2 text-sm mb-3 border-b border-dashed border-gray-200 pb-3">
                    <div>
                        <p className="text-gray-600 font-bold text-xs">{labelTotal}</p>
                        <p className="text-base font-bold text-gray-900">₹{totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-gray-600 font-bold text-xs">{labelPaid}</p>
                        <p className="text-base font-bold text-green-600">₹{paidAmount.toLocaleString()}</p>
                    </div>
                     <div className="text-right">
                        <p className="text-gray-600 font-bold text-xs">Balance</p>
                        <p className={`text-base font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{balance.toLocaleString()}</p>
                    </div>
                </div>
                
                {/* Profit Section */}
                {context !== 'driver' && (
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-semibold">Est. Expenses: ₹{estExpenses.toLocaleString()}</span>
                        <span className={`font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            Net Profit: ₹{netProfit.toLocaleString()}
                        </span>
                    </div>
                )}

                {/* Settlement & History Section */}
                <div onClick={e => e.stopPropagation()}>
                    {!isSettled && onSettle && (
                        <div className="bg-red-50 rounded-lg p-3 border border-red-100 mt-3">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-gray-500">Balance Pending</p>
                                    <p className="text-xl font-bold text-red-600">₹{balance.toLocaleString()}</p>
                                </div>
                                <span 
                                    onClick={(e) => { e.stopPropagation(); onSettle(); }} 
                                    className="text-xs text-red-500 font-bold border border-red-200 px-2 py-1 rounded bg-white hover:bg-red-50 cursor-pointer"
                                >
                                    Click to Settle
                                </span>
                            </div>
                        </div>
                    )}
                     {isSettled && (
                        <div className="bg-green-50 rounded-lg p-3 border border-green-100 mt-3">
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-bold text-gray-500">Status</p>
                                <p className="text-sm font-bold text-green-700">Balance Cleared</p>
                            </div>
                        </div>
                    )}
                    
                    <PaymentHistory payments={paymentHistory} />
                </div>
            </div>

            {showGallery && (
                <Modal isOpen={showGallery} onClose={() => {setShowGallery(false); setIsSelectMode(false); setSelectedGalleryPhotos([]);}}>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-lg text-gray-900">Photos ({load.photos?.length})</h3>
                                <button onClick={() => setIsSelectMode(!isSelectMode)} className={`text-xs px-2 py-1 rounded border ${isSelectMode ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
                                    {isSelectMode ? 'Done' : 'Select'}
                                </button>
                                <button onClick={() => galleryInputRef.current?.click()} className="text-xs px-2 py-1 rounded border bg-blue-50 border-blue-200 text-blue-700 font-bold">
                                    + Upload
                                </button>
                                <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={handleGalleryUpload} />
                            </div>
                            <div className="flex space-x-3 items-center">
                                {isSelectMode && selectedGalleryPhotos.length > 0 && (
                                     <button onClick={deleteSelectedPhotos} className="text-red-600 text-xs font-bold">Delete ({selectedGalleryPhotos.length})</button>
                                )}
                                {!isSelectMode && (
                                    <button 
                                        onClick={() => {
                                            if (load.photos && load.photos[selectedPhotoIndex]) {
                                                downloadImage(load.photos[selectedPhotoIndex], `load-${load.id}-${selectedPhotoIndex + 1}.jpg`);
                                            }
                                        }}
                                        className="text-indigo-600 font-bold text-sm hover:underline flex items-center"
                                    >
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Download
                                    </button>
                                )}
                                <button onClick={() => {setShowGallery(false); setIsSelectMode(false);}} className="text-gray-500 font-bold text-2xl hover:text-gray-700">&times;</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                            {load.photos?.map((p, idx) => (
                                <div 
                                    key={idx} 
                                    className={`relative rounded-lg overflow-hidden border-2 cursor-pointer ${selectedPhotoIndex === idx && !isSelectMode ? 'border-indigo-600' : 'border-transparent'}`} 
                                    onClick={() => {
                                        if (isSelectMode) toggleGallerySelection(idx);
                                        else setSelectedPhotoIndex(idx);
                                    }}
                                >
                                    <img src={p} alt={`Proof ${idx+1}`} className="w-full object-cover aspect-square" />
                                    {isSelectMode && (
                                        <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedGalleryPhotos.includes(idx) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-400'}`}>
                                            {selectedGalleryPhotos.includes(idx) && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                    )}
                                     {!isSelectMode && selectedPhotoIndex === idx && <div className="absolute inset-0 bg-indigo-500 bg-opacity-10 pointer-events-none"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {showNotes && (
                <Modal isOpen={showNotes} onClose={() => setShowNotes(false)}>
                     <div className="text-center mb-4">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Load Note</h3>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-gray-800 text-sm font-medium leading-relaxed whitespace-pre-wrap shadow-inner max-h-60 overflow-y-auto">
                        {load.notes}
                    </div>
                    <button onClick={() => setShowNotes(false)} className="mt-6 w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-700">Close</button>
                </Modal>
            )}
             <NoteInputModal isOpen={showNoteInput} onClose={() => setShowNoteInput(false)} onSave={handleSaveNote} />
        </>
    );
};

// --- Settlement Modal ---
const SettlementModal = ({ 
    isOpen, 
    onClose, 
    balance, 
    context, 
    info,
    onSave 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    balance: number; 
    context: 'customer' | 'driver'; 
    info: string;
    onSave: (amount: number, method: string, date: string, photo?: string) => void; 
}) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('Cash');
    const [date, setDate] = useState('');
    const [error, setError] = useState('');
    const [proof, setProof] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
             const reader = new FileReader();
             reader.onloadend = () => setProof(reader.result as string);
             reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!amount) return;
        const val = parseFloat(amount);
        if (val > balance) {
            setError('Amount cannot exceed balance due');
            return;
        }
        onSave(val, method, date, proof);
        setAmount('');
        setProof('');
        setError('');
        onClose();
    };

    useEffect(() => {
         if (isOpen) {
             setAmount('');
             setMethod('Cash');
             setDate(new Date().toISOString().split('T')[0]);
             setProof('');
             setError('');
         }
    }, [isOpen]);

    useEffect(() => {
        if (amount && parseFloat(amount) > balance) {
            setError('Amount cannot exceed balance due');
        } else {
            setError('');
        }
    }, [amount, balance]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Settle {context === 'driver' ? 'Driver' : 'Customer'} Balance</h3>
                <p className="text-sm text-gray-500 mt-1">{info}</p>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-100 mb-6 text-left">
                <p className="text-sm font-bold text-red-800">Balance Due {context === 'driver' ? 'to Driver' : 'from Customer'}</p>
                <p className="text-3xl font-bold text-red-600 mt-1">₹{balance.toLocaleString()}</p>
            </div>

            <div className="space-y-4 text-left">
                <div>
                    <Input 
                        label="Payment Amount (₹)" 
                        type="number" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        placeholder={`e.g., ${balance}`} 
                        className={error ? "border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50" : ""}
                    />
                    {error && <p className="text-red-500 text-xs mt-1 font-bold">{error}</p>}
                </div>
                <Input label="Payment Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                <Select label="Payment Method" value={method} onChange={e => setMethod(e.target.value)}>
                     <option value="Cash">Cash</option>
                     <option value="PhonePe">PhonePe</option>
                     <option value="Google Pay">Google Pay</option>
                     <option value="Online Transfer">Online Transfer</option>
                     <option value="Cheque">Cheque</option>
                </Select>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Proof / Receipt (Optional)</label>
                    <div className="flex items-center space-x-3">
                         <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="h-10 w-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm cursor-pointer hover:border-indigo-500 hover:text-indigo-500 bg-gray-50"
                         >
                            {proof ? "Change Photo" : "+ Upload Photo"}
                         </div>
                         {proof && <div className="h-10 w-10 rounded overflow-hidden border border-gray-300 shadow-sm flex-shrink-0"><img src={proof} className="h-full w-full object-cover" alt="Proof" /></div>}
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>
                </div>
                <PrimaryButton onClick={handleSave} className={error || !amount ? "opacity-50 cursor-not-allowed" : ""}>Confirm Payment</PrimaryButton>
                <button onClick={onClose} className="w-full text-gray-500 font-bold py-2">Cancel</button>
            </div>
        </Modal>
    );
};

// --- TripCard ---
type TripCardProps = { trip: Trip; onClick: () => void; onSettle?: () => void; };
const TripCard: React.FC<TripCardProps> = ({ trip, onClick, onSettle }) => {
    const { getDriverById, getTruckById, loads } = useAppContext();
    const driver = getDriverById(trip.driverId);
    const truck = getTruckById(trip.truckId);
    const tripLoads = useMemo(() => loads.filter(l => l.tripId === trip.id), [loads, trip.id]);
    const routeText = `${trip.startLocation || 'Start'} → ${trip.endLocation || 'End'}`;
    
    // Financial logic for card
    // Calculate financials including load payments
    const loadWages = tripLoads.reduce((sum, l) => sum + l.driverWages, 0);
    const loadAdvances = tripLoads.reduce((sum, l) => sum + (l.driverAdvance || 0), 0);
    const loadPayments = tripLoads.reduce((sum, l) => sum + (l.driverPayments?.reduce((s, p) => s + p.amount, 0) || 0), 0);
    
    const wages = trip.driverWages ?? loadWages;
    // Payment is Trip Advance + Load Advances + Load Payments
    const totalPaid = (trip.driverAdvance || 0) + loadAdvances + loadPayments;
    const balance = wages - totalPaid;
    const isSettled = balance <= 0;

    // Construct Payment History for Trip
    const paymentHistory = useMemo(() => {
        const history: { amount: number, date?: string, method?: string, label?: string, photo?: string }[] = [];
        
        // Trip Level Advance
        if ((trip.driverAdvance || 0) > 0) {
            history.push({ label: 'Trip Advance', amount: trip.driverAdvance || 0 });
        }

        // Load Level Advances & Payments
        tripLoads.forEach(l => {
            if ((l.driverAdvance || 0) > 0) {
                history.push({
                    label: 'Load Advance',
                    amount: l.driverAdvance || 0,
                    date: l.pickupDateTime,
                    method: l.driverAdvancePaymentMethod
                });
            }
            if (l.driverPayments) {
                l.driverPayments.forEach(p => {
                    history.push({
                        label: 'Payment',
                        amount: p.amount,
                        date: p.date,
                        method: p.method,
                        photo: (p as any).photo
                    });
                });
            }
        });

        return history.sort((a,b) => {
             if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
             return 0;
        });
    }, [trip, tripLoads]);


    return (
        <div onClick={onClick} className="bg-white p-5 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-teal-500">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg text-gray-800">{trip.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{routeText}</p>
                </div>
                 <div className="flex flex-col items-end space-y-1">
                     <span className={`px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800`}>{trip.status}</span>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm text-gray-600">
                <span>Driver: <span className="font-semibold">{driver?.name || 'N/A'}</span></span>
                <span>Truck: <span className="font-semibold">{truck?.number || 'N/A'}</span></span>
            </div>
            
            {/* New Financials Section for Card */}
            <div className="grid grid-cols-3 gap-2 text-xs mt-2 border-t border-dashed border-gray-200 pt-2">
                <div>
                    <span className="block text-gray-500">Total Wages</span>
                    <span className="font-bold text-gray-800">₹{wages.toLocaleString()}</span>
                </div>
                <div className="text-center">
                    <span className="block text-gray-500">Total Paid</span>
                    <span className="font-bold text-green-600">₹{totalPaid.toLocaleString()}</span>
                </div>
                <div className="text-right">
                    <span className="block text-gray-500">Balance</span>
                    <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{balance.toLocaleString()}</span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">{tripLoads.length} Load{tripLoads.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
            
            {/* Settlement & History Section */}
            <div onClick={e => e.stopPropagation()}>
                {!isSettled && onSettle && (
                    <div className="mt-3 bg-red-50 rounded p-2 flex justify-between items-center border border-red-100">
                        <span className="text-xs font-bold text-red-800">Balance Due: ₹{balance.toLocaleString()}</span>
                        <button onClick={onSettle} className="text-xs bg-white border border-red-200 text-red-600 px-2 py-1 rounded font-bold shadow-sm">Click to Settle</button>
                    </div>
                )}
                 {isSettled && (
                    <div className="mt-3 bg-green-50 rounded p-2 flex justify-between items-center border border-green-100">
                        <span className="text-xs font-bold text-green-700">Balance Cleared</span>
                        <span className="text-xs font-bold text-green-700">₹0 Due</span>
                    </div>
                )}
                
                <PaymentHistory payments={paymentHistory} />
            </div>
        </div>
    );
};

// --- Trips Page ---
const TripsPage = ({ onAdd, onTripClick }: { onAdd: () => void; onTripClick: (id: string) => void; }) => {
    const { trips, loads } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTag, setFilterTag] = useState<'All' | 'Active' | 'Unpaid' | 'Completed' | 'Cancelled'>('All');

    const filteredTrips = useMemo(() => {
        return trips.filter(trip => {
            const matchesSearch = trip.name.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            if (filterTag === 'All') return true;
            if (filterTag === 'Active') return trip.status === TripStatus.InProgress || trip.status === TripStatus.Planned;
            if (filterTag === 'Completed') return trip.status === TripStatus.Completed;
            if (filterTag === 'Cancelled') return trip.status === TripStatus.Cancelled;
            if (filterTag === 'Unpaid') {
                const tripLoads = loads.filter(l => l.tripId === trip.id);
                const loadWages = tripLoads.reduce((sum, l) => sum + l.driverWages, 0);
                const loadAdvances = tripLoads.reduce((sum, l) => sum + (l.driverAdvance || 0), 0);
                const loadPayments = tripLoads.reduce((sum, l) => sum + (l.driverPayments?.reduce((s, p) => s + p.amount, 0) || 0), 0);
                
                const wages = trip.driverWages ?? loadWages;
                const totalPaid = (trip.driverAdvance || 0) + loadAdvances + loadPayments;
                const balance = wages - totalPaid;
                return balance > 0;
            }
            return true;
        });
    }, [trips, searchTerm, filterTag, loads]);

    return (
        <div className="p-5">
            <PageHeader title={`Trips (${filteredTrips.length})`} action={<button onClick={onAdd} className="bg-yellow-500 text-black px-5 py-2.5 rounded-lg font-bold hover:bg-yellow-400 shadow-md">+ Add</button>} />
            <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><SearchIcon /></div>
                <input type="text" placeholder="Search trips by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-black font-bold placeholder:text-gray-400" />
            </div>
             <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                {['All', 'Active', 'Unpaid', 'Completed', 'Cancelled'].map(tag => (
                     <button key={tag} onClick={() => setFilterTag(tag as any)} className={`px-4 py-1.5 text-sm font-bold rounded-full whitespace-nowrap transition-colors ${filterTag === tag ? 'bg-indigo-900 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {tag}
                    </button>
                ))}
            </div>
            <div className="space-y-4">
                {filteredTrips.length > 0 ? (
                    filteredTrips.map(trip => (
                        <TripCard key={trip.id} trip={trip} onClick={() => onTripClick(trip.id)} />
                    ))
                ) : (
                    <div className="text-center py-20">
                        <EmptyBoxIcon />
                        <h3 className="mt-4 text-xl font-serif text-gray-900">No Trips Found</h3>
                        <p className="mt-2 text-sm text-gray-500">Create a multi-stop trip to automatically generate loads for each leg of the journey.</p>
                        <button onClick={onAdd} className="mt-6 bg-yellow-500 text-black px-6 py-2.5 rounded-lg font-bold hover:bg-yellow-400 shadow-lg">+ Add New Trip</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Add/Edit Trip Page ---
const AddEditTripPage = ({ tripId, onBack, onSave }: { tripId?: string; onBack: () => void; onSave: () => void; }) => {
    const { drivers, trucks, addTrip, updateTrip, getTripById, getDriverById, getTruckById, loads, addLoad } = useAppContext();
    
    const [name, setName] = useState('');
    const [driverId, setDriverId] = useState('');
    const [truckId, setTruckId] = useState('');
    const [status, setStatus] = useState<TripStatus>(TripStatus.Planned);
    const [startLocation, setStartLocation] = useState('');
    const [endLocation, setEndLocation] = useState('');
    const [stops, setStops] = useState<string[]>([]);
    const [totalDieselLitres, setTotalDieselLitres] = useState('');
    const [totalDieselCost, setTotalDieselCost] = useState('');
    const [driverWages, setDriverWages] = useState('');
    const [driverAdvance, setDriverAdvance] = useState('');

    useEffect(() => {
        if (tripId) {
            const trip = getTripById(tripId);
            if (trip) {
                setName(trip.name);
                setDriverId(trip.driverId);
                setTruckId(trip.truckId);
                setStatus(trip.status);
                setStartLocation(trip.startLocation);
                setEndLocation(trip.endLocation);
                setStops(trip.stops);
                setTotalDieselLitres(trip.totalDieselLitres?.toString() || '');
                setTotalDieselCost(trip.totalDieselCost?.toString() || '');
                setDriverWages(trip.driverWages?.toString() || '');
                setDriverAdvance(trip.driverAdvance?.toString() || '');
            }
        }
    }, [tripId, getTripById]);

    const handleStopChange = (index: number, value: string) => {
        const newStops = [...stops];
        newStops[index] = value;
        setStops(newStops);
    };

    const addStop = () => setStops([...stops, '']);
    const removeStop = (index: number) => setStops(stops.filter((_, i) => i !== index));

    const handleSave = () => {
        const cleanStops = stops.filter(s => s.trim() !== '');
        const tripData: Omit<Trip, 'id'> = {
            name, driverId, truckId, status,
            startLocation, endLocation,
            stops: cleanStops,
            totalDieselLitres: totalDieselLitres ? parseFloat(totalDieselLitres) : undefined,
            totalDieselCost: totalDieselCost ? parseFloat(totalDieselCost) : undefined,
            driverWages: driverWages ? parseFloat(driverWages) : undefined,
            driverAdvance: driverAdvance ? parseFloat(driverAdvance) : undefined,
        };

        if (tripId) {
            updateTrip({ ...tripData, id: tripId });
            const route = [startLocation, ...cleanStops, endLocation].filter(loc => loc && loc.trim() !== '');
            if (route.length >= 2) {
                const existingLoads = loads.filter(l => l.tripId === tripId);
                const newLoads: Omit<Load, 'id'>[] = [];
                
                for (let i = 0; i < route.length - 1; i++) {
                    const pickup = route[i];
                    const delivery = route[i + 1];
                    const exists = existingLoads.some(l => l.pickupLocation === pickup && l.deliveryLocation === delivery);
                    if (!exists) {
                         newLoads.push({
                            customerId: '',
                            driverId: driverId,
                            truckId: truckId,
                            tripId: tripId,
                            pickupLocation: pickup,
                            deliveryLocation: delivery,
                            pickupDateTime: new Date().toISOString(),
                            totalAmount: 0,
                            customerAdvance: 0,
                            driverWages: 0,
                            status: LoadStatus.Active,
                            parts: [],
                        });
                    }
                }
                newLoads.forEach(l => addLoad(l));
            }

        } else {
            addTrip(tripData);
        }
        onSave();
    };

    const driverSuggestions = useMemo(() => drivers.map(d => ({ id: d.id, name: d.name, image: d.photo })), [drivers]);
    const truckSuggestions = useMemo(() => trucks.map(t => ({ id: t.id, name: t.number })), [trucks]);

    return (
        <div className="p-5">
            <FormHeader title={tripId ? 'Edit Trip' : 'Add New Trip'} onBack={onBack} />
            <div className="space-y-6">
                <FormSection title="Trip Details">
                    <Input label="Trip Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Mumbai - Delhi Run" />
                    <AutocompleteInput label="Driver" value={driverId} onSelect={setDriverId} suggestions={driverSuggestions} displayValue={id => getDriverById(id)?.name || ''} placeholder="Select driver" />
                    <AutocompleteInput label="Truck" value={truckId} onSelect={setTruckId} suggestions={truckSuggestions} displayValue={id => getTruckById(id)?.number || ''} placeholder="Select truck" />
                    <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as TripStatus)}>{Object.values(TripStatus).map(s => <option key={s} value={s}>{s}</option>)}</Select>
                </FormSection>

                <FormSection title="Route">
                    <InputWithMic label="Starting Point" value={startLocation} onChange={(e: any) => setStartLocation(e.target.value)} placeholder="e.g., Mumbai" lang="te-IN" />
                    {stops.map((stop, index) => (
                        <StopInputWithMic 
                            key={index} 
                            index={index} 
                            value={stop} 
                            onChange={(val) => handleStopChange(index, val)}
                            onRemove={() => removeStop(index)}
                        />
                    ))}
                    <div className="flex justify-center">
                         <button onClick={addStop} className="w-full py-2 mt-2 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition-colors">+ Add Stop</button>
                    </div>
                    <InputWithMic label="Ending Point" value={endLocation} onChange={(e: any) => setEndLocation(e.target.value)} placeholder="e.g., Delhi" lang="te-IN" />
                     {tripId && <p className="text-xs text-gray-500 mt-2">Modifying the route will generate new loads for new legs of the journey.</p>}
                </FormSection>

                <FormSection title="Expenses (Optional)">
                    <Input label="Total Diesel (Litres)" type="number" value={totalDieselLitres} onChange={e => setTotalDieselLitres(e.target.value)} placeholder="e.g., 800" />
                    <Input label="Total Diesel Cost (₹)" type="number" value={totalDieselCost} onChange={e => setTotalDieselCost(e.target.value)} placeholder="e.g., 72000" />
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
                         <div className="col-span-2">
                             <p className="text-sm text-gray-500 italic mb-2">Add driver wages and advance for whole trip. This overrides load-specific wages.</p>
                         </div>
                         <Input label="Driver Wages (Trip)" type="number" value={driverWages} onChange={e => setDriverWages(e.target.value)} placeholder="0" />
                         <Input label="Driver Advance (Trip)" type="number" value={driverAdvance} onChange={e => setDriverAdvance(e.target.value)} placeholder="0" />
                    </div>
                </FormSection>

                <PrimaryButton onClick={handleSave}>{tripId ? 'Update Trip' : 'Create Trip & Loads'}</PrimaryButton>
            </div>
        </div>
    );
};

// --- Trip Schedule Modal ---
const TripScheduleModal = ({ trip, tripLoads, onClose, onSave }: { trip: Trip, tripLoads: Load[], onClose: () => void, onSave: (updatedLoads: Load[]) => void }) => {
    const [loadsData, setLoadsData] = useState(tripLoads.map(l => ({
        id: l.id,
        pickupDateTime: l.pickupDateTime,
        deliveryDateTime: l.deliveryDateTime || '',
        driverWages: l.driverWages,
    })));

    const route = [trip.startLocation, ...trip.stops, trip.endLocation];

    const handleChange = (id: string, field: string, value: string | number) => {
        setLoadsData(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const handleSave = () => {
        const updatedLoads = tripLoads.map(l => {
            const data = loadsData.find(d => d.id === l.id);
            if (data) {
                return { 
                    ...l, 
                    pickupDateTime: data.pickupDateTime, 
                    deliveryDateTime: data.deliveryDateTime || undefined,
                    driverWages: Number(data.driverWages)
                };
            }
            return l;
        });
        onSave(updatedLoads);
        onClose();
    };

    return (
        <div className="space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xl font-serif text-gray-800">{trip.name}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>
            
            <div className="space-y-6 relative pl-4 border-l-2 border-gray-200 ml-2 py-2">
                {route.map((location, i) => {
                    if (i === route.length - 1) return (
                         <div key={i} className="relative">
                            <div className="absolute -left-[21px] top-1 h-4 w-4 rounded-full border-4 border-white bg-red-500"></div>
                            <p className="text-xs font-bold text-gray-500 uppercase">END</p>
                            <p className="font-bold text-gray-900">{location}</p>
                        </div>
                    );

                    const load = tripLoads.find(l => l.pickupLocation === location && l.deliveryLocation === route[i + 1]);
                    const data = load ? loadsData.find(d => d.id === load.id) : null;

                    return (
                        <div key={i} className="relative pb-6">
                            <div className="absolute -left-[21px] top-1 h-4 w-4 rounded-full border-4 border-white bg-indigo-500"></div>
                            <p className="text-xs font-bold text-gray-500 uppercase">{i === 0 ? 'START' : `STOP ${i}`}</p>
                            <p className="font-bold text-gray-900 mb-2">{location}</p>
                            
                            {data && (
                                <div className="bg-indigo-50 p-3 rounded-lg space-y-3 border border-indigo-100 ml-[-10px]">
                                     <div>
                                        <label className="text-xs text-indigo-700 font-bold block mb-1">Started date from point</label>
                                        <input 
                                            type="datetime-local" 
                                            value={data.pickupDateTime} 
                                            onChange={e => handleChange(data.id, 'pickupDateTime', e.target.value)}
                                            className="w-full border border-indigo-200 rounded px-2 py-1 text-sm bg-white font-semibold text-indigo-900"
                                        />
                                     </div>
                                     <div>
                                        <label className="text-xs text-indigo-700 font-bold block mb-1">Date of reached other point ({route[i+1]})</label>
                                        <input 
                                            type="datetime-local" 
                                            value={data.deliveryDateTime} 
                                            onChange={e => handleChange(data.id, 'deliveryDateTime', e.target.value)}
                                            className="w-full border border-indigo-200 rounded px-2 py-1 text-sm bg-white font-semibold text-indigo-900"
                                        />
                                     </div>
                                      <div>
                                        <label className="text-xs text-indigo-700 font-bold block mb-1">Driver wage payment for this load</label>
                                        <input 
                                            type="number" 
                                            value={data.driverWages} 
                                            onChange={e => handleChange(data.id, 'driverWages', e.target.value)}
                                            className="w-full border border-indigo-200 rounded px-2 py-1 text-sm bg-white font-semibold text-indigo-900"
                                            placeholder="Wage Amount"
                                        />
                                     </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="pt-2">
                <PrimaryButton onClick={handleSave}>Save Schedule & Wages</PrimaryButton>
            </div>
        </div>
    );
};

// --- Trip Financials Modal ---
const TripFinancialsModal = ({ trip, onClose, onSave }: { trip: Trip, onClose: () => void, onSave: (updates: Partial<Trip>) => void }) => {
    const [formData, setFormData] = useState({
        totalDieselLitres: trip.totalDieselLitres?.toString() || '',
        totalDieselCost: trip.totalDieselCost?.toString() || '',
        driverWages: trip.driverWages?.toString() || '',
        driverAdvance: trip.driverAdvance?.toString() || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = () => {
        onSave({
            totalDieselLitres: formData.totalDieselLitres ? parseFloat(formData.totalDieselLitres) : undefined,
            totalDieselCost: formData.totalDieselCost ? parseFloat(formData.totalDieselCost) : undefined,
            driverWages: formData.driverWages ? parseFloat(formData.driverWages) : undefined,
            driverAdvance: formData.driverAdvance ? parseFloat(formData.driverAdvance) : undefined,
        });
        onClose();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xl font-serif text-gray-800">Edit Trip Financials</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-2xl">&times;</button>
            </div>
            <div className="space-y-4">
                <Input label="Total Diesel (Litres)" name="totalDieselLitres" type="number" value={formData.totalDieselLitres} onChange={handleChange} placeholder="e.g. 500" />
                <Input label="Total Diesel Cost (₹)" name="totalDieselCost" type="number" value={formData.totalDieselCost} onChange={handleChange} placeholder="e.g. 45000" />
                
                <div className="border-t pt-4 mt-2">
                    <p className="text-xs text-gray-500 mb-3 bg-yellow-50 p-2 rounded border border-yellow-100">
                        <strong>Note:</strong> Setting a total wage here will override the sum of individual load wages for this trip.
                    </p>
                    <Input label="Total Driver Wages (Trip)" name="driverWages" type="number" value={formData.driverWages} onChange={handleChange} placeholder="Overrides calculated wages" />
                    <Input label="Trip-specific Advance" name="driverAdvance" type="number" value={formData.driverAdvance} onChange={handleChange} placeholder="Overrides calculated advance" />
                </div>

                <PrimaryButton onClick={handleSave}>Save Financials</PrimaryButton>
            </div>
        </div>
    );
};

// --- Trip Details Page ---
const TripDetailsPage = ({ tripId, onBack, onEditLoad }: { tripId: string; onBack: () => void; onEditLoad: (loadId: string) => void; }) => {
    const { loads, getTripById, getDriverById, getTruckById, updateTrip, addLoad, updateLoad } = useAppContext();
    const trip = getTripById(tripId);
    const [isFinancialsModalOpen, setIsFinancialsModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [newPointName, setNewPointName] = useState('');
    const { isListening, startListening } = useSpeechRecognition((text) => {
        setNewPointName(text);
    }, 'te-IN');

    const tripLoads = useMemo(() => {
        if (!trip) return [];
        return loads.filter(l => l.tripId === trip.id)
            .sort((a, b) => new Date(a.pickupDateTime).getTime() - new Date(b.pickupDateTime).getTime());
    }, [loads, trip]);

    const { totalRevenue, totalExpenses, profit, totalPaid } = useMemo(() => {
        if (!trip) return { totalRevenue: 0, totalExpenses: 0, profit: 0, totalPaid: 0 };
        
        let totalRevenue = 0;
        let totalExpenses = 0;
        let loadsWages = 0;
        let loadsDiesel = 0;
        let totalPaid = (trip.driverAdvance || 0);

        tripLoads.forEach(l => {
            if(l.status !== LoadStatus.Cancelled) {
                totalRevenue += l.totalAmount;
                loadsWages += l.driverWages;
                loadsDiesel += (l.dieselPrice || 0);
                totalExpenses += (l.fastagCharges || 0);
                
                totalPaid += (l.driverAdvance || 0) + (l.driverPayments?.reduce((s, p) => s + p.amount, 0) || 0);
                
                if (l.otherExpenses) {
                    totalExpenses += l.otherExpenses.reduce((sum, e) => sum + e.amount, 0);
                }
            }
        });

        if (trip.driverWages !== undefined) { totalExpenses += trip.driverWages; } else { totalExpenses += loadsWages; }
        if (trip.totalDieselCost !== undefined) { totalExpenses += trip.totalDieselCost; } else { totalExpenses += loadsDiesel; }

        return { totalRevenue, totalExpenses, profit: totalRevenue - totalExpenses, totalPaid };
    }, [tripLoads, trip]);

    if (!trip) return <div className="p-5">Trip not found. <button onClick={onBack}>Go Back</button></div>;

    const driver = getDriverById(trip.driverId);
    const truck = getTruckById(trip.truckId);
    const route = [trip.startLocation, ...trip.stops, trip.endLocation];
    
    const handleAddPoint = () => {
        if (!newPointName.trim()) return;
        const oldEnd = trip.endLocation;
        const newStops = [...trip.stops, oldEnd];
        const newEnd = newPointName;
        
        const newLoad: Omit<Load, 'id'> = {
            customerId: '',
            driverId: trip.driverId,
            truckId: trip.truckId,
            tripId: trip.id,
            pickupLocation: oldEnd,
            deliveryLocation: newEnd,
            pickupDateTime: new Date().toISOString(),
            totalAmount: 0,
            customerAdvance: 0,
            driverWages: 0,
            status: LoadStatus.Active,
            parts: [],
        };
        
        addLoad(newLoad);
        updateTrip({ ...trip, stops: newStops, endLocation: newEnd });
        setNewPointName('');
    };

    return (
        <div className="p-5">
            <FormHeader title={trip.name} onBack={onBack} />
            <div className="bg-white p-6 rounded-xl shadow-md mb-6 space-y-4">
                <div className="flex justify-between items-center"><p className="text-gray-600 font-semibold">Driver</p><p className="font-bold text-gray-900 text-lg">{driver?.name || 'N/A'}</p></div>
                <div className="flex justify-between items-center"><p className="text-gray-600 font-semibold">Truck</p><p className="font-bold text-gray-900 text-lg">{truck?.number || 'N/A'}</p></div>
                <div className="flex justify-between items-center">
                    <p className="text-gray-600 font-semibold">Status</p>
                    <Select value={trip.status} onChange={(e) => updateTrip({ ...trip, status: e.target.value as TripStatus })} className="!w-auto !py-1 !px-2 text-sm bg-blue-100 text-blue-800 rounded-full font-bold border-none focus:ring-2 focus:ring-blue-300">
                        {Object.values(TripStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </div>
                <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between items-center"><p className="text-gray-600 font-semibold">Total Diesel</p><p className="font-bold text-gray-900 text-lg">{trip.totalDieselLitres ? `${trip.totalDieselLitres} L` : 'N/A'}</p></div>
                    <div className="flex justify-between items-center"><p className="text-gray-600 font-semibold">Total Diesel Cost</p><p className="font-bold text-gray-900 text-lg">{trip.totalDieselCost ? `₹${trip.totalDieselCost.toLocaleString()}` : 'N/A'}</p></div>
                </div>
                <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between items-center"><p className="text-gray-600 font-semibold">Driver Wages</p><p className="font-bold text-gray-900 text-lg">{trip.driverWages ? `₹${trip.driverWages.toLocaleString()}` : 'N/A'}</p></div>
                    <div className="flex justify-between items-center"><p className="text-gray-600 font-semibold">Total Paid to Driver</p><p className="font-bold text-green-600 text-lg">₹{totalPaid.toLocaleString()}</p></div>
                </div>
                <button onClick={() => setIsFinancialsModalOpen(true)} className="w-full mt-2 bg-indigo-50 text-indigo-700 font-bold py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                    Update Trip Expenses
                </button>
            </div>

             <div className="bg-white p-6 rounded-xl shadow-md mb-6">
                 <h3 className="text-xl font-serif text-gray-800 mb-4">Trip Financials</h3>
                 <div className="space-y-3">
                     <div className="flex justify-between items-center"><p className="text-gray-600">Total Revenue</p><p className="font-bold text-indigo-900 text-lg">₹{totalRevenue.toLocaleString()}</p></div>
                     <div className="flex justify-between items-center"><p className="text-gray-600">Total Expenses</p><p className="font-bold text-red-600 text-lg">₹{totalExpenses.toLocaleString()}</p></div>
                     <div className="flex justify-between items-center border-t pt-3 mt-3"><p className="text-gray-800 font-bold">Net Profit</p><p className={`font-bold text-2xl ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{profit.toLocaleString()}</p></div>
                 </div>
            </div>
            
            <div className="flex justify-between items-center mb-4">
                 <h3 className="text-2xl font-serif text-gray-800">Route</h3>
                 <button onClick={() => setIsScheduleModalOpen(true)} className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                    Edit Schedule & Wages
                 </button>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-md mb-6">
                 {/* Route details */}
                <ol className="relative border-l-2 border-indigo-200 ml-2">
                    {route.map((location, index) => (
                        <li key={index} className="mb-4 ml-6 last:mb-4">
                            <span className="absolute flex items-center justify-center w-6 h-6 bg-indigo-200 rounded-full -left-3 ring-4 ring-white">
                                <svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                            </span>
                            <h4 className="font-semibold text-gray-800">{location}</h4>
                            <p className="text-xs text-gray-500">{index === 0 ? 'Start' : index === route.length - 1 ? 'End' : `Stop ${index}`}</p>
                        </li>
                    ))}
                </ol>
                 <div className="ml-2 pt-2 border-t border-indigo-100 flex items-center space-x-2">
                    <div className="relative flex-grow">
                         <input
                            type="text"
                            placeholder="New Point (e.g., Vizag)"
                            value={newPointName}
                            onChange={e => setNewPointName(e.target.value)}
                            className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-md focus:ring-indigo-500 focus:border-indigo-500 py-2.5 pl-4 pr-10 text-black font-bold transition-shadow duration-200 focus:shadow-lg placeholder:text-gray-400"
                         />
                         <button onClick={startListening} className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${isListening ? 'text-red-600 animate-pulse' : 'text-gray-400 hover:text-indigo-600'}`}>
                            <MicIcon />
                        </button>
                    </div>
                    <button onClick={handleAddPoint} className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600 whitespace-nowrap h-full">+ Add</button>
                </div>
            </div>

            <h3 className="text-2xl font-serif text-gray-800 mb-4">Loads in this Trip ({tripLoads.length})</h3>
            <div className="space-y-4 p-4 border-2 border-blue-200 rounded-xl bg-blue-50/30">
                <h4 className="font-bold text-blue-800 uppercase tracking-wide text-sm mb-2">{trip.name}</h4>
                 {tripLoads.length > 0 ? (
                    tripLoads.map(load => <LoadListCard key={load.id} load={load} onClick={() => onEditLoad(load.id)} />)
                 ) : (
                    <p className="text-center text-gray-500 py-10">No loads found for this trip.</p>
                 )}
            </div>

            <Modal isOpen={isFinancialsModalOpen} onClose={() => setIsFinancialsModalOpen(false)}>
                <TripFinancialsModal trip={trip} onClose={() => setIsFinancialsModalOpen(false)} onSave={(updates) => updateTrip({ ...trip, ...updates })} />
            </Modal>
             <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)}>
                <TripScheduleModal trip={trip} tripLoads={tripLoads} onClose={() => setIsScheduleModalOpen(false)} onSave={(updates) => updates.forEach(l => updateLoad(l))} />
            </Modal>
        </div>
    );
};

// --- Dashboard Page ---
const DashboardPage = ({ setPage }: { setPage: (page: Page) => void }) => {
    const { loads, customers, drivers, trucks } = useAppContext();
    const activeLoads = loads.filter(l => l.status === LoadStatus.Active).length;
    const { pendingFromCustomers, owedToDrivers } = useMemo(() => {
        let pendingFromCustomers = 0;
        let owedToDrivers = 0;
        loads.forEach(load => {
            if (load.status !== LoadStatus.Cancelled) {
                const totalPaidByCustomer = (load.customerPayments?.reduce((sum, p) => sum + p.amount, 0) || 0) + load.customerAdvance;
                pendingFromCustomers += load.totalAmount - totalPaidByCustomer;
                const driverAdvance = load.driverAdvance || 0;
                const totalPaidToDriver = (load.driverPayments?.reduce((sum, p) => sum + p.amount, 0) || 0) + driverAdvance;
                owedToDrivers += load.driverWages - totalPaidToDriver;
            }
        });
        return { pendingFromCustomers, owedToDrivers };
    }, [loads]);

    return (
        <div className="p-5 space-y-6">
            <PageHeader title="Dashboard" />
            <div className="grid grid-cols-2 gap-5">
                <StatCard title="Active Loads" value={activeLoads} color="bg-blue-600 text-white" onClick={() => setPage({ name: 'loads' })} />
                <StatCard title="Customers" value={customers.length} color="bg-green-600 text-white" onClick={() => setPage({ name: 'customers' })} />
                <StatCard title="Drivers" value={drivers.length} color="bg-orange-500 text-white" onClick={() => setPage({ name: 'drivers' })} />
                <StatCard title="Trucks" value={trucks.length} color="bg-purple-600 text-white" onClick={() => setPage({ name: 'trucks' })} />
            </div>
             <div className="bg-white p-6 rounded-xl shadow-md">
                 <h3 className="text-xl font-serif text-gray-800 mb-5">Financial Overview</h3>
                 <div className="space-y-5">
                     <div className="flex justify-between items-center"><p className="text-gray-600">Pending from Customers</p><p className="font-bold text-green-600 text-2xl">₹{pendingFromCustomers.toLocaleString()}</p></div>
                      <div className="flex justify-between items-center"><p className="text-gray-600">Owed to Drivers</p><p className="font-bold text-red-600 text-2xl">₹{owedToDrivers.toLocaleString()}</p></div>
                 </div>
            </div>
        </div>
    );
};

// --- Load Filter Modal ---
interface LoadFilters {
  startDate: string;
  endDate: string;
  customerId: string;
  driverId: string;
  pickupLocation: string;
  deliveryLocation: string;
}
const LoadFilterModal = ({ isOpen, onClose, onApply, initialFilters }: { isOpen: boolean; onClose: () => void; onApply: (filters: LoadFilters) => void; initialFilters: LoadFilters; }) => {
    // ... (unchanged)
    const { customers, drivers, getCustomerById, getDriverById } = useAppContext();
    const [filters, setFilters] = useState(initialFilters);

    useEffect(() => { setFilters(initialFilters); }, [initialFilters, isOpen]);

    const handleApply = () => onApply(filters);
    const handleReset = () => {
        const clearedFilters = { startDate: '', endDate: '', customerId: '', driverId: '', pickupLocation: '', deliveryLocation: '' };
        setFilters(clearedFilters);
        onApply(clearedFilters);
    };

    const customerSuggestions = useMemo(() => customers.map(c => ({ id: c.id, name: c.name })), [customers]);
    const driverSuggestions = useMemo(() => drivers.map(d => ({ id: d.id, name: d.name, image: d.photo })), [drivers]);

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="p-1">
                <h3 className="text-xl font-serif text-gray-800 border-b pb-3 mb-4">Filter Loads</h3>
                <div className="space-y-4">
                    <AutocompleteInput label="Customer" value={filters.customerId} onSelect={id => setFilters(p => ({ ...p, customerId: id }))} suggestions={customerSuggestions} displayValue={id => getCustomerById(id)?.name || ''} placeholder="All Customers" />
                    <AutocompleteInput label="Driver" value={filters.driverId} onSelect={id => setFilters(p => ({ ...p, driverId: id }))} suggestions={driverSuggestions} displayValue={id => getDriverById(id)?.name || ''} placeholder="All Drivers" />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Start Date" type="date" value={filters.startDate} onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))} />
                        <Input label="End Date" type="date" value={filters.endDate} onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))} />
                    </div>
                    <Input label="Pickup Location" value={filters.pickupLocation} onChange={e => setFilters(p => ({ ...p, pickupLocation: e.target.value }))} placeholder="Any pickup" />
                    <Input label="Delivery Location" value={filters.deliveryLocation} onChange={e => setFilters(p => ({ ...p, deliveryLocation: e.target.value }))} placeholder="Any destination" />
                </div>
                <div className="flex space-x-2 mt-6">
                    <button onClick={handleReset} className="flex-1 text-center bg-gray-200 text-gray-800 p-2.5 rounded-lg font-semibold text-sm hover:bg-gray-300">Reset</button>
                    <PrimaryButton onClick={handleApply} className="flex-1 !w-auto">Apply Filters</PrimaryButton>
                </div>
            </div>
        </Modal>
    );
};

// --- Add/Edit Load Page ---
const AddEditLoadPage = ({ loadId, onBack, onSave }: { loadId?: string; onBack: () => void; onSave: () => void; }) => {
    // ... (unchanged)
    const { customers, drivers, trucks, addLoad, updateLoad, getLoadById, getCustomerById, getDriverById, getTruckById } = useAppContext();
    const [formData, setFormData] = useState({
        customerId: '', driverId: '', truckId: '',
        pickupLocation: '', deliveryLocation: '', pickupDateTime: '', deliveryDateTime: '',
        totalAmount: '', status: LoadStatus.Active,
        customerAdvance: '', customerAdvancePaymentMethod: 'Cash',
        driverWages: '', dieselPrice: '', 
        driverAdvance: '', driverAdvancePaymentMethod: 'Cash',
        fastagCharges: '',
        notes: '', tag: ''
    });
    const [parts, setParts] = useState<{ commodity: string; weight: string }[]>([{ commodity: '', weight: '' }]);
    const [otherExpenses, setOtherExpenses] = useState<{ description: string, amount: string }[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [isTranslating, setIsTranslating] = useState(false);

    const defaultTags = ['GCC', 'PRIVATE MILLS', 'OTHER AGRI', 'NORMAL', 'RED BRICKS', 'FLY ASH BRICKS', '20MM CHIPS', '40MM CHIPS', 'STEEL'];
    const [customTags, setCustomTags] = useLocalStorage<string[]>('customTags', []);
    
    const { isListening, startListening } = useSpeechRecognition((text) => {
        setFormData(prev => ({ ...prev, notes: (prev.notes ? prev.notes + ' ' : '') + text }));
    }, 'te-IN'); 

    useEffect(() => {
        if (loadId) {
            const load = getLoadById(loadId);
            if (load) {
                setFormData({
                    customerId: load.customerId, driverId: load.driverId, truckId: load.truckId,
                    pickupLocation: load.pickupLocation, deliveryLocation: load.deliveryLocation,
                    pickupDateTime: load.pickupDateTime, deliveryDateTime: load.deliveryDateTime || '',
                    totalAmount: load.totalAmount.toString(),
                    status: load.status, customerAdvance: load.customerAdvance.toString(), driverWages: load.driverWages.toString(),
                    dieselPrice: load.dieselPrice?.toString() || '',
                    driverAdvance: load.driverAdvance?.toString() || '',
                    fastagCharges: load.fastagCharges?.toString() || '',
                    notes: load.notes || '',
                    tag: load.tag || '',
                    customerAdvancePaymentMethod: load.customerAdvancePaymentMethod || 'Cash',
                    driverAdvancePaymentMethod: load.driverAdvancePaymentMethod || 'Cash'
                });
                if (load.parts && load.parts.length > 0) {
                    setParts(load.parts.map(p => ({ commodity: p.commodity, weight: p.weight.toString() })));
                } else {
                    setParts([{ commodity: '', weight: '' }]);
                }
                const other = (load.otherExpenses || []).map(e => ({ description: e.description || e.category, amount: e.amount.toString() }));
                setOtherExpenses(other);
                setPhotos(load.photos || []);
            }
        }
    }, [loadId, getLoadById]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleAddTag = () => {
        const newTag = window.prompt("Enter new tag name:");
        if (newTag && !defaultTags.includes(newTag.toUpperCase()) && !customTags.includes(newTag.toUpperCase())) {
            const tagUpper = newTag.toUpperCase();
            setCustomTags([...customTags, tagUpper]);
            setFormData(prev => ({ ...prev, tag: tagUpper }));
        }
    };
    
    const handlePartChange = (index: number, field: 'commodity' | 'weight', value: string) => {
        const newParts = [...parts];
        newParts[index][field] = value;
        setParts(newParts);
    };
    const addPart = () => setParts([...parts, { commodity: '', weight: '' }]);
    const removePart = (index: number) => setParts(parts.filter((_, i) => i !== index));

    const handleOtherExpenseChange = (index: number, field: 'description' | 'amount', value: string) => {
        const newExpenses = [...otherExpenses];
        newExpenses[index][field] = value;
        setOtherExpenses(newExpenses);
    };
    const addOtherExpense = () => setOtherExpenses([...otherExpenses, { description: '', amount: '' }]);
    const removeOtherExpense = (index: number) => setOtherExpenses(otherExpenses.filter((_, i) => i !== index));

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { setPhotos(prev => [...prev, reader.result as string]); };
            reader.readAsDataURL(file);
        }
        if(event.target) event.target.value = '';
    };

    const removePhoto = (indexToRemove: number) => { setPhotos(prev => prev.filter((_, index) => index !== indexToRemove)); };

    const handleTranslate = async () => {
        if (!formData.notes) return;
        setIsTranslating(true);
        const translated = await translateText(formData.notes);
        setFormData(prev => ({ ...prev, notes: translated }));
        setIsTranslating(false);
    };

    const handleSave = () => {
        const partsData = parts
            .filter(p => p.commodity && parseFloat(p.weight) > 0)
            .map(p => ({ commodity: p.commodity, weight: parseFloat(p.weight) }));
            
        const otherExpensesData: Expense[] = otherExpenses
            .filter(exp => exp.description && parseFloat(exp.amount) > 0)
            .map((exp, index) => ({
                id: `exp-o-${Date.now()}-${index}`,
                category: exp.description,
                description: exp.description,
                amount: parseFloat(exp.amount)
            }));
    
        const loadData = {
            customerId: formData.customerId,
            driverId: formData.driverId,
            truckId: formData.truckId,
            pickupLocation: formData.pickupLocation,
            deliveryLocation: formData.deliveryLocation,
            pickupDateTime: formData.pickupDateTime,
            deliveryDateTime: formData.deliveryDateTime || undefined,
            totalAmount: parseFloat(formData.totalAmount) || 0,
            customerAdvance: parseFloat(formData.customerAdvance) || 0,
            customerAdvancePaymentMethod: formData.customerAdvancePaymentMethod,
            driverWages: parseFloat(formData.driverWages) || 0,
            dieselPrice: formData.dieselPrice ? parseFloat(formData.dieselPrice) : undefined,
            driverAdvance: formData.driverAdvance ? parseFloat(formData.driverAdvance) : undefined,
            driverAdvancePaymentMethod: formData.driverAdvancePaymentMethod,
            fastagCharges: formData.fastagCharges ? parseFloat(formData.fastagCharges) : undefined,
            otherExpenses: otherExpensesData.length > 0 ? otherExpensesData : undefined,
            status: formData.status as LoadStatus,
            parts: partsData,
            photos: photos,
            notes: formData.notes,
            tag: formData.tag
        };
    
        if (loadId) {
            const existingLoad = getLoadById(loadId);
            updateLoad({ 
                ...(existingLoad as Load),
                ...loadData, 
                id: loadId 
            });
        } else {
            addLoad(loadData);
        }
        onSave();
    };

    const customerSuggestions = useMemo(() => customers.map(c => ({ id: c.id, name: c.name })), [customers]);
    const driverSuggestions = useMemo(() => drivers.map(d => ({ id: d.id, name: d.name, image: d.photo })), [drivers]);
    const truckSuggestions = useMemo(() => trucks.map(t => ({ id: t.id, name: t.number })), [trucks]);
    
    return (
        <div className="p-5">
            <FormHeader title={loadId ? 'Edit Load' : 'Add New Load'} onBack={onBack} />
            <div className="space-y-6">
                <FormSection title="Core Details">
                    <AutocompleteInput label="Customer" value={formData.customerId} onSelect={id => setFormData(p => ({...p, customerId: id}))} suggestions={customerSuggestions} displayValue={id => getCustomerById(id)?.name || ''} placeholder="Select customer" />
                    <div className="flex items-end space-x-2">
                         <div className="flex-grow">
                            <Select label="Type / Tag" name="tag" value={formData.tag} onChange={handleChange}>
                                <option value="">Select Type (Optional)</option>
                                {defaultTags.map(t => <option key={t} value={t}>{t}</option>)}
                                {customTags.map(t => <option key={t} value={t}>{t}</option>)}
                            </Select>
                         </div>
                         <button onClick={handleAddTag} className="bg-indigo-50 text-indigo-600 p-3 rounded-lg border border-indigo-200 hover:bg-indigo-100 font-bold text-xl leading-none mb-[1px]" type="button">
                            +
                         </button>
                    </div>
                    <AutocompleteInput label="Driver" value={formData.driverId} onSelect={id => setFormData(p => ({...p, driverId: id}))} suggestions={driverSuggestions} displayValue={id => getDriverById(id)?.name || ''} placeholder="Select driver" />
                    <AutocompleteInput label="Truck" value={formData.truckId} onSelect={id => setFormData(p => ({...p, truckId: id}))} suggestions={truckSuggestions} displayValue={id => getTruckById(id)?.number || ''} placeholder="Select truck" />
                    <Select label="Status" name="status" value={formData.status} onChange={handleChange}>{Object.values(LoadStatus).map(s => <option key={s} value={s}>{s}</option>)}</Select>
                </FormSection>
                <FormSection title="Route Details">
                    <InputWithMic label="Pickup Location" name="pickupLocation" value={formData.pickupLocation} onChange={handleChange} placeholder="Enter pickup location" lang="en-US" />
                    <InputWithMic label="Delivery Location" name="deliveryLocation" value={formData.deliveryLocation} onChange={handleChange} placeholder="Enter delivery location" lang="en-US" />
                    <Input label="Pickup Date & Time" name="pickupDateTime" type="datetime-local" value={formData.pickupDateTime} onChange={handleChange}/>
                    <Input label="Delivery Date & Time (Optional)" name="deliveryDateTime" type="datetime-local" value={formData.deliveryDateTime} onChange={handleChange}/>
                </FormSection>
                <FormSection title="Commodity & Weight">
                    <div className="space-y-2">
                        {parts.map((part, index) => (
                            <div key={index} className="flex items-center space-x-2">
                                <input type="text" placeholder="e.g., Cement" value={part.commodity} onChange={(e) => handlePartChange(index, 'commodity', e.target.value)} className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 text-sm font-bold text-black" />
                                <input type="number" placeholder="e.g., 15.5" value={part.weight} onChange={(e) => handlePartChange(index, 'weight', e.target.value)} className="block w-40 bg-gray-50 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 px-3 text-sm font-bold text-black" />
                                <button onClick={() => removePart(index)} className="text-red-500 hover:text-red-700 font-extrabold text-2xl p-0 h-8 w-8 flex items-center justify-center" disabled={parts.length <= 1}>&times;</button>
                            </div>
                        ))}
                    </div>
                    <button onClick={addPart} className="text-sm font-bold text-black mt-2">+ Add Item</button>
                </FormSection>
                <FormSection title="Customer Billing">
                    <Input label="Total Amount (₹)" name="totalAmount" type="number" value={formData.totalAmount} onChange={handleChange} placeholder="e.g., 7500"/>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Advance from Customer" name="customerAdvance" type="number" value={formData.customerAdvance} onChange={handleChange} placeholder="e.g., 2000"/>
                        <Select label="Payment Method" name="customerAdvancePaymentMethod" value={formData.customerAdvancePaymentMethod} onChange={handleChange}>
                             <option value="Cash">Cash</option>
                             <option value="PhonePe">PhonePe</option>
                             <option value="Google Pay">Google Pay</option>
                             <option value="Online Transfer">Online Transfer</option>
                             <option value="Cheque">Cheque</option>
                        </Select>
                    </div>
                </FormSection>
                 <FormSection title="Trip Expenses">
                    <Input label="Driver Wages" name="driverWages" type="number" value={formData.driverWages} onChange={handleChange} placeholder="e.g., 3000"/>
                    <Input label="Diesel Price" name="dieselPrice" type="number" value={formData.dieselPrice} onChange={handleChange} placeholder="e.g., 5000"/>
                    <div className="grid grid-cols-2 gap-4">
                         <Input label="Advance given to Driver" name="driverAdvance" type="number" value={formData.driverAdvance} onChange={handleChange} placeholder="e.g., 1000"/>
                         <Select label="Payment Method" name="driverAdvancePaymentMethod" value={formData.driverAdvancePaymentMethod} onChange={handleChange}>
                             <option value="Cash">Cash</option>
                             <option value="PhonePe">PhonePe</option>
                             <option value="Google Pay">Google Pay</option>
                             <option value="Online Transfer">Online Transfer</option>
                             <option value="Cheque">Cheque</option>
                        </Select>
                    </div>
                    <Input label="Fastag Charges" name="fastagCharges" type="number" value={formData.fastagCharges} onChange={handleChange} placeholder="e.g., 500"/>
                    <div className="pt-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Other Expenses</label>
                        <div className="space-y-2">
                            {otherExpenses.map((expense, index) => (
                                <ExpenseRowWithMic
                                    key={index}
                                    description={expense.description}
                                    amount={expense.amount}
                                    onChange={(field, val) => handleOtherExpenseChange(index, field, val)}
                                    onRemove={() => removeOtherExpense(index)}
                                />
                            ))}
                        </div>
                        <button onClick={addOtherExpense} className="text-sm font-bold text-black mt-2">+ Add Other Expense</button>
                    </div>
                </FormSection>
                <FormSection title="Attachments & Notes">
                    {/* ... (unchanged) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Notes</label>
                        <div className="relative">
                            <textarea name="notes" value={formData.notes} onChange={handleChange} className="block w-full bg-gray-50 border-gray-300 rounded-lg shadow-md focus:ring-indigo-500 focus:border-indigo-500 py-2 px-4 text-black font-bold h-24 resize-none" placeholder="Add notes..."></textarea>
                            <button onClick={startListening} className={`absolute bottom-2 right-2 p-2 rounded-full ${isListening ? 'text-red-600 bg-red-100 animate-pulse' : 'text-gray-400 bg-white shadow-sm hover:text-indigo-600'}`}>
                                <MicIcon />
                            </button>
                        </div>
                         <div className="mt-2 flex space-x-2">
                             <button onClick={handleTranslate} disabled={isTranslating} className="flex items-center space-x-1 text-indigo-600 text-sm font-bold hover:underline">
                                 <TranslateIcon />
                                 <span>{isTranslating ? 'Translating...' : 'Translate with AI'}</span>
                             </button>
                         </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Photos (POD, Bills, etc.)</label>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            {photos.map((photo, index) => (
                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden shadow-md">
                                    <img src={photo} alt="attachment" className="w-full h-full object-cover" />
                                    <button onClick={() => removePhoto(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                            <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => fileInputRef.current?.click()}>
                                <span className="text-gray-400 text-sm">Upload</span>
                            </div>
                             <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50" onClick={() => cameraInputRef.current?.click()}>
                                <span className="text-gray-400 text-sm">Camera</span>
                            </div>
                        </div>
                        <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                        <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleFileChange} />
                    </div>
                </FormSection>
                <PrimaryButton onClick={handleSave}>{loadId ? 'Update Load' : 'Create Load'}</PrimaryButton>
            </div>
        </div>
    );
};

// --- Loads Page ---
const LoadsPage = ({ onAdd, onEdit }: { onAdd: () => void; onEdit: (id: string) => void }) => {
    const { loads, trips, updateLoad } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState<LoadFilters>({ startDate: '', endDate: '', customerId: '', driverId: '', pickupLocation: '', deliveryLocation: '' });
    const [filterTag, setFilterTag] = useState<'All' | 'Active' | 'Unpaid' | 'Completed' | 'Cancelled'>('All');
    const [settlementLoad, setSettlementLoad] = useState<Load | null>(null);

    const filteredLoads = useMemo(() => {
        // ... (filtering logic unchanged)
        return loads.filter(l => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || 
                l.pickupLocation.toLowerCase().includes(searchLower) || 
                l.deliveryLocation.toLowerCase().includes(searchLower) ||
                (l.parts && l.parts.some(p => p.commodity.toLowerCase().includes(searchLower)));

            const matchesCustomer = !filters.customerId || l.customerId === filters.customerId;
            const matchesDriver = !filters.driverId || l.driverId === filters.driverId;
            const matchesPickup = !filters.pickupLocation || l.pickupLocation.toLowerCase().includes(filters.pickupLocation.toLowerCase());
            const matchesDelivery = !filters.deliveryLocation || l.deliveryLocation.toLowerCase().includes(filters.deliveryLocation.toLowerCase());
            
            let matchesDate = true;
            if (filters.startDate) matchesDate = matchesDate && new Date(l.pickupDateTime) >= new Date(filters.startDate);
            if (filters.endDate) matchesDate = matchesDate && new Date(l.pickupDateTime) <= new Date(new Date(filters.endDate).setHours(23,59,59,999));

            let matchesTag = true;
            if (filterTag === 'Active') matchesTag = l.status === LoadStatus.Active;
            if (filterTag === 'Completed') matchesTag = l.status === LoadStatus.Completed;
            if (filterTag === 'Cancelled') matchesTag = l.status === LoadStatus.Cancelled;
            if (filterTag === 'Unpaid') {
                const paid = (l.customerPayments?.reduce((sum, p) => sum + p.amount, 0) || 0) + l.customerAdvance;
                const balance = l.totalAmount - paid;
                matchesTag = balance > 0;
            }

            return matchesSearch && matchesCustomer && matchesDriver && matchesPickup && matchesDelivery && matchesDate && matchesTag;
        }).sort((a, b) => new Date(b.pickupDateTime).getTime() - new Date(a.pickupDateTime).getTime());
    }, [loads, searchTerm, filters, filterTag]);

    const { groupedLoads, standaloneLoads } = useMemo<{ groupedLoads: Record<string, Load[]>; standaloneLoads: Load[] }>(() => {
        const groups: Record<string, Load[]> = {};
        const standalone: Load[] = [];
        
        filteredLoads.forEach(load => {
            if (load.tripId) {
                if (!groups[load.tripId]) groups[load.tripId] = [];
                groups[load.tripId].push(load);
            } else {
                standalone.push(load);
            }
        });
        return { groupedLoads: groups, standaloneLoads: standalone };
    }, [filteredLoads]);

    const calculateBalance = (load: Load) => {
         const paid = load.customerAdvance + (load.customerPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);
         return load.totalAmount - paid;
    };

    return (
        <div className="p-5">
            <PageHeader title={`Loads (${filteredLoads.length})`} action={<button onClick={onAdd} className="bg-yellow-500 text-black px-5 py-2.5 rounded-lg font-bold hover:bg-yellow-400 shadow-md">+ Add</button>} />
            
            <div className="flex space-x-2 mb-4">
                 <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><SearchIcon /></div>
                    <input type="text" placeholder="Search loads..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-black font-bold placeholder:text-gray-400" />
                </div>
                <button onClick={() => setIsFilterOpen(true)} className={`px-3 rounded-lg border ${Object.values(filters).some(x => x) ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'bg-white border-gray-300 text-gray-600'}`}>
                    <FilterIcon />
                </button>
            </div>
            <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                {['All', 'Active', 'Unpaid', 'Completed', 'Cancelled'].map(tag => (
                     <button key={tag} onClick={() => setFilterTag(tag as any)} className={`px-4 py-1.5 text-sm font-bold rounded-full whitespace-nowrap transition-colors ${filterTag === tag ? 'bg-indigo-900 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {tag}
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                {Object.keys(groupedLoads).length > 0 && Object.entries(groupedLoads).map(([tripId, tripLoads]) => {
                    const trip = trips.find(t => t.id === tripId);
                    return (
                        <div key={tripId} className="border-2 border-blue-200 rounded-xl bg-blue-50/30 p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-blue-800 text-lg">{trip?.name || 'Unknown Trip'}</h4>
                                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full font-bold">{tripLoads.length} Loads</span>
                            </div>
                            <div className="space-y-4">
                                {tripLoads.map(load => (
                                    <LoadListCard 
                                        key={load.id} 
                                        load={load} 
                                        onClick={() => onEdit(load.id)} 
                                        onSettle={() => setSettlementLoad(load)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {standaloneLoads.length > 0 && (
                    <div className="space-y-4">
                         {Object.keys(groupedLoads).length > 0 && <h4 className="font-bold text-gray-500 uppercase text-xs tracking-wider ml-1">Standalone Loads</h4>}
                         {standaloneLoads.map(load => (
                             <LoadListCard 
                                key={load.id} 
                                load={load} 
                                onClick={() => onEdit(load.id)} 
                                onSettle={() => setSettlementLoad(load)}
                            />
                         ))}
                    </div>
                )}

                {filteredLoads.length === 0 && (
                    <div className="text-center py-20">
                        <EmptyBoxIcon />
                        <h3 className="mt-4 text-xl font-serif text-gray-900">No Loads Found</h3>
                        <button onClick={onAdd} className="mt-6 bg-yellow-500 text-black px-6 py-2.5 rounded-lg font-bold hover:bg-yellow-400 shadow-lg">+ Create Load</button>
                    </div>
                )}
            </div>
            <LoadFilterModal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} onApply={setFilters} initialFilters={filters} />
             {settlementLoad && (
                <SettlementModal
                    isOpen={!!settlementLoad}
                    onClose={() => setSettlementLoad(null)}
                    context="customer"
                    info={`${settlementLoad.pickupLocation} → ${settlementLoad.deliveryLocation}`}
                    balance={calculateBalance(settlementLoad)}
                    onSave={(amount, method, date, photo) => {
                        const newPayment: CustomerPayment = { amount, date: date || new Date().toISOString(), method, photo };
                        const updatedPayments = [...(settlementLoad.customerPayments || []), newPayment];
                        updateLoad({ ...settlementLoad, customerPayments: updatedPayments });
                    }}
                />
            )}
        </div>
    );
};

// ... (AddEditCustomerPage, CustomersPage code remains the same but omitted here)
// --- Add/Edit Customer Page ---
const AddEditCustomerPage = ({ customerId, onBack, onSave }: { customerId?: string; onBack: () => void; onSave: () => void; }) => {
    const { addCustomer, updateCustomer, getCustomerById } = useAppContext();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [village, setVillage] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [isStarred, setIsStarred] = useState(false);

    useEffect(() => {
        if (customerId) {
            const c = getCustomerById(customerId);
            if (c) {
                setName(c.name);
                setPhone(c.phone || '');
                setVillage(c.village || '');
                setCompanyName(c.companyName || '');
                setIsStarred(c.isStarred || false);
            }
        }
    }, [customerId, getCustomerById]);

    const handleSave = () => {
        const data = { name, phone, village, companyName, isStarred, isTemporary: false };
        if (customerId) updateCustomer({ ...data, id: customerId } as Customer);
        else addCustomer(data);
        onSave();
    };

    return (
        <div className="p-5">
            <FormHeader title={customerId ? 'Edit Customer' : 'Add Customer'} onBack={onBack} />
            <div className="space-y-6 bg-white p-5 rounded-xl shadow-md">
                <Input label="Customer Name" value={name} onChange={e => setName(e.target.value)} />
                <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
                <Input label="Village / Location" value={village} onChange={e => setVillage(e.target.value)} />
                <Input label="Company Name (Optional)" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                 <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={isStarred} onChange={e => setIsStarred(e.target.checked)} className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300" />
                    <label className="text-sm font-bold text-gray-700">Mark as Starred (VIP)</label>
                </div>
                <PrimaryButton onClick={handleSave}>Save Customer</PrimaryButton>
            </div>
        </div>
    );
};

// --- Customers Page ---
const CustomersPage = ({ onAdd, onViewDetails }: { onAdd: () => void; onViewDetails: (id: string) => void; }) => {
    const { customers, loads } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTag, setFilterTag] = useState<'All' | 'Starred' | 'With Balance'>('All');

    const getCustomerBalance = (customerId: string) => {
        return loads.filter(l => l.customerId === customerId && l.status !== LoadStatus.Cancelled)
            .reduce((total, load) => {
                const paid = (load.customerPayments?.reduce((sum, p) => sum + p.amount, 0) || 0) + load.customerAdvance;
                return total + (load.totalAmount - paid);
            }, 0);
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            if (filterTag === 'Starred') return c.isStarred;
            if (filterTag === 'With Balance') return getCustomerBalance(c.id) > 0;
            return true;
        });
    }, [customers, searchTerm, filterTag, loads]);

    return (
        <div className="p-5">
            <PageHeader title={`Customers (${filteredCustomers.length})`} action={<button onClick={onAdd} className="bg-yellow-500 text-black px-5 py-2.5 rounded-lg font-bold hover:bg-yellow-400 shadow-md">+ Add</button>} />
            <div className="relative mb-4"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><SearchIcon /></div><input type="text" placeholder="Search customers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-black font-bold placeholder:text-gray-400" /></div>
            
            <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                {['All', 'Starred', 'With Balance'].map(tag => (
                    <button key={tag} onClick={() => setFilterTag(tag as any)} className={`px-4 py-1.5 text-sm font-bold rounded-full whitespace-nowrap ${filterTag === tag ? 'bg-indigo-900 text-white' : 'bg-white border text-black'}`}>
                        {tag === 'Starred' && <span className="mr-1 inline-block align-text-bottom"><StarIcon filled={true} /></span>}
                        {tag}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => (
                        <div key={customer.id} onClick={() => onViewDetails(customer.id)} className="bg-white p-5 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-green-500">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <h4 className="font-bold text-lg text-gray-800">{customer.name}</h4>
                                    {customer.isStarred && <span className="ml-2 text-red-600"><StarIcon filled={true} /></span>}
                                </div>
                                <p className={`font-bold ${getCustomerBalance(customer.id) > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{getCustomerBalance(customer.id).toLocaleString()}</p>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{customer.village || 'No Location'}</p>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20"><EmptyBoxIcon /><h3 className="mt-4 text-xl font-serif text-gray-900">No Customers Found</h3><button onClick={onAdd} className="mt-6 bg-yellow-500 text-black px-6 py-2.5 rounded-lg font-bold hover:bg-yellow-400 shadow-lg">+ Add Customer</button></div>
                )}
            </div>
        </div>
    );
};

// --- Customer Details Page ---
const CustomerDetailsPage = ({ customerId, onBack, onEditLoad, onEditCustomer }: { customerId: string; onBack: () => void; onEditLoad: (id: string) => void; onEditCustomer: () => void; }) => {
    const { getCustomerById, loads, updateLoad } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const customer = getCustomerById(customerId);
    
    const customerLoads = useMemo(() => {
        return loads.filter(l => l.customerId === customerId).filter(l => {
             if (!searchTerm) return true;
             const term = searchTerm.toLowerCase();
             return l.pickupLocation.toLowerCase().includes(term) || 
                    l.deliveryLocation.toLowerCase().includes(term) ||
                    (l.tag && l.tag.toLowerCase().includes(term)) ||
                    (l.notes && l.notes.toLowerCase().includes(term));
        }).sort((a, b) => new Date(b.pickupDateTime).getTime() - new Date(b.pickupDateTime).getTime());
    }, [loads, customerId, searchTerm]);
    
    const balance = customerLoads.reduce((total, load) => {
        const paid = (load.customerPayments?.reduce((sum, p) => sum + p.amount, 0) || 0) + load.customerAdvance;
        return load.status !== LoadStatus.Cancelled ? total + (load.totalAmount - paid) : total;
    }, 0);
    const [settlementLoad, setSettlementLoad] = useState<Load | null>(null);

    if (!customer) return <div>Customer not found</div>;
    
    const calculateBalance = (load: Load) => {
         const paid = load.customerAdvance + (load.customerPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);
         return load.totalAmount - paid;
    };

    return (
        <div className="p-5">
            <FormHeader 
                title={customer.name} 
                onBack={onBack} 
                action={
                    <div className="flex items-center space-x-3">
                        <button onClick={onEditCustomer} className="p-2 text-gray-600 hover:text-indigo-600 bg-gray-100 rounded-full">
                            <PencilIcon />
                        </button>
                        <div className="text-right"><p className="text-xs text-gray-500">Balance</p><p className={`text-xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{balance.toLocaleString()}</p></div>
                    </div>
                } 
            />
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6"><p className="text-gray-600">{customer.village || 'No Location'}</p><p className="text-gray-600">{customer.phone}</p></div>
            
            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><SearchIcon /></div>
                <input type="text" placeholder="Search history..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-black font-bold placeholder:text-gray-400" />
            </div>

            <h3 className="text-xl font-serif text-gray-800 mb-4">Transaction History</h3>
            <div className="space-y-4">
                {customerLoads.length > 0 ? customerLoads.map(load => (
                    <LoadListCard 
                        key={load.id} 
                        load={load} 
                        onClick={() => onEditLoad(load.id)} 
                        context="customer" 
                        onSettle={() => setSettlementLoad(load)}
                    />
                )) : <p className="text-gray-500">No history available.</p>}
            </div>
             {settlementLoad && (
                <SettlementModal
                    isOpen={!!settlementLoad}
                    onClose={() => setSettlementLoad(null)}
                    context="customer"
                    info={`${settlementLoad.pickupLocation} → ${settlementLoad.deliveryLocation}`}
                    balance={calculateBalance(settlementLoad)}
                    onSave={(amount, method, date, photo) => {
                        const newPayment: CustomerPayment = { amount, date: date || new Date().toISOString(), method, photo };
                        const updatedPayments = [...(settlementLoad.customerPayments || []), newPayment];
                        updateLoad({ ...settlementLoad, customerPayments: updatedPayments });
                    }}
                />
            )}
        </div>
    );
};

// --- Drivers Page ---
const DriversPage = ({ onAdd, onViewDetails }: { onAdd: () => void; onViewDetails: (id: string) => void; }) => {
    // ... (unchanged)
    const { drivers } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const filteredDrivers = useMemo(() => drivers.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())), [drivers, searchTerm]);
    return (
        <div className="p-5">
            <PageHeader title={`Drivers (${filteredDrivers.length})`} action={<button onClick={onAdd} className="bg-yellow-500 text-black px-5 py-2.5 rounded-lg font-bold hover:bg-yellow-400 shadow-md">+ Add</button>} />
            <div className="relative mb-6"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><SearchIcon /></div><input type="text" placeholder="Search drivers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-black font-bold placeholder:text-gray-400" /></div>
            <div className="space-y-4">
                {filteredDrivers.length > 0 ? filteredDrivers.map(driver => (
                    <div key={driver.id} onClick={() => onViewDetails(driver.id)} className="bg-white p-5 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-orange-500 flex justify-between items-center">
                         <div>
                            <h4 className="font-bold text-lg text-gray-800">{driver.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">{driver.phone}</p>
                        </div>
                        {driver.photo && <img src={driver.photo} alt={driver.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />}
                    </div>
                )) : <div className="text-center py-20"><EmptyBoxIcon /><h3 className="mt-4 text-xl font-serif text-gray-900">No Drivers Found</h3><button onClick={onAdd} className="mt-6 bg-yellow-500 text-black px-6 py-2.5 rounded-lg font-bold hover:bg-yellow-400 shadow-lg">+ Add Driver</button></div>}
            </div>
        </div>
    );
};

// --- Add/Edit Driver Page ---
const AddEditDriverPage = ({ driverId, onBack, onSave }: { driverId?: string; onBack: () => void; onSave: () => void; }) => {
    const { addDriver, updateDriver, getDriverById } = useAppContext();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [license, setLicense] = useState('');
    const [photo, setPhoto] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (driverId) { const d = getDriverById(driverId); if (d) { setName(d.name); setPhone(d.phone); setLicense(d.license || ''); setPhoto(d.photo || ''); } }
    }, [driverId, getDriverById]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) { const reader = new FileReader(); reader.onloadend = () => { setPhoto(reader.result as string); }; reader.readAsDataURL(file); }
    };

    const handleSave = () => {
        const data = { name, phone, license, photo };
        if (driverId) updateDriver({ ...data, id: driverId }); else addDriver(data);
        onSave();
    };

    return (
        <div className="p-5">
            <FormHeader title={driverId ? 'Edit Driver' : 'Add Driver'} onBack={onBack} />
            <div className="space-y-6 bg-white p-5 rounded-xl shadow-md">
                <div className="flex flex-col items-center mb-4">
                    <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-dashed border-gray-400 hover:border-indigo-500">
                        {photo ? <img src={photo} alt="Driver" className="w-full h-full object-cover" /> : <span className="text-gray-400 text-xs text-center px-2">Upload Photo</span>}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
                <Input label="Driver Name" value={name} onChange={e => setName(e.target.value)} />
                <Input label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
                <Input label="License Number (Optional)" value={license} onChange={e => setLicense(e.target.value)} />
                <PrimaryButton onClick={handleSave}>Save Driver</PrimaryButton>
            </div>
        </div>
    );
};

// --- Driver Details Page ---
const DriverDetailsPage = ({ driverId, onBack, onEdit, onEditLoad, onViewTrip }: { driverId: string; onBack: () => void; onEdit: () => void; onEditLoad: (id: string) => void; onViewTrip: (id: string) => void; }) => {
    // ... (unchanged)
    const { getDriverById, loads, trips, updateLoad, updateTrip } = useAppContext();
    const driver = getDriverById(driverId);
    
    const [activeTab, setActiveTab] = useState<'trips' | 'loads'>('trips');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [settlementLoad, setSettlementLoad] = useState<Load | null>(null);
    const [settlementTrip, setSettlementTrip] = useState<Trip | null>(null);

    const { totalWages, totalPaid, balance } = useMemo(() => {
        let w = 0;
        let p = 0;

        const standaloneLoads = loads.filter(l => l.driverId === driverId && !l.tripId && l.status !== LoadStatus.Cancelled);
        standaloneLoads.forEach(l => {
            w += l.driverWages;
            p += (l.driverAdvance || 0) + (l.driverPayments?.reduce((s, x) => s + x.amount, 0) || 0);
        });

        const driverTripsList = trips.filter(t => t.driverId === driverId);
        driverTripsList.forEach(t => {
            const tripLoads = loads.filter(l => l.tripId === t.id);
            if (t.driverWages !== undefined) {
                w += t.driverWages;
            } else {
                 w += tripLoads.reduce((sum, l) => sum + (l.driverWages || 0), 0);
            }
            // Sync Logic: Sum ALL payments
            p += (t.driverAdvance || 0); // Trip-level base advance
            p += tripLoads.reduce((sum, l) => sum + (l.driverAdvance || 0), 0); // Load-level advances
            tripLoads.forEach(l => {
                 p += (l.driverPayments?.reduce((s, x) => s + x.amount, 0) || 0); // Load-level extra payments
            });
        });
        
        return { totalWages: w, totalPaid: p, balance: w - p };
    }, [loads, trips, driverId]);

    const getTripDate = (tripId: string) => {
        const tLoads = loads.filter(l => l.tripId === tripId);
        if (tLoads.length === 0) return new Date(0); 
        const sorted = tLoads.sort((a,b) => new Date(a.pickupDateTime).getTime() - new Date(b.pickupDateTime).getTime());
        return new Date(sorted[0].pickupDateTime);
    }

    const filteredTrips: Trip[] = useMemo(() => {
        return trips.filter(t => t.driverId === driverId).filter(t => {
            const tripDate = getTripDate(t.id);
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.startLocation.toLowerCase().includes(searchTerm.toLowerCase()) || t.endLocation.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStart = filterStartDate ? tripDate >= new Date(filterStartDate) : true;
            const matchesEnd = filterEndDate ? tripDate <= new Date(new Date(filterEndDate).setHours(23,59,59,999)) : true;
            return matchesSearch && matchesStart && matchesEnd;
        });
    }, [trips, driverId, searchTerm, filterStartDate, filterEndDate, loads]);

    const filteredLoads: Load[] = useMemo(() => {
        return loads.filter(l => l.driverId === driverId).filter(l => {
            const matchesSearch = l.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) || l.deliveryLocation.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStart = filterStartDate ? new Date(l.pickupDateTime) >= new Date(filterStartDate) : true;
            const matchesEnd = filterEndDate ? new Date(l.pickupDateTime) <= new Date(new Date(filterEndDate).setHours(23,59,59,999)) : true;
            return matchesSearch && matchesStart && matchesEnd;
        });
    }, [loads, driverId, searchTerm, filterStartDate, filterEndDate]);

    if (!driver) return <div>Driver not found</div>;

    const calculateLoadDriverBalance = (load: Load) => {
        const paid = (load.driverAdvance || 0) + (load.driverPayments?.reduce((sum, p) => sum + p.amount, 0) || 0);
        return load.driverWages - paid;
    };

    const calculateTripDriverBalance = (trip: Trip) => {
         const tripLoads = loads.filter(l => l.tripId === trip.id);
         const wages = trip.driverWages ?? tripLoads.reduce((sum, l) => sum + l.driverWages, 0);
         
         // Calc total paid including load payments
         const loadAdvances = tripLoads.reduce((sum, l) => sum + (l.driverAdvance || 0), 0);
         const loadPayments = tripLoads.reduce((sum, l) => sum + (l.driverPayments?.reduce((s, p) => s + p.amount, 0) || 0), 0);
         const totalPaid = (trip.driverAdvance || 0) + loadAdvances + loadPayments;

         return wages - totalPaid;
    };

    return (
        <div className="p-5">
            <FormHeader title={driver.name} onBack={onBack} action={<button onClick={onEdit} className="p-2 text-gray-600 hover:text-indigo-600 bg-gray-100 rounded-full"><PencilIcon /></button>} />
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex items-center space-x-4">
                 {driver.photo ? <img src={driver.photo} alt={driver.name} className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-bold">{driver.name.charAt(0)}</div>}
                 <div>
                     <p className="text-gray-800 font-bold">{driver.phone}</p>
                     <p className="text-gray-500 text-sm">{driver.license || 'No License Info'}</p>
                 </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-md mb-6 space-y-3">
                 <div className="flex justify-between items-center"><p className="text-gray-600">Total Wages</p><p className="font-bold text-indigo-900 text-lg">₹{totalWages.toLocaleString()}</p></div>
                 <div className="flex justify-between items-center"><p className="text-gray-600">Total Paid</p><p className="font-bold text-green-600 text-lg">₹{totalPaid.toLocaleString()}</p></div>
                 <div className="flex justify-between items-center border-t pt-3 mt-3"><p className="text-gray-800 font-bold">Balance Pending</p><p className="font-bold text-red-600 text-xl">₹{balance.toLocaleString()}</p></div>
            </div>
            
            {/* Search and Filter Section */}
            <div className="bg-gray-100 p-3 rounded-lg mb-6 space-y-3 border border-gray-200">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                         <label className="text-xs font-bold text-gray-500 ml-1">Start Date</label>
                         <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full py-1.5 px-2 bg-white border border-gray-300 rounded-lg text-sm font-bold" />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 ml-1">End Date</label>
                         <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full py-1.5 px-2 bg-white border border-gray-300 rounded-lg text-sm font-bold" />
                    </div>
                </div>
            </div>

            {/* Tabs for Trips and Loads */}
            <div className="bg-gray-100 p-1 rounded-lg flex mb-6">
                <button 
                    className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'trips' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('trips')}
                >
                    Trips
                </button>
                <button 
                    className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'loads' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('loads')}
                >
                    Loads
                </button>
            </div>

            {activeTab === 'trips' ? (
                <>
                    <h3 className="text-xl font-serif text-gray-800 mb-4">Recent Trips</h3>
                    <div className="space-y-4 mb-8">
                        {filteredTrips.length > 0 ? filteredTrips.map(trip => (
                            <TripCard 
                                key={trip.id} 
                                trip={trip} 
                                onClick={() => onViewTrip(trip.id)} 
                                onSettle={() => setSettlementTrip(trip)}
                            />
                        )) : <p className="text-gray-500">No trips found.</p>}
                    </div>
                </>
            ) : (
                <>
                     <h3 className="text-xl font-serif text-gray-800 mb-4">Load History</h3>
                    <div className="space-y-4">
                        {filteredLoads.length > 0 ? filteredLoads.map(load => (
                            <LoadListCard 
                                key={load.id} 
                                load={load} 
                                onClick={() => onEditLoad(load.id)} 
                                context="driver" 
                                onSettle={() => setSettlementLoad(load)}
                            />
                        )) : <p className="text-gray-500">No loads found.</p>}
                    </div>
                </>
            )}

             {/* Settlement Modal for Load */}
             {settlementLoad && (
                <SettlementModal
                    isOpen={!!settlementLoad}
                    onClose={() => setSettlementLoad(null)}
                    context="driver"
                    info={`${settlementLoad.pickupLocation} → ${settlementLoad.deliveryLocation}`}
                    balance={calculateLoadDriverBalance(settlementLoad)}
                    onSave={(amount, method, date, photo) => {
                        const newPayment = { amount, date: date || new Date().toISOString(), method, photo };
                        const updatedPayments = [...(settlementLoad.driverPayments || []), newPayment];
                        updateLoad({ ...settlementLoad, driverPayments: updatedPayments });
                    }}
                />
            )}
            {/* Settlement Modal for Trip */}
            {settlementTrip && (
                <SettlementModal
                    isOpen={!!settlementTrip}
                    onClose={() => setSettlementTrip(null)}
                    context="driver"
                    info={settlementTrip.name}
                    balance={calculateTripDriverBalance(settlementTrip)}
                    onSave={(amount, method, date, photo) => {
                        // Sync Logic: Add payment to the first load of the trip so it reflects in both views
                        const tLoads = loads.filter(l => l.tripId === settlementTrip.id);
                        if (tLoads.length > 0) {
                             const targetLoad = tLoads[0]; // Add to the first load
                             const newPayment = { amount, date: date || new Date().toISOString(), method, photo };
                             const updatedPayments = [...(targetLoad.driverPayments || []), newPayment];
                             updateLoad({ ...targetLoad, driverPayments: updatedPayments });
                        } else {
                             // Fallback if no loads exist
                             const currentAdvance = settlementTrip.driverAdvance || 0;
                             updateTrip({ ...settlementTrip, driverAdvance: currentAdvance + amount });
                        }
                    }}
                />
            )}
        </div>
    );
};

// --- Trucks Page ---
const TrucksPage = ({ onAdd, onViewDetails }: { onAdd: () => void; onViewDetails: (id: string) => void; }) => {
    const { trucks } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const filteredTrucks = useMemo(() => trucks.filter(t => t.number.toLowerCase().includes(searchTerm.toLowerCase())), [trucks, searchTerm]);
    return (
        <div className="p-5">
            <PageHeader title={`Trucks (${filteredTrucks.length})`} action={<button onClick={onAdd} className="bg-yellow-500 text-black px-5 py-2.5 rounded-lg font-bold hover:bg-yellow-400 shadow-md">+ Add</button>} />
            <div className="relative mb-6"><div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><SearchIcon /></div><input type="text" placeholder="Search trucks..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-black font-bold placeholder:text-gray-400" /></div>
            <div className="space-y-4">
                {filteredTrucks.length > 0 ? filteredTrucks.map(truck => (
                    <div key={truck.id} onClick={() => onViewDetails(truck.id)} className="bg-white p-5 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-purple-600">
                         <div>
                            <h4 className="font-bold text-lg text-gray-800">{truck.number}</h4>
                            <p className="text-sm text-gray-500 mt-1">{truck.model || 'No Model'}</p>
                        </div>
                    </div>
                )) : <div className="text-center py-20"><EmptyBoxIcon /><h3 className="mt-4 text-xl font-serif text-gray-900">No Trucks Found</h3><button onClick={onAdd} className="mt-6 bg-yellow-500 text-black px-6 py-2.5 rounded-lg font-bold hover:bg-yellow-400 shadow-lg">+ Add Truck</button></div>}
            </div>
        </div>
    );
};

// --- Add/Edit Truck Page ---
const AddEditTruckPage = ({ truckId, onBack, onSave }: { truckId?: string; onBack: () => void; onSave: () => void; }) => {
    const { addTruck, updateTruck, getTruckById } = useAppContext();
    const [number, setNumber] = useState('');
    const [model, setModel] = useState('');
    const [capacity, setCapacity] = useState('');

    useEffect(() => {
        if (truckId) { const t = getTruckById(truckId); if (t) { setNumber(t.number); setModel(t.model || ''); setCapacity(t.capacity?.toString() || ''); } }
    }, [truckId, getTruckById]);

    const handleSave = () => {
        const data = { number, model, capacity: capacity ? parseFloat(capacity) : undefined };
        if (truckId) updateTruck({ ...data, id: truckId } as Truck); else addTruck(data);
        onSave();
    };

    return (
        <div className="p-5">
            <FormHeader title={truckId ? 'Edit Truck' : 'Add Truck'} onBack={onBack} />
            <div className="space-y-6 bg-white p-5 rounded-xl shadow-md">
                <Input label="Truck Number" value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. AP 39 X 1234" />
                <Input label="Model (Optional)" value={model} onChange={e => setModel(e.target.value)} />
                <Input label="Capacity (Tons) (Optional)" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} />
                <PrimaryButton onClick={handleSave}>Save Truck</PrimaryButton>
            </div>
        </div>
    );
};

// --- Truck Details Page ---
const TruckDetailsPage = ({ truckId, onBack, onEdit }: { truckId: string; onBack: () => void; onEdit: () => void; }) => {
    const { getTruckById, trips, loads } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeTab, setActiveTab] = useState<'loads' | 'trips'>('loads');

    const truck = getTruckById(truckId);
    
    // Helper to get trip date
    const getTripDate = (tripId: string) => {
        const tLoads = loads.filter(l => l.tripId === tripId);
        if (tLoads.length === 0) return new Date(0); 
        const sorted = tLoads.sort((a,b) => new Date(a.pickupDateTime).getTime() - new Date(b.pickupDateTime).getTime());
        return new Date(sorted[0].pickupDateTime);
    };

    // Filtered Trips
    const truckTrips: Trip[] = useMemo(() => {
        return (trips || []).filter(t => t.truckId === truckId).filter(t => {
             const tripDate = getTripDate(t.id);
             const matchesSearch = !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.startLocation.toLowerCase().includes(searchTerm.toLowerCase()) || t.endLocation.toLowerCase().includes(searchTerm.toLowerCase());
             const matchesStart = startDate ? tripDate >= new Date(startDate) : true;
             const matchesEnd = endDate ? tripDate <= new Date(new Date(endDate).setHours(23,59,59,999)) : true;
             return matchesSearch && matchesStart && matchesEnd;
        });
    }, [trips, truckId, searchTerm, startDate, endDate, loads]);

    // Filtered Loads
    const filteredLoads: Load[] = useMemo(() => {
        const filtered = (loads || []).filter(l => l.truckId === truckId).filter(l => {
            const matchesSearch = !searchTerm || 
                l.pickupLocation.toLowerCase().includes(searchTerm.toLowerCase()) || 
                l.deliveryLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (l.tag && l.tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesStart = startDate ? new Date(l.pickupDateTime) >= new Date(startDate) : true;
            const matchesEnd = endDate ? new Date(l.pickupDateTime) <= new Date(new Date(endDate).setHours(23,59,59,999)) : true;

            return matchesSearch && matchesStart && matchesEnd;
        });
        return filtered.sort((a, b) => new Date(b.pickupDateTime).getTime() - new Date(a.pickupDateTime).getTime());
    }, [loads, truckId, searchTerm, startDate, endDate]);

    if (!truck) return <div>Truck not found</div>;

    return (
        <div className="p-5">
             <FormHeader title={truck.number} onBack={onBack} action={<button onClick={onEdit} className="p-2 text-gray-600 hover:text-indigo-600 bg-gray-100 rounded-full"><PencilIcon /></button>} />
             
             {/* Stats using filtered data */}
             <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-white p-4 rounded-xl shadow-sm">
                     <p className="text-gray-500 text-sm">Total Trips</p>
                     <p className="text-2xl font-bold text-indigo-900">{truckTrips.length}</p>
                 </div>
                 <div className="bg-white p-4 rounded-xl shadow-sm">
                     <p className="text-gray-500 text-sm">Total Loads</p>
                     <p className="text-2xl font-bold text-indigo-900">{filteredLoads.length}</p>
                 </div>
             </div>
             
             {/* Filters */}
             <div className="bg-gray-100 p-4 rounded-xl mb-6 space-y-3 border border-gray-200">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><SearchIcon /></div>
                    <input type="text" placeholder="Search activity..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm text-black font-bold placeholder:text-gray-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm font-bold" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-white border border-gray-300 rounded-lg text-sm font-bold" />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-gray-100 p-1 rounded-lg flex mb-6">
                <button 
                    className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'loads' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('loads')}
                >
                    Recent Loads
                </button>
                <button 
                    className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'trips' ? 'bg-white text-indigo-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('trips')}
                >
                    Recent Trips
                </button>
            </div>

             <div className="space-y-4">
                 {activeTab === 'loads' ? (
                    filteredLoads.length > 0 ? filteredLoads.map(load => (
                        <LoadListCard key={load.id} load={load} onClick={() => {}} context="truck" />
                    )) : (
                        <div className="text-center py-10 text-gray-500">No loads found matching criteria</div>
                    )
                 ) : (
                    truckTrips.length > 0 ? truckTrips.map(trip => (
                        <TripCard key={trip.id} trip={trip} onClick={() => {}} />
                    )) : (
                        <div className="text-center py-10 text-gray-500">No trips found matching criteria</div>
                    )
                 )}
             </div>
        </div>
    );
};

// --- App Component ---
const App = () => {
  const [page, setPage] = useState<Page>({ name: 'dashboard' });

  return (
    <AppProvider>
      <MainLayout page={page} setPage={setPage} />
    </AppProvider>
  );
};

const MainLayout = ({ page, setPage }: { page: Page, setPage: (page: Page) => void }) => {
  let content;
  switch (page.name) {
    case 'dashboard':
      content = <DashboardPage setPage={setPage} />;
      break;
    case 'loads':
      content = <LoadsPage onAdd={() => setPage({ name: 'add-load' })} onEdit={(id) => setPage({ name: 'add-load', loadId: id })} />;
      break;
    case 'add-load':
      content = <AddEditLoadPage loadId={page.loadId} onBack={() => setPage({ name: 'loads' })} onSave={() => setPage({ name: 'loads' })} />;
      break;
    case 'trips':
      content = <TripsPage onAdd={() => setPage({ name: 'add-trip' })} onTripClick={(id) => setPage({ name: 'trip-details', tripId: id })} />;
      break;
    case 'add-trip':
      content = <AddEditTripPage tripId={page.tripId} onBack={() => setPage({ name: 'trips' })} onSave={() => setPage({ name: 'trips' })} />;
      break;
    case 'trip-details':
      content = <TripDetailsPage tripId={page.tripId} onBack={() => setPage({ name: 'trips' })} onEditLoad={(id) => setPage({ name: 'add-load', loadId: id })} />;
      break;
    case 'customers':
      content = <CustomersPage onAdd={() => setPage({ name: 'add-customer' })} onViewDetails={(id) => setPage({ name: 'customer-details', customerId: id })} />;
      break;
    case 'add-customer':
      content = <AddEditCustomerPage customerId={page.customerId} onBack={() => setPage({ name: 'customers' })} onSave={() => setPage({ name: 'customers' })} />;
      break;
    case 'customer-details':
      content = <CustomerDetailsPage customerId={page.customerId} onBack={() => setPage({ name: 'customers' })} onEditLoad={(id) => setPage({ name: 'add-load', loadId: id })} onEditCustomer={() => setPage({ name: 'add-customer', customerId: page.customerId })} />;
      break;
    case 'drivers':
      content = <DriversPage onAdd={() => setPage({ name: 'add-driver' })} onViewDetails={(id) => setPage({ name: 'driver-details', driverId: id })} />;
      break;
    case 'add-driver':
      content = <AddEditDriverPage driverId={page.driverId} onBack={() => setPage({ name: 'drivers' })} onSave={() => setPage({ name: 'drivers' })} />;
      break;
    case 'driver-details':
      content = <DriverDetailsPage driverId={page.driverId} onBack={() => setPage({ name: 'drivers' })} onEdit={() => setPage({ name: 'add-driver', driverId: page.driverId })} onEditLoad={(id) => setPage({ name: 'add-load', loadId: id })} onViewTrip={(id) => setPage({ name: 'trip-details', tripId: id })} />;
      break;
    case 'trucks':
      content = <TrucksPage onAdd={() => setPage({ name: 'add-truck' })} onViewDetails={(id) => setPage({ name: 'truck-details', truckId: id })} />;
      break;
    case 'add-truck':
      content = <AddEditTruckPage truckId={page.truckId} onBack={() => setPage({ name: 'trucks' })} onSave={() => setPage({ name: 'trucks' })} />;
      break;
    case 'truck-details':
      content = <TruckDetailsPage truckId={page.truckId} onBack={() => setPage({ name: 'trucks' })} onEdit={() => setPage({ name: 'add-truck', truckId: page.truckId })} />;
      break;
    default:
      content = <DashboardPage setPage={setPage} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pl-20">
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3 z-40 safe-area-pb">
        <NavLink pageName="dashboard" icon={<DashboardIcon active={page.name === 'dashboard'} />} label="Home" page={page} setPage={setPage} />
        <NavLink pageName="loads" icon={<LoadsIcon active={page.name.startsWith('load')} />} label="Loads" page={page} setPage={setPage} />
        <NavLink pageName="trips" icon={<TripsIcon active={page.name.startsWith('trip')} />} label="Trips" page={page} setPage={setPage} />
        <NavLink pageName="customers" icon={<CustomersIcon active={page.name.startsWith('customer')} />} label="Parties" page={page} setPage={setPage} />
        <NavLink pageName="drivers" icon={<DriversIcon active={page.name.startsWith('driver')} />} label="Drivers" page={page} setPage={setPage} />
        <NavLink pageName="trucks" icon={<TrucksIcon active={page.name.startsWith('truck')} />} label="Trucks" page={page} setPage={setPage} />
      </div>

      {/* Desktop Side Nav (Optional, simplified) */}
      <div className="hidden md:flex fixed top-0 bottom-0 left-0 w-20 bg-white border-r border-gray-200 flex-col items-center py-6 space-y-8 z-40">
         <NavLink pageName="dashboard" icon={<DashboardIcon active={page.name === 'dashboard'} />} label="Home" page={page} setPage={setPage} />
         <NavLink pageName="loads" icon={<LoadsIcon active={page.name.startsWith('load')} />} label="Loads" page={page} setPage={setPage} />
         <NavLink pageName="trips" icon={<TripsIcon active={page.name.startsWith('trip')} />} label="Trips" page={page} setPage={setPage} />
         <NavLink pageName="customers" icon={<CustomersIcon active={page.name.startsWith('customer')} />} label="Parties" page={page} setPage={setPage} />
         <NavLink pageName="drivers" icon={<DriversIcon active={page.name.startsWith('driver')} />} label="Drivers" page={page} setPage={setPage} />
      </div>

      <main className="max-w-3xl mx-auto min-h-screen">
        {content}
      </main>
    </div>
  );
};

export default App;
