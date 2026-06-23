import React, { useState } from 'react';
import { DatabaseState, Vendor, PurchaseEntry, ExpenseEntry, Product, Order, TreasuryAccount, TreasuryTransaction, OrderStatus } from '../../types';
import { triggerCSVDownload } from '../CSVHelper';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Package, 
  FileSpreadsheet, 
  Calendar, 
  AlertTriangle,
  ArrowRightLeft,
  Briefcase,
  PieChart,
  Search,
  Check,
  Pencil
} from 'lucide-react';

interface AccountingTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
}

export default function AccountingTab({ state, onUpdateState }: AccountingTabProps) {
  // Sub tab selection
  const [accountingSubTab, setAccountingSubTab] = useState<'pL' | 'vendors' | 'purchases' | 'expenses' | 'stockValuation' | 'treasury'>('pL');

  // Date filters
  const [startDate, setStartDate] = useState<string>('2026-05-01');
  const [endDate, setEndDate] = useState<string>('2026-06-30');

  // State handles for adding components
  // 1. Vendor
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorAddress, setNewVendorAddress] = useState('');
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  // 2. Purchase Entry Redesigned Draft states
  interface DraftBillItem {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    selectedVariations?: { name: string; value: string; priceAdjustment: number }[];
  }
  const [billItems, setBillItems] = useState<DraftBillItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [chosenProduct, setChosenProduct] = useState<Product | null>(null);
  const [selectedPurchaseVarOptions, setSelectedPurchaseVarOptions] = useState<{ [variationId: string]: string }>({});
  const [lineQty, setLineQty] = useState<number>(1);
  const [lineUnitCost, setLineUnitCost] = useState<number>(0);
  const [showConfirmBillModal, setShowConfirmBillModal] = useState(false);

  // Keep compatibility variables
  const [selectedProductIdPur, setSelectedProductIdPur] = useState('');
  const [selectedVendorIdPur, setSelectedVendorIdPur] = useState('');
  const [purchaseQty, setPurchaseQty] = useState<number>(10);
  const [purchaseUnitCost, setPurchaseUnitCost] = useState<number>(0);
  const [purchaseRef, setPurchaseRef] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseBillType, setPurchaseBillType] = useState<'vat' | 'pan' | 'estimated'>('vat');

  // 3. Expense Entry
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseCategory, setExpenseCategory] = useState('Marketing');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('');
  const [stockValuationSearch, setStockValuationSearch] = useState('');

  // 4. Treasury Account Management & Log States
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState(state.treasuryAccounts?.[0]?.id || 'acc-4');
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'bank' | 'esewa' | 'khalti' | 'cash' | 'other'>('bank');
  const [newAccBankName, setNewAccBankName] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccBalance, setNewAccBalance] = useState<number>(0);
  const [newTxType, setNewTxType] = useState<'credit' | 'debit'>('credit');
  const [newTxAmount, setNewTxAmount] = useState<number>(0);
  const [newTxDesc, setNewTxDesc] = useState('');
  const [newTxAccountId, setNewTxAccountId] = useState(state.treasuryAccounts?.[0]?.id || 'acc-4');

  // Customer/Vendor report filters
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [vendorReportSearchId, setVendorReportSearchId] = useState('');

  // Get arrays safely since they were auto-migrated
  const vendorsList = state.vendors || [];
  const purchaseEntries = state.purchaseEntries || [];
  const expenseEntries = state.expenseEntries || [];

  // -------------------------------------------------------------
  // Data Filtering Utilities
  // -------------------------------------------------------------
  const isWithinDateRange = (dateStr: string) => {
    if (!dateStr) return false;
    // Normalize format
    const checkDate = dateStr.slice(0, 10);
    return checkDate >= startDate && checkDate <= endDate;
  };

  const filteredOrders = state.orders.filter(o => isWithinDateRange(o.createdAt));
  const filteredPurchases = purchaseEntries.filter(p => isWithinDateRange(p.purchaseDate));
  const filteredExpenses = expenseEntries.filter(e => isWithinDateRange(e.expenseDate));

  // -------------------------------------------------------------
  // Accounting Operations
  // -------------------------------------------------------------
  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;

    if (editingVendorId) {
      const updatedVendors = vendorsList.map(v => {
        if (v.id === editingVendorId) {
          return {
            ...v,
            name: newVendorName.trim(),
            phone: newVendorPhone.trim() || 'N/A',
            email: newVendorEmail.trim() || 'N/A',
            address: newVendorAddress.trim() || 'N/A'
          };
        }
        return v;
      });

      onUpdateState({
        ...state,
        vendors: updatedVendors
      });

      setEditingVendorId(null);
      setNewVendorName('');
      setNewVendorPhone('');
      setNewVendorEmail('');
      setNewVendorAddress('');
      alert('Success: Supplier vendor profile updated!');
      return;
    }

    const newVendor: Vendor = {
      id: `v-${Date.now()}`,
      name: newVendorName.trim(),
      phone: newVendorPhone.trim() || 'N/A',
      email: newVendorEmail.trim() || 'N/A',
      address: newVendorAddress.trim() || 'N/A',
      createdAt: new Date().toISOString()
    };

    onUpdateState({
      ...state,
      vendors: [...vendorsList, newVendor]
    });

    // Reset fields
    setNewVendorName('');
    setNewVendorPhone('');
    setNewVendorEmail('');
    setNewVendorAddress('');
  };

  const handleDeleteVendor = (id: string) => {
    let confirmed = false;
    try {
      confirmed = confirm('Are you sure you want to remove this vendor? This will not affect prior purchase ledger records.');
    } catch (e) {
      confirmed = true;
    }
    if (!confirmed && typeof window !== 'undefined' && window.self !== window.top) {
      confirmed = true;
    }
    if (!confirmed) return;
    onUpdateState({
      ...state,
      vendors: vendorsList.filter(v => v.id !== id)
    });
  };

  const handleCreatePurchaseEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductIdPur || !selectedVendorIdPur || purchaseQty <= 0 || purchaseUnitCost <= 0) {
      alert('Please select a product, a vendor, specify a quantities higher than 0, and a cost rate.');
      return;
    }

    const matchedProd = state.products.find(p => p.id === selectedProductIdPur);
    if (!matchedProd) return;

    const newPurchase: PurchaseEntry = {
      id: `pur-${Date.now()}`,
      vendorId: selectedVendorIdPur,
      productId: selectedProductIdPur,
      quantity: purchaseQty,
      unitCost: purchaseUnitCost,
      totalCost: purchaseQty * purchaseUnitCost,
      purchaseDate: purchaseDate,
      referenceNo: purchaseRef.trim() || `PUR-${Math.floor(Math.random() * 90000 + 10000)}`
    };

    // Auto stock maintenance: Inventory levels are incremented automatically!
    const updatedProducts = state.products.map(p => {
      if (p.id === selectedProductIdPur) {
        return {
          ...p,
          stock: p.stock + purchaseQty,
          costPrice: purchaseUnitCost // Automatically updates the product's actual buying cost price
        };
      }
      return p;
    });

    // Logging warehouse logs
    const newLog = {
      id: `log-${Date.now()}`,
      productId: selectedProductIdPur,
      type: 'in' as const,
      quantity: purchaseQty,
      reason: `Wholesale Purchase Lodge: Ref #${newPurchase.referenceNo}`,
      timestamp: new Date().toISOString()
    };

    onUpdateState({
      ...state,
      products: updatedProducts,
      purchaseEntries: [...purchaseEntries, newPurchase],
      inventoryLogs: [...state.inventoryLogs, newLog]
    });

    // Reset fields
    setPurchaseQty(10);
    setPurchaseUnitCost(0);
    setPurchaseRef('');
    alert(`Purchase record added successfully. Inventory stock for "${matchedProd.name}" raised by +${purchaseQty}.`);
  };

  const handleDeletePurchaseEntry = (id: string) => {
    let confirmed = false;
    try {
      confirmed = confirm('Warning: Deleting a purchase record will NOT automatically deduct items from your stock numbers unless you edit them manually. Confirmed?');
    } catch (e) {
      confirmed = true;
    }
    if (!confirmed && typeof window !== 'undefined' && window.self !== window.top) {
      confirmed = true;
    }
    if (!confirmed) return;
    onUpdateState({
      ...state,
      purchaseEntries: purchaseEntries.filter(p => p.id !== id)
    });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || expenseAmount <= 0) {
      alert('Provide expense title and amount higher than 0');
      return;
    }

    const newExpense: ExpenseEntry = {
      id: `exp-${Date.now()}`,
      title: expenseTitle.trim(),
      amount: expenseAmount,
      category: expenseCategory,
      expenseDate: expenseDate,
      notes: expenseNotes.trim() || undefined,
      paymentAccountId: selectedPaymentAccountId // Connects directly to mapped bank or wallet
    };

    onUpdateState({
      ...state,
      expenseEntries: [...expenseEntries, newExpense]
    });

    // Reset fields
    setExpenseTitle('');
    setExpenseAmount(0);
    setExpenseNotes('');
    alert(`Expense recorded safely and mapped to your selected payment account.`);
  };

  const handleDeleteExpense = (id: string) => {
    let confirmed = false;
    try {
      confirmed = confirm('Delete this expense record?');
    } catch (e) {
      confirmed = true;
    }
    if (!confirmed && typeof window !== 'undefined' && window.self !== window.top) {
      confirmed = true;
    }
    if (!confirmed) return;
    onUpdateState({
      ...state,
      expenseEntries: expenseEntries.filter(e => e.id !== id)
    });
  };

  // -------------------------------------------------------------
  // Treasury & Accounts Operations
  // -------------------------------------------------------------
  const handleAddTreasuryAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      alert("Please enter a valid account display name");
      return;
    }
    const newAccount: TreasuryAccount = {
      id: `acc-${Date.now()}`,
      name: newAccName.trim(),
      type: newAccType,
      accountNumber: (newAccType === 'bank' || newAccType === 'esewa' || newAccType === 'khalti') ? newAccNumber.trim() : undefined,
      openingBalance: newAccBalance,
      currentBalance: newAccBalance,
      createdAt: new Date().toISOString(),
      bankName: newAccType === 'bank' ? newAccBankName.trim() : undefined,
      initialBalance: newAccBalance
    };
    const currentAccounts = state.treasuryAccounts || [];
    onUpdateState({
      ...state,
      treasuryAccounts: [...currentAccounts, newAccount]
    });
    setNewAccName('');
    setNewAccBankName('');
    setNewAccNumber('');
    setNewAccBalance(0);
    alert('Treasury account registered successfully!');
  };

  const handleAddManualTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxAccountId || newTxAmount <= 0) {
      alert('Please select a target account and provide an amount greater than 0');
      return;
    }
    const newTx: TreasuryTransaction = {
      id: `tx-${Date.now()}`,
      accountId: newTxAccountId,
      type: newTxType,
      amount: newTxAmount,
      purpose: newTxDesc.trim() || 'Manual adjustment',
      timestamp: new Date().toISOString()
    };
    const currentTx = state.treasuryTransactions || [];
    onUpdateState({
      ...state,
      treasuryTransactions: [...currentTx, newTx]
    });
    setNewTxAmount(0);
    setNewTxDesc('');
    alert('Ledger balance adjusted successfully!');
  };

  const handleUpdateGatewayMapping = (gatewayId: string, accountId: string) => {
    const currentGateways = state.paymentGateways || [];
    const updated = currentGateways.map(gw => {
      if (gw.id === gatewayId) {
        return { ...gw, mappedAccountId: accountId || undefined };
      }
      return gw;
    });
    onUpdateState({
      ...state,
      paymentGateways: updated
    });
  };

  const getGatewayKeyForOrder = (method?: string): string => {
    if (!method) return '';
    const m = method.toLowerCase();
    if (m.includes('esewa')) return 'esewa';
    if (m.includes('khalti')) return 'khalti';
    if (m.includes('fonepay_dynamic') || m.includes('fonepay dynamic')) return 'fonepay_dynamic';
    if (m.includes('fonepay_static') || m.includes('fonepay static')) return 'fonepay_static';
    if (m.includes('fonepay')) return 'fonepay';
    if (m.includes('visa') || m.includes('mastercard') || m.includes('card') || m.includes('nps')) return 'nps';
    if (m.includes('nabil')) return 'nabil';
    if (m.includes('manual') || m.includes('bank transfer')) return 'manual';
    if (m.includes('cod') || m.includes('cash on delivery')) return 'cod';
    return m;
  };

  const getAccountStats = (accountId: string) => {
    const account = (state.treasuryAccounts || []).find(a => a.id === accountId);
    if (!account) return { credit: 0, debit: 0, current: 0 };
    
    let creditSum = 0;
    let debitSum = 0;

    // 1. Manual adjustments
    const manualTxs = (state.treasuryTransactions || []).filter(tx => tx.accountId === accountId);
    manualTxs.forEach(tx => {
      const typeStr = tx.type.toLowerCase();
      if (typeStr === 'credit') creditSum += tx.amount;
      else debitSum += tx.amount;
    });

    // 2. Expenses
    const matchedExpenses = (state.expenseEntries || []).filter(e => e.paymentAccountId === accountId);
    matchedExpenses.forEach(e => {
      debitSum += e.amount;
    });

    // 3. Purchase entries
    const matchedPurchases = (state.purchaseEntries || []).filter(p => p.paymentAccountId === accountId);
    matchedPurchases.forEach(p => {
      debitSum += p.totalCost;
    });

    // 4. Orders resolved via dynamic payment mapping
    const orderTxs = state.orders.filter(o => o.paymentStatus === 'paid' && o.status !== OrderStatus.CANCELLED);
    orderTxs.forEach(o => {
      const gkey = getGatewayKeyForOrder(o.paymentMethod);
      const gw = (state.paymentGateways || []).find(g => g.id.toLowerCase() === gkey);
      if (gw && gw.mappedAccountId === accountId) {
        creditSum += o.totalAmountBase || o.totalAmount;
      }
    });

    const initialBal = account.openingBalance !== undefined ? account.openingBalance : (account.initialBalance || 0);

    return {
      credit: creditSum,
      debit: debitSum,
      current: initialBal + creditSum - debitSum
    };
  };

  const handleExportAccountLedgerCSV = (accountId: string) => {
    const account = (state.treasuryAccounts || []).find(a => a.id === accountId);
    if (!account) return;
    const headers = ['Transaction ID', 'Date & Time', 'Type', 'Amount (Rs.)', 'Purpose', 'Reference ID'];
    const ledgers: any[] = [];
    
    const manualTxs = (state.treasuryTransactions || []).filter(tx => tx.accountId === accountId);
    manualTxs.forEach(tx => {
      ledgers.push({
        id: tx.id,
        date: tx.timestamp,
        type: tx.type === 'credit' ? 'CREDIT' : 'DEBIT',
        amount: tx.amount,
        purpose: tx.purpose,
        ref: tx.referenceId || 'N/A'
      });
    });

    const matchedExpenses = (state.expenseEntries || []).filter(e => e.paymentAccountId === accountId);
    matchedExpenses.forEach(e => {
      ledgers.push({
        id: e.id,
        date: e.expenseDate + 'T12:00:00Z',
        type: 'DEBIT',
        amount: e.amount,
        purpose: `Expense: ${e.title} (${e.category})`,
        ref: e.id
      });
    });

    const matchedPurchases = (state.purchaseEntries || []).filter(p => p.paymentAccountId === accountId);
    matchedPurchases.forEach(p => {
      ledgers.push({
        id: p.id,
        date: p.purchaseDate + 'T12:00:00Z',
        type: 'DEBIT',
        amount: p.totalCost,
        purpose: `Procurement: SKU ${p.productId} from Wholesale`,
        ref: p.referenceNo || 'N/A'
      });
    });

    const orderTxs = state.orders.filter(o => o.paymentStatus === 'paid' && o.status !== OrderStatus.CANCELLED);
    orderTxs.forEach(o => {
      const gkey = getGatewayKeyForOrder(o.paymentMethod);
      const gw = (state.paymentGateways || []).find(g => g.id.toLowerCase() === gkey);
      if (gw && gw.mappedAccountId === accountId) {
        ledgers.push({
          id: o.id,
          date: o.createdAt,
          type: 'CREDIT',
          amount: o.totalAmountBase || o.totalAmount,
          purpose: `Order Checkout Receipt (Ref: ${o.refId})`,
          ref: o.refId
        });
      }
    });

    ledgers.sort((a, b) => a.date.localeCompare(b.date));

    let rollingBalance = account.openingBalance || account.initialBalance || 0;
    const rows = ledgers.map(l => {
      if (l.type === 'CREDIT') {
        rollingBalance += l.amount;
      } else {
        rollingBalance -= l.amount;
      }
      return [
        `"${l.id}"`,
        `"${l.date}"`,
        `"${l.type}"`,
        l.amount,
        `"${l.purpose.replace(/"/g, '""')}"`,
        `"${l.ref}"`,
        rollingBalance
      ];
    });

    const csvRows = [
      ['Account Ledger Report', `"${account.name} (${account.type.toUpperCase()})"`],
      ['Opening Balance', account.openingBalance || account.initialBalance || 0],
      [],
      ['Transaction ID', 'Timestamp', 'Type', 'Amount (Rs.)', 'Purpose/Memo', 'Ref ID', 'Running Balance (Rs.)'],
      ...rows
    ];

    const csvContent = csvRows.map(r => r.join(',')).join('\n');
    triggerCSVDownload(csvContent, `treasury_ledger_${account.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`);
  };

  const customerMap: Record<string, { name: string; email: string; phone: string; orders: Order[] }> = React.useMemo(() => {
    const map: Record<string, { name: string; email: string; phone: string; orders: Order[] }> = {};
    state.orders.forEach(o => {
      const key = o.customerEmail?.toLowerCase().trim() || o.customerPhone?.trim() || o.customerName?.toLowerCase().trim();
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          name: o.customerName || 'Anonymous Gifter',
          email: o.customerEmail || 'N/A',
          phone: o.customerPhone || 'N/A',
          orders: []
        };
      }
      map[key].orders.push(o);
    });
    return map;
  }, [state.orders]);

  // -------------------------------------------------------------
  // Metrics & Calculations
  // -------------------------------------------------------------
  // Total Revenue (Base NPR)
  const totalSalesRevenueNPR = filteredOrders.reduce((sum, o) => {
    // We already keep totalAmountBase (which is total revenue converted back to NPR for accurate reports)
    return sum + (o.totalAmountBase || o.totalAmount);
  }, 0);

  // Total COGS: calculate based on items sold and their registered cost price during sale
  const totalCOGS = filteredOrders.reduce((sum, o) => {
    return sum + o.items.reduce((inner, item) => {
      const prod = state.products.find(p => p.id === item.productId);
      const costPerUnit = prod?.costPrice || 0;
      return inner + (costPerUnit * item.quantity);
    }, 0);
  }, 0);

  // Profit/Loss values
  const totalExpensesAmt = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPurchasedCapAmt = filteredPurchases.reduce((sum, p) => sum + p.totalCost, 0);
  const grossProfit = totalSalesRevenueNPR - totalCOGS;
  const netProfit = grossProfit - totalExpensesAmt;

  // -------------------------------------------------------------
  // CSV Export Triggers
  // -------------------------------------------------------------
  const exportSalesReportCSV = () => {
    const headers = ['Order Ref', 'Date & Time', 'Customer', 'Phone', 'Items', 'Currency', 'Order Total', 'NPR Base Total', 'Payment Gateway', 'Status'];
    const rows = filteredOrders.map(o => {
      const itemsLine = o.items.map(item => `${item.productName} (x${item.quantity})`).join(' | ');
      return [
        `"${o.refId}"`,
        `"${o.createdAt}"`,
        `"${o.customerName.replace(/"/g, '""')}"`,
        `"${o.customerPhone}"`,
        `"${itemsLine.replace(/"/g, '""')}"`,
        `"${o.currency}"`,
        o.totalAmount,
        o.totalAmountBase || o.totalAmount,
        `"${o.paymentMethod}"`,
        `"${o.status}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerCSVDownload(csvContent, `koseli_sales_report_${startDate}_to_${endDate}.csv`);
  };

  const exportPurchaseReportCSV = () => {
    const headers = ['Purchase ID', 'Date', 'Supplier/Vendor', 'Product', 'SKU', 'Quantity', 'Unit Cost NPR', 'Total Cost NPR', 'Reference Receipt'];
    const rows = filteredPurchases.map(p => {
      const vendorName = vendorsList.find(v => v.id === p.vendorId)?.name || 'Unknown Vendor';
      const prod = state.products.find(pr => pr.id === p.productId);
      const vStr = p.selectedVariations && p.selectedVariations.length > 0
        ? ' (' + p.selectedVariations.map(v => `${v.name}: ${v.value}`).join('; ') + ')'
        : '';
      const prodName = `${prod?.name || 'Deleted Product'}${vStr}`;
      return [
        `"${p.id}"`,
        `"${p.purchaseDate}"`,
        `"${vendorName.replace(/"/g, '""')}"`,
        `"${prodName.replace(/"/g, '""')}"`,
        `"${prod?.sku || 'N/A'}"`,
        p.quantity,
        p.unitCost,
        p.totalCost,
        `"${p.referenceNo || ''}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    triggerCSVDownload(csvContent, `koseli_purchases_report_${startDate}_to_${endDate}.csv`);
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-slate-900 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-rose-600" />
            Bookkeeping Ledger & Gifting Accountancy
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real inventory cost valuation, custom suppliers setup, automatic COGS auditing, and instant P&L statement downloads.
          </p>
        </div>

        {/* Dynamic Day / Range Date filter */}
        <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl shadow-xs self-stretch md:self-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] text-slate-500 font-bold font-mono uppercase">Ledger Filter:</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-1 px-2 border border-slate-200 rounded font-mono font-semibold focus:outline-none"
            />
            <span className="text-slate-405 font-mono">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-1 px-2 border border-slate-200 rounded font-mono font-semibold focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Primary KPI overview counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-mono tracking-widest font-bold">Total Sales (Revenue)</span>
            <div className="text-lg font-bold font-mono text-slate-900">Rs. {totalSalesRevenueNPR.toLocaleString()}</div>
            <div className="text-[9px] text-emerald-600 font-semibold">{filteredOrders.length} Gifting orders cleared</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-mono tracking-widest font-bold">Cost of Goods (COGS)</span>
            <div className="text-lg font-bold font-mono text-slate-900">Rs. {totalCOGS.toLocaleString()}</div>
            <div className="text-[9px] text-slate-400">Total physical cost of items sold</div>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-mono tracking-widest font-bold">Operating Expenses</span>
            <div className="text-lg font-bold font-mono text-slate-900">Rs. {totalExpensesAmt.toLocaleString()}</div>
            <div className="text-[9px] text-rose-500 font-semibold">{filteredExpenses.length} expense checks registered</div>
          </div>
          <div className="p-3 bg-rose-550/5 text-rose-600 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-155 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase font-mono tracking-widest font-bold">Net Profit / Margin</span>
            <div className={`text-lg font-bold font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              Rs. {netProfit.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-550 font-semibold">
              Margin percentage: {totalSalesRevenueNPR > 0 ? `${((netProfit / totalSalesRevenueNPR) * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50'}`}>
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Accounting section navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-1 flex flex-wrap gap-1 text-xs">
        <button
          onClick={() => setAccountingSubTab('pL')}
          className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${accountingSubTab === 'pL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <PieChart className="w-4 h-4" />
          Profit & Loss Statement
        </button>

        <button
          onClick={() => setAccountingSubTab('purchases')}
          className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${accountingSubTab === 'purchases' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Supplier Wholesale Purchases
        </button>

        <button
          onClick={() => setAccountingSubTab('expenses')}
          className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${accountingSubTab === 'expenses' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <TrendingDown className="w-4 h-4" />
          Operational Overhead Expenses
        </button>

        <button
          onClick={() => setAccountingSubTab('vendors')}
          className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${accountingSubTab === 'vendors' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Users className="w-4 h-4" />
          Vendor Registry
        </button>

        <button
          onClick={() => setAccountingSubTab('stockValuation')}
          className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${accountingSubTab === 'stockValuation' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Package className="w-4 h-4" />
          Stock Report & Valuation
        </button>

        <button
          onClick={() => setAccountingSubTab('treasury')}
          className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${accountingSubTab === 'treasury' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Briefcase className="w-4 h-4 text-emerald-600" />
          Treasury Accounts & Reports
        </button>
      </div>

      {// -------------------------------------------------------------
       // TAB 1: P&L Statement Breakdowns
       // -------------------------------------------------------------
       accountingSubTab === 'pL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">Interactive profit & loss statement ledger</span>
              <button 
                onClick={exportSalesReportCSV}
                className="p-1 px-2 text-[10px] uppercase font-bold font-mono text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-350 bg-white rounded flex items-center gap-1 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Audit Sales CSV
              </button>
            </div>

            <div className="p-6 space-y-6 font-sans">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                  <span>1. TOTAL GUEST / MEMBER SALES REVENUE</span>
                  <span className="font-mono text-slate-905">Rs. {totalSalesRevenueNPR.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Aggregated customer invoice receipts cleared within designated filter timeline.</p>
              </div>

              <div className="border-b border-slate-100 pb-4 pl-4 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-605">
                  <span>Gross Gifting Orders Paid</span>
                  <span className="font-mono">{filteredOrders.filter(o => o.status !== 'cancelled').length} orders</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-605">
                  <span>Gross Delivery Fee Earned</span>
                  <span className="font-mono text-slate-500">
                    Rs. {filteredOrders.reduce((sum, o) => sum + (o.deliveryChargeAmount || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="border-b border-slate-100 pb-4">
                <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                  <span>2. COST OF GOODS SOLD (COGS)</span>
                  <span className="font-mono text-rose-600">- Rs. {totalCOGS.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Calculated using recorded product cost rates combined with itemized units sold.</p>
              </div>

              <div className="border-b border-slate-150 pb-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                <div className="flex justify-between items-center text-sm font-bold text-emerald-705">
                  <span>3. REVENUE GROSS PROFIT MARGIN</span>
                  <span className="font-mono text-emerald-600">Rs. {grossProfit.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-emerald-600/75 mt-1">Sales revenue remaining after subtracting registered vendor manufacturing/ingredient cost rates.</p>
              </div>

              <div className="border-b border-slate-100 pb-4">
                <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                  <span>4. INTERN OPERATIONAL OVERHEAD EXPENSES</span>
                  <span className="font-mono text-rose-600">- Rs. {totalExpensesAmt.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Marketing, rents, logistics, payroll, and workspace utilities.</p>
              </div>

              <div className={`p-5 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-2 ${netProfit >= 0 ? 'bg-emerald-600/10 border-emerald-600/20 text-emerald-805' : 'bg-rose-500/10 border-rose-500/20 text-rose-805'}`}>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase">5. AUDITED NET TAXABLE PROFIT</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Final remaining revenue representing actual store yield.</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono">Rs. {netProfit.toLocaleString()}</div>
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono">
                    {netProfit >= 0 ? 'Surplus Balance' : 'Capital Deficit'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">Financial Summary Logs</h3>
            
            <div className="space-y-3.5 text-xs text-slate-650">
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                <span className="block font-bold text-slate-800">Average Gifting Transaction Value</span>
                <span className="block font-mono font-bold text-slate-900 text-sm">
                  Rs. {filteredOrders.length > 0 ? Math.round(totalSalesRevenueNPR / filteredOrders.length).toLocaleString() : '0'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                <span className="block font-bold text-slate-800">Wholesale Asset Reinvestments</span>
                <span className="block font-mono text-slate-905">Rs. {totalPurchasedCapAmt.toLocaleString()} spent</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                <span className="block font-bold text-slate-800">COGS to Sales Revenue Ratio</span>
                <span className="block font-mono text-slate-905">
                  {totalSalesRevenueNPR > 0 ? `${((totalCOGS / totalSalesRevenueNPR) * 100).toFixed(1)}%` : '0%'}
                </span>
                <p className="text-[9px] text-slate-450 mt-0.5 font-sans leading-relaxed">Lower is better. Represents efficient factory pricing margins.</p>
              </div>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[10.5px] leading-relaxed text-slate-600 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong> Nepal Bookkeeping Note:</strong> Sales calculations utilize native base exchange values corresponding to transaction checkouts. Maintain correct currency rates inside Settings.
              </span>
            </div>
          </div>
        </div>
      )}

      {// -------------------------------------------------------------
       // TAB 2: Wholesale Purchase Entries & Inventory Additions (Redesigned)
       // -------------------------------------------------------------
       accountingSubTab === 'purchases' && (
        <div className="space-y-6">
          {/* Header & General Details Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs space-y-4">
            <h3 className="text-sm font-bold font-mono tracking-wider text-rose-600 uppercase flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Redesigned Wholesale Bill & Purchase Entry
            </h3>

            {/* Bill Header Meta Form */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs text-slate-750">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider font-mono">1. Select Wholesale Supplier *</label>
                <select
                  required
                  value={selectedVendorIdPur}
                  onChange={(e) => setSelectedVendorIdPur(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                >
                  <option value="">-- Choose Supplier --</option>
                  {vendorsList.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.address})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider font-mono">2. Bill / Invoice Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BILL-99854"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  value={purchaseRef}
                  onChange={(e) => setPurchaseRef(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider font-mono">3. Bill Purchase Type *</label>
                <select
                  required
                  value={purchaseBillType}
                  onChange={(e) => setPurchaseBillType(e.target.value as 'vat' | 'pan' | 'estimated')}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500/50 cursor-pointer"
                >
                  <option value="vat">VAT Bill (13% VAT)</option>
                  <option value="pan">PAN Bill (No VAT)</option>
                  <option value="estimated">Estimated Bill (No VAT)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider font-mono">4. Purchase Entry Date</label>
                <input
                  type="date"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs text-slate-850 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5 tracking-wider font-mono">5. Source Treasury Account *</label>
                <select
                  required
                  value={selectedPaymentAccountId}
                  onChange={(e) => setSelectedPaymentAccountId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500/50 cursor-pointer"
                >
                  {(state.treasuryAccounts || []).map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Product Line Addition Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-205 shadow-xs space-y-4">
              <h4 className="text-xs font-extrabold font-mono tracking-wider text-slate-600 uppercase">
                Add Product Item to Bill
              </h4>

              <div className="space-y-3 text-xs">
                {/* Product Search Input (Name & SKU search) */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider font-mono">
                    Search Gifting Product (by Name or SKU) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type name or SKU to filter..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        // If user clears the input completely, reset current chosen product
                        if (!e.target.value.trim()) {
                          setChosenProduct(null);
                          setSelectedPurchaseVarOptions({});
                        }
                      }}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500/50 font-medium"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>

                  {/* Absolute Floating Dropdown List of Search Matches */}
                  {productSearch.trim().length > 0 && !chosenProduct && (
                    <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-xl z-50 divide-y divide-slate-100">
                      {state.products.filter(p => {
                        const s = productSearch.toLowerCase();
                        return p.name.toLowerCase().includes(s) || (p.sku && p.sku.toLowerCase().includes(s));
                      }).length === 0 ? (
                        <div className="p-3 text-slate-400 text-xs text-center italic">
                          No matching products found
                        </div>
                      ) : (
                        state.products.filter(p => {
                          const s = productSearch.toLowerCase();
                          return p.name.toLowerCase().includes(s) || (p.sku && p.sku.toLowerCase().includes(s));
                        }).slice(0, 15).map(p => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => {
                              setChosenProduct(p);
                              setProductSearch(`${p.sku ? p.sku + ' - ' : ''}${p.name}`);
                              setLineUnitCost(p.costPrice || 0);
                              
                              const initialVars: { [key: string]: string } = {};
                              if (p.variations && p.variations.length > 0) {
                                p.variations.forEach(v => {
                                  if (v.options && v.options.length > 0) {
                                    initialVars[v.id] = v.options[0].value;
                                  }
                                });
                              }
                              setSelectedPurchaseVarOptions(initialVars);
                            }}
                            className="w-full text-left p-2 px-3 hover:bg-slate-50 transition flex justify-between items-center text-xs"
                          >
                            <div className="flex items-center gap-2.5 truncate pr-2">
                              {p.images && p.images.length > 0 && (
                                <img
                                  src={p.images[0]}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover border border-slate-200 bg-slate-50 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div className="truncate">
                                <span className="font-bold text-rose-700 font-mono text-[11px] block">{p.sku || 'NO-SKU'}</span>
                                <span className="text-slate-800 font-semibold">{p.name}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-slate-400 block font-mono">Stock: {p.stock}</span>
                              <span className="text-[10px] font-bold text-slate-600 block">Rate: Rs. {p.costPrice || p.price}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Product Lock Display */}
                {chosenProduct && (
                  <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="truncate pr-2 flex gap-2.5 items-center">
                        {chosenProduct.images && chosenProduct.images.length > 0 && (
                          <img
                            src={chosenProduct.images[0]}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-slate-50 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="truncate">
                          <span className="font-bold text-rose-600 font-mono text-[10px] block">SELECTED MATCH:</span>
                          <span className="font-semibold text-slate-800 block truncate">{chosenProduct.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">SKU: {chosenProduct.sku || 'N/A'} | Current Stock: {chosenProduct.stock}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setChosenProduct(null);
                          setProductSearch('');
                          setLineUnitCost(0);
                          setSelectedPurchaseVarOptions({});
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-extrabold uppercase shrink-0 px-2 py-1 bg-white border border-rose-200 rounded hover:shadow-xs transition md:self-center"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Show All Images in Selected Product Gallery */}
                    {chosenProduct.images && chosenProduct.images.length > 0 && (
                      <div className="pt-2 border-t border-rose-105">
                        <span className="block text-[8.5px] font-bold text-slate-450 uppercase mb-1 tracking-wider font-mono">Product Gallery (All Images):</span>
                        <div className="flex flex-wrap gap-1.5">
                          {chosenProduct.images.map((imgUrl, i) => (
                            <img
                              key={i}
                              src={imgUrl}
                              alt={`${chosenProduct.name} image ${i + 1}`}
                              className="w-10 h-10 rounded-lg border border-slate-200 object-cover bg-slate-50 hover:scale-105 transition duration-150"
                              referrerPolicy="no-referrer"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Variant Selector for Variable Product */}
                {chosenProduct && chosenProduct.variations && chosenProduct.variations.length > 0 && (
                  <div className="p-3.5 bg-rose-50/40 border border-rose-100 rounded-xl space-y-3">
                    <span className="block text-[9px] font-extrabold text-rose-700 uppercase tracking-widest font-mono">
                      ✨ Select Procurement Variant Option:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {chosenProduct.variations.map((v) => (
                        <div key={v.id} className="space-y-1">
                          <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wide font-mono">
                            {v.name}
                          </label>
                          <select
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                            value={selectedPurchaseVarOptions[v.id] || ''}
                            onChange={(e) => {
                              setSelectedPurchaseVarOptions({
                                ...selectedPurchaseVarOptions,
                                [v.id]: e.target.value
                              });
                            }}
                          >
                            {v.options.map((opt, optIdx) => (
                              <option key={optIdx} value={opt.value}>
                                {opt.value} {opt.priceAdjustment !== 0 ? `(${opt.priceAdjustment > 0 ? '+' : ''} Rs. ${opt.priceAdjustment})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grid of Quantities & buying rates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider font-mono">Quantity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs text-slate-850"
                      value={lineQty}
                      onChange={(e) => setLineQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1 tracking-wider font-mono">Rate (Rs.) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      placeholder="Cost rate"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold text-xs text-slate-850"
                      value={lineUnitCost}
                      onChange={(e) => setLineUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </div>
                </div>

                {/* Real-time Subtotal Display */}
                <div className="p-3 bg-slate-50/60 border border-slate-150 rounded-xl flex justify-between items-center font-mono">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Calculated Subtotal:</span>
                  <span className="text-xs font-bold text-slate-800 underline">Rs. {(lineQty * lineUnitCost).toLocaleString()}</span>
                </div>

                {/* Add to Draft list Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!chosenProduct) {
                      alert('Please search and select a product first using the auto-complete dropdown.');
                      return;
                    }
                    if (lineQty <= 0 || lineUnitCost <= 0) {
                      alert('Quantity and Unit Cost rate must be higher than 0 to lodge in a bill.');
                      return;
                    }

                    // Build array of selected variation options
                    const selectedVars: { name: string; value: string; priceAdjustment: number }[] = [];
                    if (chosenProduct.variations && chosenProduct.variations.length > 0) {
                      chosenProduct.variations.forEach(v => {
                        const chosenVal = selectedPurchaseVarOptions[v.id] || (v.options && v.options[0]?.value) || '';
                        const optDetail = v.options.find(o => o.value === chosenVal);
                        selectedVars.push({
                          name: v.name,
                          value: chosenVal,
                          priceAdjustment: optDetail ? optDetail.priceAdjustment : 0
                        });
                      });
                    }

                    // Check if duplicate product + same variations combination exists in draft list
                    const existsIdx = billItems.findIndex(item => {
                      if (item.productId !== chosenProduct.id) return false;
                      const iv = item.selectedVariations || [];
                      if (iv.length !== selectedVars.length) return false;
                      return iv.every((v, index) => v.name === selectedVars[index].name && v.value === selectedVars[index].value);
                    });

                    if (existsIdx >= 0) {
                      const labelVars = selectedVars.map(v => `${v.name}: ${v.value}`).join(', ');
                      const varSuffix = labelVars ? ` (${labelVars})` : '';
                      let confirmed = false;
                      try {
                        confirmed = confirm(`"${chosenProduct.name}"${varSuffix} is already listed in this draft bill. Would you like to overwrite its quantity and cost rate with ${lineQty} pack at Rs. ${lineUnitCost}?`);
                      } catch (e) {
                        confirmed = true;
                      }
                      if (!confirmed && typeof window !== 'undefined' && window.self !== window.top) {
                        confirmed = true;
                      }
                      if (confirmed) {
                        const updated = [...billItems];
                        updated[existsIdx].quantity = lineQty;
                        updated[existsIdx].unitCost = lineUnitCost;
                        updated[existsIdx].totalCost = lineQty * lineUnitCost;
                        setBillItems(updated);
                        
                        // reset line form inputs
                        setChosenProduct(null);
                        setProductSearch('');
                        setSelectedPurchaseVarOptions({});
                        setLineQty(1);
                        setLineUnitCost(0);
                      }
                      return;
                    }

                    const tempItem: DraftBillItem = {
                      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                      productId: chosenProduct.id,
                      productName: chosenProduct.name,
                      sku: chosenProduct.sku || 'N/A',
                      quantity: lineQty,
                      unitCost: lineUnitCost,
                      totalCost: lineQty * lineUnitCost,
                      selectedVariations: selectedVars.length > 0 ? selectedVars : undefined
                    };

                    setBillItems([...billItems, tempItem]);

                    // Reset line fields
                    setChosenProduct(null);
                    setProductSearch('');
                    setSelectedPurchaseVarOptions({});
                    setLineQty(1);
                    setLineUnitCost(0);
                  }}
                  className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add item to Bill Draft
                </button>
              </div>
            </div>

            {/* Bill Preview & Draft Items Table */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-205 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-extrabold font-mono tracking-wider text-slate-600 uppercase">
                    Wholesale Bill Items Draft ({billItems.length})
                  </h4>
                  {billItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        let confirmed = false;
                        try {
                          confirmed = confirm('Clear entire wholesale bill draft?');
                        } catch (e) {
                          confirmed = true;
                        }
                        if (!confirmed && typeof window !== 'undefined' && window.self !== window.top) {
                          confirmed = true;
                        }
                        if (confirmed) {
                          setBillItems([]);
                        }
                      }}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold uppercase cursor-pointer"
                    >
                      Clear Bill
                    </button>
                  )}
                </div>

                {billItems.length === 0 ? (
                  <div className="p-12 text-center text-slate-450 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-1.5">
                    <Package className="w-7 h-7 text-slate-300" />
                    <span className="font-medium text-slate-500">The wholesale bill is currently empty.</span>
                    <span className="text-[10px] text-slate-400">Search products on the left panel and click 'Add' to formulate multiple items on a single reference invoice number invoice.</span>
                  </div>
                ) : (
                  <div className="border border-slate-150 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full border-collapse text-xs text-slate-700 text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 uppercase tracking-wider text-[9.5px] font-bold text-slate-500 font-mono">
                          <th className="p-2.5">Product & SKU</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5">Cost Rate</th>
                          <th className="p-2.5">Subtotal</th>
                          <th className="p-2.5 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {billItems.map((item) => {
                          const prod = state.products.find(p => p.id === item.productId);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50 font-medium">
                              <td className="p-2.5 text-slate-850">
                                <div className="flex items-center gap-2">
                                  {prod?.images && prod.images.length > 0 && (
                                    <img 
                                      src={prod.images[0]} 
                                      alt="" 
                                      className="w-8 h-8 rounded object-cover border border-slate-200 bg-slate-50 shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <div className="truncate">
                                    <span className="block font-semibold truncate max-w-[190px]">{item.productName}</span>
                                    {item.selectedVariations && item.selectedVariations.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-0.5 justify-start text-left max-w-full">
                                        {item.selectedVariations.map((vOpt, vOptIdx) => (
                                          <span 
                                            key={vOptIdx} 
                                            className="inline-block text-[8px] font-mono px-1 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-205 leading-none"
                                          >
                                            {vOpt.name}: <span className="font-extrabold">{vOpt.value}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <span className="block font-mono text-[9.5px] text-slate-400 mt-0.5">SKU: {item.sku}</span>
                                  </div>
                                </div>
                              </td>
                            <td className="p-2.5 text-center font-mono font-bold text-slate-800">{item.quantity}</td>
                            <td className="p-2.5 font-mono text-slate-650">Rs. {item.unitCost.toLocaleString()}</td>
                            <td className="p-2.5 font-mono font-bold text-slate-900">Rs. {item.totalCost.toLocaleString()}</td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => setBillItems(billItems.filter(bi => bi.id !== item.id))}
                                className="p-1 text-slate-450 hover:text-rose-600 transition cursor-pointer"
                                title="Delete row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Grand Total Display and Save trigger */}
              {billItems.length > 0 && (() => {
                const subtotalSum = billItems.reduce((acc, it) => acc + it.totalCost, 0);
                const vatAmount = purchaseBillType === 'vat' ? Math.round(subtotalSum * 0.13) : 0;
                const grandTotalSum = subtotalSum + vatAmount;
                return (
                  <div className="mt-5 pt-4 border-t border-slate-150 space-y-3 bg-slate-50/50 p-3 rounded-xl">
                    <div className="space-y-1.5 text-xs text-slate-700">
                      {purchaseBillType === 'vat' && (
                        <>
                          <div className="flex justify-between items-center text-slate-500">
                            <span>Taxable Subtotal (Excl. VAT):</span>
                            <span className="font-mono font-bold">Rs. {subtotalSum.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-rose-600 font-semibold">
                            <span className="flex items-center gap-1">⚡ Calculated 13% Nepal VAT:</span>
                            <span className="font-mono">+Rs. {vatAmount.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-dashed border-slate-200 my-1 pt-0.5"></div>
                        </>
                      )}
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block tracking-widest font-mono uppercase">
                            {purchaseBillType === 'vat' ? 'Grand Total (VAT Incl.):' : 'Total Bill Valuation:'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {billItems.length} products | {billItems.reduce((acc, it) => acc + it.quantity, 0)} units | Mode: <span className="uppercase font-extrabold text-slate-700">{purchaseBillType}</span>
                          </span>
                        </div>
                        <span className="text-lg font-mono font-black text-rose-700">
                          Rs. {grandTotalSum.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {billItems.length > 0 && (
                <div className="mt-4">
                  {/* Submit buttons */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedVendorIdPur) {
                        alert('Safety Check Failed:\nPlease select a Supplier / Vendor before processing this wholesale bill.');
                        return;
                      }
                      if (!purchaseRef.trim()) {
                        alert('Safety Check Failed:\nPlease specify a valid reference Bill / Invoice Number to proceed.');
                        return;
                      }
                      
                      // Check duplicate bill reference number by same supplier vendor
                      const isDuplicateBill = (state.purchaseEntries || []).some(entry => {
                        const sameVendor = entry.vendorId === selectedVendorIdPur;
                        const sameBill = entry.referenceNo?.trim().toLowerCase() === purchaseRef.trim().toLowerCase();
                        return sameVendor && sameBill;
                      });

                      if (isDuplicateBill) {
                        alert(`Duplicate Bill Entry Blocked:\nA registered wholesale purchase entry already exists with Bill Number "${purchaseRef.trim()}" for the chosen Supplier.\n\nSame Bill Number from the same Vendor is only allowed once to prevent duplicate payouts.`);
                        return;
                      }

                      // Trigger confirmation pop-up modal
                      setShowConfirmBillModal(true);
                    }}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold tracking-wider uppercase rounded-xl shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5 select-none"
                  >
                    <Check className="w-4 h-4" />
                    Save & Lodge Wholesale Bill
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Duplicate protection warning card if user fills matching invoice */}
          {selectedVendorIdPur && purchaseRef.trim() && (state.purchaseEntries || []).some(entry => entry.vendorId === selectedVendorIdPur && entry.referenceNo?.trim().toLowerCase() === purchaseRef.trim().toLowerCase()) && (
            <div className="p-4 bg-rose-50 border border-rose-150 rounded-xl text-xs text-rose-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold">Duplicate Entry Detected:</strong> A wholesale purchase bill with Number "{purchaseRef.trim()}" already exists in archives for this supplier vendor. This Invoice entry will be blocked upon validation to prevent double entry.
              </div>
            </div>
          )}

          {/* Interactive Pop-up Confirmation Modal */}
          {showConfirmBillModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 text-slate-850">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative border border-slate-100 flex flex-col gap-4 text-xs animate-in fade-in duration-200">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-850">Confirm Wholesale Purchase Entry</h3>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    You are registering a new wholesale ledger invoice sheet. Re-verify the bill details below before finalized log validation.
                  </p>
                </div>

                {/* Bill Breakdown detail sheet */}
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px] font-mono">SUPPLIER VENDOR:</span>
                    <span className="font-bold text-slate-800 text-[11px]">
                      {vendorsList.find(v => v.id === selectedVendorIdPur)?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px] font-mono">INVOICE BILL NO:</span>
                    <span className="font-bold font-mono text-slate-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                      {purchaseRef.trim()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px] font-mono">RECORD DATE:</span>
                    <span className="font-bold text-slate-700">{purchaseDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-450 font-bold uppercase tracking-wider text-[9px] font-mono">BILL LINE ITEMS:</span>
                    <span className="font-bold text-slate-850">{billItems.length} Products</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    {purchaseBillType === 'vat' && (
                      <>
                        <div className="flex justify-between items-center text-slate-500 text-[10px]">
                          <span>TAXABLE SUB-TOTAL:</span>
                          <span className="font-mono">Rs. {billItems.reduce((acc, it) => acc + it.totalCost, 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-rose-600 text-[10px] font-semibold">
                          <span>CALCULATED 13% VAT:</span>
                          <span className="font-mono">+Rs. {Math.round(billItems.reduce((acc, it) => acc + it.totalCost, 0) * 0.13).toLocaleString()}</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200 my-1"></div>
                      </>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-850 font-extrabold text-[10.5px]">BILL GRAND TOTAL:</span>
                      <span className="font-mono font-black text-rose-700 text-sm">
                        Rs. {(billItems.reduce((acc, it) => acc + it.totalCost, 0) + (purchaseBillType === 'vat' ? Math.round(billItems.reduce((acc, it) => acc + it.totalCost, 0) * 0.13) : 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Help text */}
                <span className="text-[10px] text-slate-400 text-center block bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 leading-normal">
                  💡 This action will automatically raise inventory levels for all matched products and set their latest raw cost price inside the store.
                </span>

                {/* Dialog Interactive Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmBillModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer text-center"
                  >
                    No, Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Final validation (just in case)
                      const isStillDuplicate = (state.purchaseEntries || []).some(entry => {
                        const sameVendor = entry.vendorId === selectedVendorIdPur;
                        const sameBill = entry.referenceNo?.trim().toLowerCase() === purchaseRef.trim().toLowerCase();
                        return sameVendor && sameBill;
                      });

                      if (isStillDuplicate) {
                        alert(`Duplicate Entry Blocked: Same Bill Number "${purchaseRef.trim()}" by same Vendor already logged.`);
                        setShowConfirmBillModal(false);
                        return;
                      }

                      // Prepare new purchase ledger entries with VAT if selected
                      const newPurchases: PurchaseEntry[] = billItems.map((item, index) => {
                        const itemVat = purchaseBillType === 'vat' ? Math.round(item.totalCost * 0.13) : 0;
                        return {
                          id: `pur-${Date.now()}-${index}`,
                          vendorId: selectedVendorIdPur,
                          productId: item.productId,
                          quantity: item.quantity,
                          unitCost: item.unitCost,
                          totalCost: item.totalCost + itemVat, // Include calculated Nepal tax to get exact cumulative buying record
                          purchaseDate: purchaseDate,
                          referenceNo: purchaseRef.trim(),
                          billType: purchaseBillType,
                          vatCharged: itemVat,
                          selectedVariations: item.selectedVariations,
                          paymentAccountId: selectedPaymentAccountId // direct treasury debit association
                        };
                      });

                      // Update products stock and costPrice
                      const updatedProducts = state.products.map(p => {
                        const billItem = billItems.find(item => item.productId === p.id);
                        if (billItem) {
                          return {
                            ...p,
                            stock: p.stock + billItem.quantity,
                            costPrice: billItem.unitCost // Automatically updates default cost price to latest wholesale cost
                          };
                        }
                        return p;
                      });

                      // Create warehouse logs
                      const newLogs = billItems.map((item, index) => ({
                        id: `log-${Date.now()}-${index}`,
                        productId: item.productId,
                        type: 'in' as const,
                        quantity: item.quantity,
                        reason: `Wholesale Bill Purchase Lodge: Ref #${purchaseRef.trim()}`,
                        timestamp: new Date().toISOString()
                      }));

                      // Perform state update
                      onUpdateState({
                        ...state,
                        products: updatedProducts,
                        purchaseEntries: [...(state.purchaseEntries || []), ...newPurchases],
                        inventoryLogs: [...(state.inventoryLogs || []), ...newLogs]
                      });

                      // Clear inputs and draft items
                      setBillItems([]);
                      setPurchaseRef('');
                      setProductSearch('');
                      setChosenProduct(null);
                      setShowConfirmBillModal(false);

                      alert(`Success: Wholesale bill reference "${purchaseRef.trim()}" saved successfully!\n${newPurchases.length} items logged and stocks updated.`);
                    }}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer text-center"
                  >
                    Yes, Save & Adjust Stock
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-wrap gap-2">
              <span className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">Supplier purchase entry logging archives</span>
              <button
                onClick={exportPurchaseReportCSV}
                className="p-1 px-2.5 text-[10px] uppercase font-bold font-mono text-slate-600 hover:text-slate-900 border border-slate-205 hover:border-slate-350 bg-white rounded flex items-center gap-1 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Download Purchase CSV Ledger
              </button>
            </div>

            {filteredPurchases.length === 0 ? (
              <div className="p-12 text-center text-slate-450 text-xs">
                No purchase ledger records match this time sequence date filter. Try widening the calendar date range.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-[9.5px] font-bold text-slate-500 font-mono">
                    <th className="p-3">Purchase Date</th>
                    <th className="p-3">Reference No</th>
                    <th className="p-3">Vendor Supplier</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Units Lodged</th>
                    <th className="p-3">Unit Cost Rate</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3 text-right">Delete Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map(p => {
                    const vnd = vendorsList.find(v => v.id === p.vendorId);
                    const prod = state.products.find(pr => pr.id === p.productId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-semibold">{p.purchaseDate}</td>
                        <td className="p-3 font-bold text-slate-900">{p.referenceNo || 'N/A'}</td>
                        <td className="p-3 font-semibold text-slate-800">{vnd?.name || 'Deleted Supplier'}</td>
                        <td className="p-3 text-slate-850 font-medium">
                          {prod ? (
                            <div className="flex items-center gap-2">
                              {prod.images && prod.images.length > 0 && (
                                <img 
                                  src={prod.images[0]} 
                                  alt="" 
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200 bg-slate-50 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div>
                                <span className="font-bold text-slate-850 block">{prod.name}</span>
                                {p.selectedVariations && p.selectedVariations.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-0.5 justify-start text-left max-w-full">
                                    {p.selectedVariations.map((vOpt, vOptIdx) => (
                                      <span 
                                        key={vOptIdx} 
                                        className="inline-block text-[8px] font-mono px-1 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-205 leading-none"
                                      >
                                        {vOpt.name}: <span className="font-extrabold">{vOpt.value}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <span className="text-[10px] font-mono text-slate-450 block mt-0.5">{prod.sku}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-sans italic">Deleted Product</span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono uppercase font-bold ${
                            p.billType === 'vat' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            p.billType === 'pan' ? 'bg-amber-50 text-amber-600 border border-amber-105' :
                            'bg-slate-100 text-slate-500 border border-slate-150'
                          }`}>
                            {p.billType || 'EST'}
                          </span>
                        </td>
                        <td className="p-3 font-bold font-mono">{p.quantity} units</td>
                        <td className="p-3 font-mono">Rs. {p.unitCost.toLocaleString()}</td>
                        <td className="p-3 font-mono">
                          <span className="font-bold text-slate-900 block">Rs. {p.totalCost.toLocaleString()}</span>
                          {p.vatCharged && p.vatCharged > 0 ? (
                            <span className="text-[9px] text-rose-550 block font-semibold leading-none mt-0.5">Incl. 13% VAT (Rs. {p.vatCharged.toLocaleString()})</span>
                          ) : null}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeletePurchaseEntry(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {// -------------------------------------------------------------
       // TAB 3: Operational Expense Entries
       // -------------------------------------------------------------
       accountingSubTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1.5 bg-white p-5 rounded-2xl border border-slate-205 shadow-xs space-y-4 h-fit">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-slate-600" />
              Lodge New Overhead Expense
            </h3>

            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs text-slate-800">
              <div>
                <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office broadband Internet bills"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Billing Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Cost Category *</label>
                <select
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                >
                  <option value="Marketing">Marketing & CAC Boosts</option>
                  <option value="Salary">Staff Wages & Incentives</option>
                  <option value="Rent">Warehouse & Office Showroom Rent</option>
                  <option value="Delivery Equipment">Delivery Equipment (Bikes/Net)</option>
                  <option value="Utilities">Utilities & High Speed Fiber</option>
                  <option value="Packaging Materials">Bespoke Ribbons & Box Buys</option>
                  <option value="Other Overhead">Other Administrative Costs</option>
                </select>
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Source Payment Account *</label>
                <select
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
                  value={selectedPaymentAccountId}
                  onChange={(e) => setSelectedPaymentAccountId(e.target.value)}
                >
                  {(state.treasuryAccounts || []).map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Billing Date *</label>
                <input
                  type="date"
                  required
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  placeholder="Receipt number or specific payment account context..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
              >
                Log Operational Expense
              </button>
            </form>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">Operational expenses database logs</span>
              <span className="text-[10px] font-mono font-bold text-slate-550 border border-slate-205 rounded px-2 py-0.5 bg-white">
                Overhead Total: Rs. {totalExpensesAmt.toLocaleString()}
              </span>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-450 text-xs text-slate-400">
                No expense entries match your date filter range. Clear or adjust date limits inside the ledger cockpit.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-[9.5px] font-bold text-slate-500 font-mono">
                    <th className="p-3">Expense Date</th>
                    <th className="p-3">Cost Category</th>
                    <th className="p-3">Title Description</th>
                    <th className="p-3">Debit Amount</th>
                    <th className="p-3">Operational Notes</th>
                    <th className="p-3 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-semibold">{e.expenseDate}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 select-none border border-slate-200 rounded bg-slate-50 font-semibold text-[10.5px]">
                          {e.category}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{e.title}</td>
                      <td className="p-3 font-mono font-bold text-rose-600">Rs. {e.amount.toLocaleString()}</td>
                      <td className="p-3 text-slate-500 max-w-[200px] truncate" title={e.notes || ''}>{e.notes || '-'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteExpense(e.id)}
                          className="p-1 text-slate-450 hover:text-rose-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {// -------------------------------------------------------------
       // TAB 4: Supplier Directory Management
       // -------------------------------------------------------------
       accountingSubTab === 'vendors' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 px-4 py-5 bg-white rounded-2xl border border-slate-205 shadow-xs space-y-4 h-fit">
            <h3 className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {editingVendorId ? 'Edit Supplier Details' : 'Register Gifting Supplier'}
            </h3>

            <form onSubmit={handleAddVendor} className="space-y-3.5 text-xs text-slate-800">
              <div>
                <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kathmandu Bakery Ltd"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Telephone Contact *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +977 9841..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono"
                  value={newVendorPhone}
                  onChange={(e) => setNewVendorPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Email Coordinates</label>
                <input
                  type="email"
                  placeholder="e.g. support@factory.com"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  value={newVendorEmail}
                  onChange={(e) => setNewVendorEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Factory Address</label>
                <input
                  type="text"
                  placeholder="e.g. Mid Baneshwor, Kathmandu"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  value={newVendorAddress}
                  onChange={(e) => setNewVendorAddress(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {editingVendorId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingVendorId(null);
                      setNewVendorName('');
                      setNewVendorPhone('');
                      setNewVendorEmail('');
                      setNewVendorAddress('');
                    }}
                    className="w-full p-2 bg-slate-100 hover:bg-slate-200 text-slate-705 font-medium rounded-lg text-xs transition cursor-pointer text-center"
                  >
                    Cancel Update
                  </button>
                )}
                <button
                  type="submit"
                  className={`w-full p-2 text-white font-bold rounded-lg text-xs transition cursor-pointer ${editingVendorId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                >
                  {editingVendorId ? 'Save Changes' : 'Register Supplier Profile'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <span className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase">Available Wholesale Partners Directory</span>
            </div>

            {vendorsList.length === 0 ? (
              <div className="p-12 text-center text-slate-450 text-xs">
                No vendors are currently registered. Register wholesale supplier accounts above to tie products to buying records.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-[9.5px] font-bold text-slate-500 font-mono">
                    <th className="p-3">Vendor / Company</th>
                    <th className="p-3">Primary Phone</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Corporate Location</th>
                    <th className="p-3">Registered At</th>
                    <th className="p-3 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorsList.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-900">{v.name}</td>
                      <td className="p-3 font-mono text-slate-800">{v.phone}</td>
                      <td className="p-3 text-indigo-600 font-medium font-mono">{v.email}</td>
                      <td className="p-3 text-slate-650 font-medium">{v.address}</td>
                      <td className="p-3 text-slate-450 font-mono">{new Date(v.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => {
                              setEditingVendorId(v.id);
                              setNewVendorName(v.name);
                              setNewVendorPhone(v.phone === 'N/A' ? '' : v.phone);
                              setNewVendorEmail(v.email === 'N/A' ? '' : v.email);
                              setNewVendorAddress(v.address === 'N/A' ? '' : v.address);
                            }}
                            className="p-1 px-1.5 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 text-slate-500 hover:text-indigo-600 rounded transition cursor-pointer flex items-center gap-1 text-[10px]"
                            title="Edit details"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteVendor(v.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                            title="Delete profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {// -------------------------------------------------------------
       // TAB 5: Stock Valuation Report
       // -------------------------------------------------------------
       accountingSubTab === 'stockValuation' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <span className="text-xs font-bold font-mono tracking-wider text-slate-500 uppercase block">Live stock asset valuation report card</span>
              <span className="text-xs text-slate-505 font-semibold mt-0.5 block">
                Total Catalog Assets: <span className="font-bold text-slate-900 font-mono">Rs. {state.products.reduce((acc, p) => acc + (p.stock * (p.costPrice || 0)), 0).toLocaleString()}</span>
              </span>
            </div>

            {/* PRODUCT SEARCH INPUT */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                placeholder="Search SKU or item name..."
                value={stockValuationSearch}
                onChange={(e) => setStockValuationSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="absolute left-2.5 top-2 text-slate-400">🔍</span>
              {stockValuationSearch && (
                <button
                  type="button"
                  onClick={() => setStockValuationSearch('')}
                  className="absolute right-2 top-1.5 text-[10px] hover:bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-[9.5px] font-bold text-slate-500 font-mono">
                <th className="p-3">SKU Code</th>
                <th className="p-3">Product Title</th>
                <th className="p-3">Warehouse Stock</th>
                <th className="p-3">Registered Cost Rate</th>
                <th className="p-3">Client Selling Price</th>
                <th className="p-3">Inventory Capital Value</th>
                <th className="p-3">Gross Margin (%)</th>
                <th className="p-3">Stock Advisory Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {state.products
                .filter(p => {
                  if (p.status === 'deleted') return false;
                  const query = stockValuationSearch.trim().toLowerCase();
                  if (!query) return true;
                  return p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query);
                })
                .map(p => {
                  const totalCapVal = (p.costPrice || 0) * p.stock;
                  const marginPercentage = p.price > 0 ? ((p.price - (p.costPrice || 0)) / p.price * 100).toFixed(1) : '100';
                  const isUnderStocked = p.stock <= p.lowStockThreshold;

                  return (
                  <tr key={p.id} className={`hover:bg-slate-50/50 ${isUnderStocked ? 'bg-amber-500/5' : ''}`}>
                    <td className="p-3 font-mono font-bold text-slate-800">{p.sku}</td>
                    <td className="p-3 font-semibold text-slate-900">{p.name}</td>
                    <td className="p-3 font-bold font-mono text-slate-800">
                      {p.stock} units
                    </td>
                    <td className="p-3 font-mono text-slate-550">Rs. {(p.costPrice || 0).toLocaleString()}</td>
                    <td className="p-3 font-mono text-emerald-600 font-semibold">Rs. {p.price.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">Rs. {totalCapVal.toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-indigo-600">{marginPercentage}%</td>
                    <td className="p-3">
                      {isUnderStocked ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-600 font-sans uppercase">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          Low stock warns
                        </span>
                      ) : (
                        <span className="inline-flex text-[10.5px] font-bold text-emerald-600 uppercase font-sans">
                          Adequate
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {// -------------------------------------------------------------
       // TAB 6: Treasury, Gateways Routing & Comprehensive Ledger Reports
       // -------------------------------------------------------------
       accountingSubTab === 'treasury' && (
        <div className="space-y-6">
          {/* Top Panel: Live Cashflow Treasury Accounts Registers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Account Creation Register Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-xs space-y-4 h-fit">
              <h3 className="text-xs font-black font-mono tracking-wider text-rose-600 uppercase flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Register Treasury Account
              </h3>
              
              <form onSubmit={handleAddTreasuryAccount} className="space-y-3.5 text-xs text-slate-800">
                <div>
                  <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Account Display Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nabil Bank Corporate A/C"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Account Type *</label>
                    <select
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                      value={newAccType}
                      onChange={(e) => setNewAccType(e.target.value as any)}
                    >
                      <option value="bank">Bank Account</option>
                      <option value="esewa">eSewa Wallet</option>
                      <option value="khalti">Khalti Wallet</option>
                      <option value="cash">Cash on Hand</option>
                      <option value="other">Other Ledger</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Starting Balance (Rs.) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                      value={newAccBalance}
                      onChange={(e) => setNewAccBalance(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {newAccType === 'bank' && (
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Commercial Bank Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nabil Bank Nepal Ltd"
                      className="w-full p-2 border border-slate-205 rounded-lg text-xs font-medium"
                      value={newAccBankName}
                      onChange={(e) => setNewAccBankName(e.target.value)}
                    />
                  </div>
                )}

                {(newAccType === 'bank' || newAccType === 'esewa' || newAccType === 'khalti') && (
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-450 uppercase mb-1">Account / Merchant Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 984155... or 014022..."
                      className="w-full p-2 border border-slate-205 rounded-lg text-xs font-mono"
                      value={newAccNumber}
                      onChange={(e) => setNewAccNumber(e.target.value)}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full p-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                >
                  Register Account
                </button>
              </form>

              <div className="pt-2">
                <div className="border-t border-slate-100 my-2"></div>
                <h3 className="text-xs font-black font-mono tracking-wider text-slate-500 uppercase flex items-center gap-1.5 mb-2.5">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                  Manual Transaction Adjust
                </h3>
                <form onSubmit={handleAddManualTransaction} className="space-y-3 text-xs text-slate-800">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <select
                        required
                        className="w-full p-2 bg-slate-50 border border-slate-205 rounded-lg text-xs font-semibold focus:outline-none"
                        value={newTxType}
                        onChange={(e) => setNewTxType(e.target.value as any)}
                      >
                        <option value="credit">Income/Credit (+)</option>
                        <option value="debit">Deplete/Debit (-)</option>
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        required
                        min={1}
                        placeholder="Amount (Rs.)"
                        className="w-full p-2 border border-slate-205 rounded-lg text-xs font-mono font-bold"
                        value={newTxAmount || ''}
                        onChange={(e) => setNewTxAmount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <select
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold focus:outline-none"
                      value={newTxAccountId}
                      onChange={(e) => setNewTxAccountId(e.target.value)}
                    >
                      <option value="">-- Target Account --</option>
                      {(state.treasuryAccounts || []).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      required
                      placeholder="Transaction note / Transfer context..."
                      className="w-full p-2 border border-slate-205 rounded-lg text-xs"
                      value={newTxDesc}
                      onChange={(e) => setNewTxDesc(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full p-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition cursor-pointer text-center"
                  >
                    Adjust Ledger Balance
                  </button>
                </form>
              </div>
            </div>

            {/* Dynamic Accounts List Ledger & Balance */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <span className="text-xs font-extrabold font-mono text-slate-600 uppercase">Live Registers & dynamic Cashflow Ledger</span>
                  <span className="text-[10px] text-slate-400 font-mono">Dynamic cash balances computed from real shop data</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {(state.treasuryAccounts || []).map(acc => {
                    const stats = getAccountStats(acc.id);
                    return (
                      <div key={acc.id} className="p-4 hover:bg-slate-50/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{acc.name}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                              {acc.type}
                            </span>
                          </div>
                          {acc.bankName && (
                            <div className="text-[10px] text-slate-500">
                              Bank: <span className="font-semibold text-slate-700">{acc.bankName}</span>
                              {acc.accountNumber && ` | A/C No: ${acc.accountNumber}`}
                            </div>
                          )}
                          {!acc.bankName && acc.accountNumber && (
                            <div className="text-[10px] text-slate-500">
                              Gateway Identifier / Mobile: <span className="font-mono font-semibold text-slate-700">{acc.accountNumber}</span>
                            </div>
                          )}
                          <div className="text-[9.5px] font-mono text-slate-400 flex items-center gap-2.5 pt-0.5">
                            <span>Opening: Rs. {acc.initialBalance.toLocaleString()}</span>
                            <span>•</span>
                            <span className="text-emerald-600">Credits (+): Rs. {stats.credit.toLocaleString()}</span>
                            <span>•</span>
                            <span className="text-rose-500 font-semibold text-[10px]">Debits (-): Rs. {stats.debit.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5 self-end md:self-auto">
                          <div className="text-right">
                            <span className="block text-[8px] uppercase font-mono font-bold text-slate-400 tracking-wider">Dynamic Balance</span>
                            <span className="text-sm font-black font-mono text-slate-850">
                              Rs. {stats.current.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleExportAccountLedgerCSV(acc.id)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 hover:text-slate-900 rounded-lg transition cursor-pointer"
                              title="Export Account Ledger as CSV"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                            {(state.treasuryAccounts || []).length > 2 && (
                              <button
                                onClick={() => {
                                  if (confirm(`Remove custom treasury account "${acc.name}"? Transactions associated with it will fallback.`)) {
                                    onUpdateState({
                                      ...state,
                                      treasuryAccounts: (state.treasuryAccounts || []).filter(a => a.id !== acc.id)
                                    });
                                  }
                                }}
                                className="p-1.5 bg-slate-50 hover:bg-rose-50 border border-slate-205 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                title="Remove registry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Payment Gateways Router Map */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-xs font-black font-mono tracking-wider text-slate-600 uppercase flex items-center gap-1.5">
                      <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                      Checkout Gateways & routing parameters
                    </h3>
                    <p className="text-[10px] text-slate-405 mt-0.5 leading-normal">
                      Dynamic routing mapped parameters: all incoming client orders settled via mapped gateways will directly reflect as dynamic incoming credits in the connected treasury ledger.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {(state.paymentGateways || []).map(gw => {
                    const mappedAc = (state.treasuryAccounts || []).find(a => a.id === gw.mappedAccountId);
                    return (
                      <div key={gw.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex flex-col justify-between gap-2.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900 block">{gw.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] uppercase font-bold tracking-wider ${gw.isEnabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                            {gw.isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-505 uppercase tracking-wider font-mono">Routing Target Treasury Account *</label>
                          <select
                            value={gw.mappedAccountId || ''}
                            onChange={(e) => handleUpdateGatewayMapping(gw.id, e.target.value)}
                            className="w-full p-2 bg-white border border-slate-220 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                          >
                            <option value="">-- Muted / No routing --</option>
                            {(state.treasuryAccounts || []).map(ac => (
                              <option key={ac.id} value={ac.id}>{ac.name} ({ac.type.toUpperCase()})</option>
                            ))}
                          </select>
                        </div>

                        <div className="text-[9.5px] font-medium text-slate-450 leading-relaxed font-sans">
                          {mappedAc ? (
                            <span>Incoming receipts resolve dynamically to: <strong className="font-semibold text-indigo-600 font-mono">{mappedAc.name}</strong></span>
                          ) : (
                            <span className="text-amber-600">⚠️ No routing: Payments cannot be tracked visually.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Supplier Detailed Transaction Reports & Ledgers */}
          <div className="grid grid-cols-1 gap-6">
            
            {/* 1. CUSTOMERS TRANSACTION LEDGER & DIRECT MATCH SEARCH */}
            <div className="bg-white rounded-2xl border border-slate-205 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h3 className="text-xs font-black font-mono tracking-wider text-rose-600 uppercase flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Customer Sales Transactions & Gateway Ledger
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                    Search customer records by sender name, mobile info, or email coordinates to view total order count, gateway selections, and net payment receipts.
                  </p>
                </div>

                <div className="relative w-full md:w-80">
                  <span className="absolute left-2.5 top-2.5 text-slate-400">🔍</span>
                  <input
                    type="text"
                    placeholder="Search Sender Name, Phone, or Email address..."
                    className="w-full pl-8 pr-8 py-2 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 font-semibold"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  />
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearchQuery('')}
                      className="absolute right-2 top-2 text-[10px] bg-slate-100 hover:bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center text-slate-500 font-black"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {Object.keys(customerMap).length === 0 ? (
                <div className="p-12 text-center text-slate-450 text-xs">
                  No billing orders are currently registered. Invoices will automatically group client accounts.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-[9px] font-bold text-slate-505 font-mono">
                        <th className="p-3">Customer Identifiers</th>
                        <th className="p-3">Gifting Contacts</th>
                        <th className="p-3">Total Orders</th>
                        <th className="p-3">Payments Cleared</th>
                        <th className="p-3">Failed/Cancelled</th>
                        <th className="p-3">Gateways Engaged</th>
                        <th className="p-3">Transaction Timeline History</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.values(customerMap)
                        .filter(cust => {
                          const query = customerSearchQuery.trim().toLowerCase();
                          if (!query) return true;
                          return (
                            cust.name.toLowerCase().includes(query) ||
                            cust.email.toLowerCase().includes(query) ||
                            cust.phone.toLowerCase().includes(query)
                          );
                        })
                        .map((cust, idx) => {
                          const totalOrdersCount = cust.orders.length;
                          const paidOrdersSum = cust.orders
                            .filter(o => o.paymentStatus === 'paid' && o.status !== OrderStatus.CANCELLED)
                            .reduce((sum, o) => sum + (o.totalAmountBase || o.totalAmount), 0);
                          const cancelledSum = cust.orders
                            .filter(o => o.status === OrderStatus.CANCELLED)
                            .reduce((sum, o) => sum + (o.totalAmountBase || o.totalAmount), 0);
                          
                          // Distinct payment gateways
                          const gateways = Array.from(new Set(cust.orders.map(o => o.paymentMethod.toUpperCase())));

                          return (
                            <tr key={idx} className="hover:bg-slate-50/40 transition">
                              <td className="p-3">
                                <span className="font-bold text-slate-900 block">{cust.name}</span>
                                <span className="text-[9.5px] font-mono text-slate-450 block">{cust.email}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-mono font-semibold text-slate-750 block">{cust.phone}</span>
                              </td>
                              <td className="p-3 pl-6">
                                <span className="font-bold font-mono text-indigo-600 bg-indigo-50/50 p-1 px-2 rounded-lg text-xs">
                                  {totalOrdersCount}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-mono font-bold text-emerald-600 block">Rs. {paidOrdersSum.toLocaleString()}</span>
                              </td>
                              <td className="p-3 text-rose-500 font-mono font-medium">
                                Rs. {cancelledSum.toLocaleString()}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {gateways.map(g => (
                                    <span key={g} className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-black text-[8px] text-slate-650 tracking-wide">
                                      {g}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                  {cust.orders.map((o, oIdx) => (
                                    <div key={o.id || o.refId || oIdx} className="text-[10px] leading-relaxed flex items-center justify-between gap-1.5 font-mono text-slate-505 hover:bg-slate-50 p-0.5 rounded">
                                      <span>{(o.createdAt || '').slice(0, 10)}</span>
                                      <span className="font-semibold text-slate-700">Ref: {o.refId}</span>
                                      <span className={o.status === OrderStatus.CANCELLED ? 'text-red-500 font-semibold' : 'text-slate-800'}>
                                        Rs. {(o.totalAmountBase || o.totalAmount).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2. SUPPLIERS DETAILED PURCHASE RECONCILIATION */}
            <div className="bg-white rounded-2xl border border-slate-205 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black font-mono tracking-wider text-rose-600 uppercase flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4" />
                    Supplier Procurement Ledgers & Purchase History
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                    Audit supply bills, quantities, unit prices, VAT components, and outstanding supplier accounts.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <select
                    className="p-1 px-2 text-xs bg-white border border-slate-220 rounded-lg focus:outline-none font-semibold text-slate-700"
                    value={vendorReportSearchId}
                    onChange={(e) => setVendorReportSearchId(e.target.value)}
                  >
                    <option value="">-- All Sub-contractors --</option>
                    {vendorsList.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {vendorsList.length === 0 ? (
                <div className="p-12 text-center text-slate-450 text-xs">
                  No wholesale suppliers found. Click the "Vendor Registry" tab to seed partners.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-[9px] font-bold text-slate-505 font-mono">
                        <th className="p-3">Wholesale Partner Name</th>
                        <th className="p-3">Corporate Details</th>
                        <th className="p-3">Logged Invoices</th>
                        <th className="p-3">Physical Stock Sourced</th>
                        <th className="p-3">Total Purchase Cost</th>
                        <th className="p-3">Supplier Invoices History</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vendorsList
                        .filter(v => !vendorReportSearchId || v.id === vendorReportSearchId)
                        .map(v => {
                          const matchedPurchases = (state.purchaseEntries || []).filter(p => p.vendorId === v.id);
                          const totalCostSum = matchedPurchases.reduce((sum, p) => sum + p.totalCost, 0);
                          const totalQtySum = matchedPurchases.reduce((sum, p) => sum + p.quantity, 0);
                          const uniqueInvoices = Array.from(new Set(matchedPurchases.map(p => p.referenceNo || 'estimated')));

                          return (
                            <tr key={v.id} className="hover:bg-slate-50/40 transition">
                              <td className="p-3">
                                <span className="font-bold text-slate-900 block">{v.name}</span>
                                <span className="text-[9.5px] font-mono text-slate-400 block">ID: {v.id}</span>
                              </td>
                              <td className="p-3">
                                <div className="text-[10px] text-slate-505 leading-relaxed font-sans">
                                  <div>📍 Address: <strong className="font-semibold text-slate-700">{v.address}</strong></div>
                                  <div>📞 Telephone: <strong className="font-semibold text-slate-700">{v.phone}</strong></div>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="font-black font-mono text-[10.5px] bg-slate-100 p-1 px-2 rounded">
                                  {uniqueInvoices.length} Bills
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-bold font-mono text-slate-800">{totalQtySum} units Sourced</span>
                              </td>
                              <td className="p-3">
                                <span className="font-mono font-extrabold text-indigo-600 text-xs">
                                  Rs. {totalCostSum.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                  {matchedPurchases.map(p => {
                                    const prod = state.products.find(pr => pr.id === p.productId);
                                    return (
                                      <div key={p.id} className="text-[10px] leading-relaxed flex items-center justify-between gap-1.5 font-mono text-slate-505 hover:bg-slate-50 p-0.5 rounded border border-transparent hover:border-slate-100">
                                        <span>{p.purchaseDate}</span>
                                        <span className="font-semibold text-slate-800">Ref: {p.referenceNo || 'N/A'}</span>
                                        {prod?.images && prod.images.length > 0 && (
                                          <img 
                                            src={prod.images[0]} 
                                            alt="" 
                                            className="w-4 h-4 rounded object-cover border border-slate-150 shrink-0"
                                            referrerPolicy="no-referrer"
                                          />
                                        )}
                                        <span className="text-slate-500 font-sans truncate max-w-[124px]">{prod?.name || 'Item'}</span>
                                        <span className="font-bold text-slate-900">Rs. {p.totalCost.toLocaleString()}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
       )}
    </div>
  );
}
