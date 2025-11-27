import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, // Import this
  onAuthStateChanged 
} from 'firebase/auth';

import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  Plus, Trash2, Edit2, ExternalLink, TrendingUp, 
  CreditCard, AlertTriangle, CheckCircle,
  LayoutDashboard, List, ArrowRight,
  Tv, Wifi, Box, Activity, GraduationCap, Globe, MoreHorizontal,
  Coins, Users, Sparkles, Calendar as CalendarIcon, X, LogOut
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// --- YOUR PRODUCTION CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyComtIWkk7QPQlslQJHguVbpHj0WeEGDCA",
  authDomain: "submanager-724b2.firebaseapp.com",
  projectId: "submanager-724b2",
  storageBucket: "submanager-724b2.firebasestorage.app",
  messagingSenderId: "1068057713036",
  appId: "1:1068057713036:web:0b470553d97d3f2ec81ea9",
  measurementId: "G-BMRJKDSTSF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// NOTE: When deploying, replace this with your actual Gemini API Key string.
const apiKey = ""; // In this preview environment, the key is injected automatically.

// --- Constants & Data ---
const EXCHANGE_RATES = {
  CZK: 1,
  USD: 23.5,
  EUR: 25.3,
  GBP: 29.8
};

const CATEGORIES = [
  { id: 'Entertainment', icon: Tv, color: 'bg-purple-100 text-purple-600' },
  { id: 'Utilities', icon: Wifi, color: 'bg-blue-100 text-blue-600' },
  { id: 'Software', icon: Box, color: 'bg-indigo-100 text-indigo-600' },
  { id: 'Health & Fitness', icon: Activity, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'Education', icon: GraduationCap, color: 'bg-orange-100 text-orange-600' },
  { id: 'Finance', icon: Coins, color: 'bg-yellow-100 text-yellow-600' },
  { id: 'Other', icon: MoreHorizontal, color: 'bg-slate-100 text-slate-600' }
];

const PERIODS = [
  { label: 'Monthly', value: 'monthly', multiplier: 12 },
  { label: 'Yearly', value: 'yearly', multiplier: 1 },
  { label: 'Weekly', value: 'weekly', multiplier: 52 },
];

const CURRENCIES = ['CZK', 'USD', 'EUR', 'GBP'];

const PRESET_SERVICES = {
  Entertainment: [
    { name: 'Netflix', domain: 'netflix.com', url: 'https://www.netflix.com/youraccount' },
    { name: 'Spotify', domain: 'spotify.com', url: 'https://www.spotify.com/account/overview/' },
    { name: 'Disney+', domain: 'disneyplus.com', url: 'https://www.disneyplus.com/account' },
    { name: 'Amazon Prime', domain: 'amazon.com', url: 'https://www.amazon.com/mc/pipelines/cancellation' },
    { name: 'Hulu', domain: 'hulu.com', url: 'https://secure.hulu.com/account' },
    { name: 'YouTube Premium', domain: 'youtube.com', url: 'https://www.youtube.com/paid_memberships' },
    { name: 'HBO Max', domain: 'hbomax.com', url: 'https://www.hbomax.com/account' },
  ],
  Software: [
    { name: 'Adobe Creative Cloud', domain: 'adobe.com', url: 'https://account.adobe.com/plans' },
    { name: 'Microsoft 365', domain: 'microsoft.com', url: 'https://account.microsoft.com/services' },
    { name: 'Google One', domain: 'google.com', url: 'https://one.google.com/settings' },
    { name: 'ChatGPT Plus', domain: 'openai.com', url: 'https://chat.openai.com/#settings' },
    { name: 'Github Copilot', domain: 'github.com', url: 'https://github.com/settings/billing' },
    { name: 'Dropbox', domain: 'dropbox.com', url: 'https://www.dropbox.com/account/plan' },
  ],
  'Health & Fitness': [
    { name: 'Strava', domain: 'strava.com', url: 'https://www.strava.com/settings/my_account' },
    { name: 'MyFitnessPal', domain: 'myfitnesspal.com', url: 'https://www.myfitnesspal.com/account/login' },
    { name: 'Peloton', domain: 'onepeloton.com', url: 'https://www.onepeloton.com/settings/subscriptions' },
    { name: 'Fitbit Premium', domain: 'fitbit.com', url: 'https://www.fitbit.com/settings' },
  ],
  Education: [
    { name: 'Duolingo', domain: 'duolingo.com', url: 'https://www.duolingo.com/settings/plus' },
    { name: 'Coursera', domain: 'coursera.org', url: 'https://www.coursera.org/my-purchases' },
    { name: 'MasterClass', domain: 'masterclass.com', url: 'https://www.masterclass.com/account/edit' },
    { name: 'Udemy', domain: 'udemy.com', url: 'https://www.udemy.com/user/edit-payment-methods/' },
  ],
  Utilities: [
    { name: 'Mobile Plan', domain: '', url: '' },
    { name: 'Internet', domain: '', url: '' },
    { name: 'Electricity', domain: '', url: '' },
  ],
  Finance: [
    { name: 'Bank Fee', domain: '', url: '' },
    { name: 'Trading View', domain: 'tradingview.com', url: 'https://www.tradingview.com/gopro/' },
  ],
  Other: []
};

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#64748b'];

// --- Utility Functions ---
const getLogoUrl = (domain) => domain ? `https://logo.clearbit.com/${domain}` : null;

// Returns monthly cost in CZK (taking split into account)
const calculateMonthlyCostCZK = (price, currency, period, splitCount = 1) => {
  const p = PERIODS.find(p => p.value === period);
  if (!p) return 0;
  
  let monthlyPrice = 0;
  const numericPrice = parseFloat(price) || 0;

  if (period === 'monthly') monthlyPrice = numericPrice;
  else if (period === 'yearly') monthlyPrice = numericPrice / 12;
  else if (period === 'weekly') monthlyPrice = numericPrice * 4.33;

  const rate = EXCHANGE_RATES[currency] || 1;
  return (monthlyPrice * rate) / (parseInt(splitCount) || 1);
};

// Calculate next billing date
const getNextBillingDate = (startDateStr, period) => {
  if (!startDateStr) return null;
  const start = new Date(startDateStr);
  const today = new Date();
  
  // Create a date object for the next occurrence
  let nextDate = new Date(start);
  
  while (nextDate < today) {
    if (period === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (period === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else if (period === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else {
      break; 
    }
  }
  return nextDate;
};

// --- Components ---

const StatCard = ({ title, value, subtext, icon: Icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-lg ${colorClass}`}>
      <Icon size={24} className="text-white" />
    </div>
  </div>
);

const UsageBadge = ({ rating }) => {
  let color = 'bg-slate-100 text-slate-600';
  let text = 'Unknown';
  
  if (rating >= 4) { color = 'bg-emerald-100 text-emerald-700'; text = 'Essential'; }
  else if (rating === 3) { color = 'bg-blue-100 text-blue-700'; text = 'Regular'; }
  else if (rating <= 2 && rating > 0) { color = 'bg-red-100 text-red-700'; text = 'Rarely Used'; }

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {text}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const AiAdviceModal = ({ isOpen, onClose, advice, loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-yellow-300" />
            <h3 className="text-lg font-semibold">AI Financial Assistant</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="text-slate-500 animate-pulse">Analyzing market rates, searching for coupons, and drafting negotiation tactics...</p>
            </div>
          ) : (
            <div className="prose prose-slate prose-sm max-w-none">
              <ReactMarkdown>{advice}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  
  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');

  const [editItem, setEditItem] = useState(null);
  const [step, setStep] = useState(1);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', category: 'Entertainment', price: '', currency: 'CZK', 
    period: 'monthly', paymentMethod: '', usageRating: 3, 
    domain: '', url: '', startDate: new Date().toISOString().split('T')[0],
    splitCount: 1, isSplit: false
  });

  // --- Auth & Data Fetching ---
/*   useEffect(() => {
    // PREVIEW ENVIRONMENT AUTH:
    // This is required for the preview to work. When deploying to production, 
    // you can swap this for Google Auth (signInWithPopup) as shown in the deployment guide.
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []); */

// Inside your App component:
useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u); // Set the user
      
      if (u) {
        // 1. User is logged in: Start fetching subscriptions
        const q = query(
          // MAKE SURE THIS PATH IS CORRECT (No appId!):
          collection(db, 'users', u.uid, 'subscriptions'),
          orderBy('createdAt', 'desc')
        );

        const unsubDocs = onSnapshot(q, 
          (snapshot) => {
            const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSubscriptions(subs);
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching subs:", error);
            setLoading(false);
          }
        );
        return () => unsubDocs();
      } else {
        // 2. User is NOT logged in: Prompt Google Login
        setSubscriptions([]);
        setLoading(false);
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch((error) => {
           console.error("Login failed:", error);
        });
      }
    });

    return () => unsubscribe();
  }, []); // End of useEffect

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    // Strict path for preview environment:
    const q = query(
      collection(db, 'users', user.uid, 'subscriptions'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSubscriptions(subs);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching subs:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // --- AI Function ---
  const generateAiAdvice = async (sub) => {
    setIsAiModalOpen(true);
    setAiLoading(true);
    setAiAdvice('');

    try {
      const prompt = `
        I am a user in the Czech Republic managing my subscriptions.
        I subscribe to "${sub.name}" (${sub.category}).
        I pay ${sub.price} ${sub.currency} per ${sub.period}.
        My usage rating is ${sub.usageRating}/5 (1=low, 5=high).
        
        Please provide:
        1. A brief analysis of if this price is competitive in CZK.
        2. 2-3 specific cheaper alternatives available in Europe/Czechia.
        3. A search for active promo codes, voucher deals, or student/family plan hacks to lower the specific cost of ${sub.name}.
        4. A "Negotiation Script" I can copy-paste to their support chat to ask for a discount or retention offer.
        
        Keep it concise and actionable.
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate advice at this time.";
      setAiAdvice(text);
    } catch (error) {
      console.error("AI Error:", error);
      setAiAdvice("An error occurred while contacting the financial assistant.");
    } finally {
      setAiLoading(false);
    }
  };

  // --- Derived State (Analytics) ---
  const stats = useMemo(() => {
    let totalMonthlyCZK = 0;
    let totalYearlyCZK = 0;
    const categoryData = {};
    let potentialSavingsCZK = 0;
    let wastersCount = 0;
    const timelineEvents = [];

    subscriptions.forEach(sub => {
      // Logic for split cost
      const userSharePrice = sub.isSplit ? (sub.price / sub.splitCount) : sub.price;
      const monthlyCZK = calculateMonthlyCostCZK(sub.price, sub.currency, sub.period, sub.isSplit ? sub.splitCount : 1);
      
      totalMonthlyCZK += monthlyCZK;
      totalYearlyCZK += monthlyCZK * 12;

      // Category breakdown
      if (!categoryData[sub.category]) categoryData[sub.category] = 0;
      categoryData[sub.category] += monthlyCZK;

      // Savings identification (Low usage + cost > 0)
      if (sub.usageRating <= 2 && monthlyCZK > 0) {
        potentialSavingsCZK += monthlyCZK;
        wastersCount++;
      }

      // Timeline Logic
      const nextBillDate = getNextBillingDate(sub.startDate, sub.period);
      if (nextBillDate) {
        const today = new Date();
        const diffTime = Math.abs(nextBillDate - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 31) {
          timelineEvents.push({
            ...sub,
            nextBillDate,
            daysUntil: diffDays,
            userSharePrice
          });
        }
      }
    });

    // Sort timeline by closest date
    timelineEvents.sort((a, b) => a.daysUntil - b.daysUntil);

    const pieData = Object.entries(categoryData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalMonthlyCZK, totalYearlyCZK, pieData, potentialSavingsCZK, wastersCount, timelineEvents };
  }, [subscriptions]);

  // --- Handlers ---
  const handleOpenModal = (item = null) => {
    setStep(1); // Reset wizard
    if (item) {
      setEditItem(item);
      setFormData(item);
    } else {
      setEditItem(null);
      setFormData({
        name: '', category: '', price: '', currency: 'CZK', 
        period: 'monthly', paymentMethod: '', usageRating: 3, 
        domain: '', url: '', startDate: new Date().toISOString().split('T')[0],
        splitCount: 1, isSplit: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!user) return;

    try {
      const colRef = collection(db, 'users', user.uid, 'subscriptions');
      const dataToSave = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        splitCount: parseInt(formData.splitCount) || 1,
        usageRating: parseInt(formData.usageRating) || 3,
        updatedAt: serverTimestamp()
      };

      if (editItem) {
        await updateDoc(doc(colRef, editItem.id), dataToSave);
      } else {
        await addDoc(colRef, { ...dataToSave, createdAt: serverTimestamp() });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!user || !window.confirm('Are you sure you want to remove this subscription?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'subscriptions', id));
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const updateForm = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  // --- Renderers ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Monthly Cost (My Share)" 
          value={`${stats.totalMonthlyCZK.toFixed(0)} Kč`} 
          subtext={`Est. ${stats.totalYearlyCZK.toLocaleString('cs-CZ')} Kč / yr`}
          icon={CreditCard} 
          colorClass="bg-indigo-500" 
        />
        <StatCard 
          title="Active Subscriptions" 
          value={subscriptions.length} 
          subtext="Services tracked"
          icon={List} 
          colorClass="bg-blue-500" 
        />
        <StatCard 
          title="Potential Savings" 
          value={`${stats.potentialSavingsCZK.toFixed(0)} Kč`} 
          subtext={`${stats.wastersCount} rarely used services`}
          icon={TrendingUp} 
          colorClass="bg-emerald-500" 
        />
      </div>

      {/* Cash Flow Timeline */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="text-indigo-500" size={20} />
          <h3 className="text-lg font-bold text-slate-800">Cash Flow (Next 30 Days)</h3>
        </div>
        
        {stats.timelineEvents.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {stats.timelineEvents.map((evt, idx) => (
              <div key={idx} className={`flex-shrink-0 w-40 p-3 rounded-lg border flex flex-col justify-between relative ${
                evt.daysUntil <= 7 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
              }`}>
                {evt.daysUntil <= 7 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden">
                      {getLogoUrl(evt.domain) ? (
                        <img src={getLogoUrl(evt.domain)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-slate-400">{evt.name[0]}</span>
                      )}
                   </div>
                   <span className="text-xs font-semibold text-slate-700 truncate">{evt.name}</span>
                </div>
                <div>
                   <div className={`text-lg font-bold ${evt.daysUntil <= 7 ? 'text-red-700' : 'text-slate-700'}`}>
                     {evt.userSharePrice.toFixed(0)} <span className="text-xs font-normal">{evt.currency}</span>
                   </div>
                   <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                     Due in {evt.daysUntil} days
                   </div>
                   <div className="text-[10px] text-slate-400">
                     {evt.nextBillDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-sm">No bills due in the next 30 days. Relax! 🎉</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Spending by Category (CZK)</h3>
          <div className="h-64 w-full">
            {stats.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.pieData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                  <RechartsTooltip 
                    cursor={{fill: 'transparent'}} 
                    formatter={(value) => `${value.toFixed(0)} Kč`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No data available</div>
            )}
          </div>
        </div>

        {/* Suggestions / Money Wasters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-amber-500" size={20} />
            <h3 className="text-lg font-bold text-slate-800">Optimization Tips</h3>
          </div>
          
          <div className="space-y-4">
            {stats.wastersCount > 0 ? (
              subscriptions.filter(s => s.usageRating <= 2 && s.price > 0).slice(0, 3).map(sub => (
                <div key={sub.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-red-800 text-sm">{sub.name}</span>
                    <span className="text-xs font-bold text-red-600">
                      {sub.price} {sub.currency}
                    </span>
                  </div>
                  <p className="text-xs text-red-700 mb-2">You rarely use this. Consider cancelling?</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => generateAiAdvice(sub)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs bg-white border border-red-200 text-red-600 hover:bg-red-50 py-1.5 rounded shadow-sm transition-colors"
                    >
                      <Sparkles size={12} /> Optimize with AI
                    </button>
                    {sub.url && (
                      <a href={sub.url} target="_blank" rel="noreferrer" className="flex items-center justify-center p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto text-emerald-400 mb-2" size={32} />
                <p className="text-sm text-slate-500">Your portfolio looks healthy! No clear waste detected.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cost</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Details</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Usage</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">
                  No subscriptions yet. Add one to get started!
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                        {sub.domain ? (
                          <img 
                            src={getLogoUrl(sub.domain)} 
                            alt={sub.name} 
                            onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-slate-400">{sub.name.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{sub.name}</div>
                        <div className="text-xs text-slate-500">{sub.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-800 flex items-center gap-1">
                      {sub.isSplit && <Users size={12} className="text-indigo-500" />}
                      {sub.isSplit ? (sub.price / sub.splitCount).toFixed(2) : sub.price} {sub.currency}
                    </div>
                    <div className="text-xs text-slate-400">per {sub.period.replace('ly', '')}</div>
                    {sub.currency !== 'CZK' && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        ≈ {calculateMonthlyCostCZK(sub.price, sub.currency, sub.period, sub.isSplit ? sub.splitCount : 1).toFixed(0)} Kč/mo
                      </div>
                    )}
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CreditCard size={14} className="text-slate-400" />
                      {sub.paymentMethod || 'Unknown'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Starts: {new Date(sub.startDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell">
                    <UsageBadge rating={sub.usageRating} />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => generateAiAdvice(sub)}
                        title="Optimize with AI"
                        className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      >
                        <Sparkles size={16} />
                      </button>
                      {sub.url && (
                        <a 
                          href={sub.url} 
                          target="_blank" 
                          rel="noreferrer"
                          title="Manage Subscription"
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button 
                        onClick={() => handleOpenModal(sub)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(sub.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- Wizard Component ---
  const renderWizardContent = () => {
    // Step 1: Category Selection
    if (step === 1) {
      return (
        <div className="space-y-4">
           <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Step 1: Select Type</h4>
           <div className="grid grid-cols-2 gap-3">
             {CATEGORIES.map(cat => (
               <button
                 key={cat.id}
                 onClick={() => {
                   updateForm('category', cat.id);
                   setStep(2);
                 }}
                 className={`p-4 rounded-xl border transition-all text-left flex items-start gap-3 hover:shadow-md ${
                   formData.category === cat.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-300'
                 }`}
               >
                 <div className={`p-2 rounded-lg ${cat.color} shrink-0`}>
                   <cat.icon size={20} />
                 </div>
                 <span className="font-medium text-slate-700 mt-1">{cat.id}</span>
               </button>
             ))}
           </div>
        </div>
      );
    }

    // Step 2: Service Selection
    if (step === 2) {
      const presets = PRESET_SERVICES[formData.category] || [];
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Step 2: Choose Service</h4>
            <button onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-slate-600">Change Type</button>
          </div>
          
          <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto">
            {presets.map(service => (
              <button
                key={service.name}
                onClick={() => {
                  setFormData(prev => ({ ...prev, ...service }));
                  setStep(3);
                }}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                   {getLogoUrl(service.domain) ? (
                     <img src={getLogoUrl(service.domain)} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <Globe className="text-slate-300" size={20} />
                   )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{service.name}</div>
                  <div className="text-xs text-slate-400 group-hover:text-indigo-500 truncate">{service.domain || 'Custom Service'}</div>
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500" />
              </button>
            ))}
            
            <button
              onClick={() => {
                setFormData(prev => ({...prev, name: '', domain: '', url: ''}));
                setStep(3);
              }}
              className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left text-slate-500 hover:text-indigo-600"
            >
               <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                 <Plus size={20} />
               </div>
               <span className="font-medium">Create Custom Subscription</span>
            </button>
          </div>
        </div>
      );
    }

    // Step 3: Financial Details
    if (step === 3) {
      return (
        <div className="space-y-5">
           <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Step 3: Financials</h4>
            <button onClick={() => setStep(2)} className="text-xs text-slate-400 hover:text-slate-600">Back</button>
          </div>

          <div className="space-y-3">
             <div className="space-y-1">
               <label className="text-xs font-semibold text-slate-500">Service Name</label>
               <input 
                 required type="text" value={formData.name} 
                 onChange={e => updateForm('name', e.target.value)}
                 className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
               />
             </div>
             
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-xs font-semibold text-slate-500">Total Price</label>
                 <input 
                   required type="number" step="0.01" value={formData.price} 
                   onChange={e => updateForm('price', e.target.value)}
                   className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-semibold text-slate-500">Currency</label>
                 <select 
                   value={formData.currency} 
                   onChange={e => updateForm('currency', e.target.value)}
                   className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                 >
                   {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
             </div>

             {/* Split Logic Toggle */}
             <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
               <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                   <Users size={16} className="text-indigo-500" />
                   <span className="text-sm font-semibold text-slate-700">Split cost?</span>
                 </div>
                 <input 
                   type="checkbox" 
                   checked={formData.isSplit}
                   onChange={e => updateForm('isSplit', e.target.checked)}
                   className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                 />
               </div>
               {formData.isSplit && (
                 <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                   <div className="flex items-center gap-3">
                     <div className="flex-1">
                       <label className="text-xs text-slate-500 mb-1 block">Split between (people)</label>
                       <input 
                         type="number" min="2" max="20"
                         value={formData.splitCount} 
                         onChange={e => updateForm('splitCount', e.target.value)}
                         className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-sm"
                       />
                     </div>
                     <div className="flex-1 text-right">
                       <div className="text-xs text-slate-500 mb-1">Your Share</div>
                       <div className="font-bold text-indigo-600">
                         {formData.price && formData.splitCount ? (formData.price / formData.splitCount).toFixed(2) : '0.00'} <span className="text-xs">{formData.currency}</span>
                       </div>
                     </div>
                   </div>
                 </div>
               )}
             </div>

             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-xs font-semibold text-slate-500">Billing Period</label>
                 <select 
                   value={formData.period} 
                   onChange={e => updateForm('period', e.target.value)}
                   className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                 >
                   {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-semibold text-slate-500">Start Date</label>
                 <input 
                   type="date" value={formData.startDate}
                   onChange={e => updateForm('startDate', e.target.value)}
                   className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                 />
               </div>
             </div>
             
             <div className="space-y-1 pt-2">
                <label className="text-xs font-semibold text-slate-500">Website Domain (for logo)</label>
                <input 
                  type="text" value={formData.domain} placeholder="e.g. netflix.com"
                  onChange={e => updateForm('domain', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
             </div>
          </div>
          <button 
             onClick={() => setStep(4)}
             disabled={!formData.name || !formData.price}
             className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
             Next Step
          </button>
        </div>
      );
    }

    // Step 4: Usage Evaluation
    if (step === 4) {
      return (
        <div className="space-y-6 text-center">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Step 4: Evaluation</h4>
            <button onClick={() => setStep(3)} className="text-xs text-slate-400 hover:text-slate-600">Back</button>
          </div>

          <div className="py-4">
             <h3 className="text-xl font-bold text-slate-800 mb-2">How much do you use {formData.name}?</h3>
             <p className="text-slate-500 text-sm mb-6">This helps us identify potential savings.</p>
             
             <div className="flex flex-col gap-3">
               {[5, 4, 3, 2, 1].map((rating) => (
                 <button
                   key={rating}
                   onClick={() => updateForm('usageRating', rating)}
                   className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 ${
                     formData.usageRating === rating 
                       ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' 
                       : 'bg-white border-slate-200 hover:bg-slate-50'
                   }`}
                 >
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                     formData.usageRating === rating ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                   }`}>
                     {rating}
                   </div>
                   <div className="text-left">
                     <div className={`font-semibold ${formData.usageRating === rating ? 'text-indigo-900' : 'text-slate-700'}`}>
                       {rating === 5 ? 'Daily / Essential' : 
                        rating === 4 ? 'Often / Very Useful' :
                        rating === 3 ? 'Regularly / Occasional' :
                        rating === 2 ? 'Rarely / Could live without' : 'Never / Waste of money'}
                     </div>
                   </div>
                 </button>
               ))}
             </div>
          </div>

          <button 
             onClick={handleSave}
             className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
          >
             Save Subscription
          </button>
        </div>
      );
    }
  };

  // --- Simplified Edit Form (Single Page) ---
  const renderEditContent = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500">Name</label>
        <input 
          required type="text" value={formData.name} onChange={e => updateForm('name', e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500">Total Cost</label>
          <input 
            required type="number" step="0.01" value={formData.price} onChange={e => updateForm('price', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div className="space-y-1">
           <label className="text-xs font-semibold text-slate-500">Currency</label>
           <select 
             value={formData.currency} 
             onChange={e => updateForm('currency', e.target.value)}
             className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
           >
             {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
        </div>
      </div>
      
      {/* Split Logic Edit */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
         <div className="flex items-center justify-between mb-2">
           <span className="text-sm font-semibold text-slate-700">Split cost?</span>
           <input 
             type="checkbox" 
             checked={formData.isSplit}
             onChange={e => updateForm('isSplit', e.target.checked)}
           />
         </div>
         {formData.isSplit && (
           <div className="flex items-center gap-3">
             <div className="flex-1">
               <label className="text-xs text-slate-500 block">People</label>
               <input 
                 type="number" min="2" max="20"
                 value={formData.splitCount} 
                 onChange={e => updateForm('splitCount', e.target.value)}
                 className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-sm"
               />
             </div>
             <div className="flex-1 text-right">
               <div className="text-xs text-slate-500">Your Share</div>
               <div className="font-bold text-indigo-600">
                 {formData.price && formData.splitCount ? (formData.price / formData.splitCount).toFixed(2) : '0.00'}
               </div>
             </div>
           </div>
         )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500">Start Date</label>
        <input 
           type="date" value={formData.startDate}
           onChange={e => updateForm('startDate', e.target.value)}
           className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
         />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-500">Category</label>
        <select value={formData.category} onChange={e => updateForm('category', e.target.value)} className="w-full px-3 py-2 border rounded-lg">
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
        </select>
      </div>
       <div className="space-y-1">
         <label className="text-xs font-semibold text-slate-500">Usage (1-5)</label>
         <input 
           type="range" min="1" max="5" value={formData.usageRating} onChange={e => updateForm('usageRating', e.target.value)}
           className="w-full"
         />
         <div className="flex justify-between text-xs text-slate-400"><span>Rarely</span><span>Daily</span></div>
      </div>
      <div className="pt-4">
        <button onClick={handleSave} className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg">Save Changes</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <CreditCard className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              SubManager
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleOpenModal()} 
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add New</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl mb-8 w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'list' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <List size={18} />
            All Subscriptions
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
             <p>Loading your vault...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'list' && renderList()}
          </>
        )}
      </main>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editItem ? "Edit Subscription" : `Add New Subscription`}
      >
        {editItem ? renderEditContent() : renderWizardContent()}
      </Modal>
      
      {/* AI Advice Modal */}
      <AiAdviceModal 
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        advice={aiAdvice}
        loading={aiLoading}
      />
    </div>
  );
}