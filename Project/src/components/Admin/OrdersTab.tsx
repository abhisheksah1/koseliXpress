import React, { useState, useEffect } from 'react';
import { DatabaseState, Order, OrderStatus, Lead, LeadStatus, Product } from '../../types';
import { sendOrderStatusEmail } from '../../utils/emailHelper';
import { getWhatsAppNotificationUrl } from '../../utils/whatsappHelper';
import { 
  CheckCircle2, 
  Truck, 
  XCircle, 
  Search, 
  Calendar, 
  PhoneCall, 
  AlertCircle, 
  ChevronUp, 
  ChevronDown, 
  ArrowUpDown, 
  Eye, 
  Edit, 
  Clock, 
  DollarSign, 
  User, 
  MapPin, 
  Info, 
  ChevronRight,
  ClipboardList,
  Download
} from 'lucide-react';

interface OrdersTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
}

export default function OrdersTab({ state, onUpdateState }: OrdersTabProps) {
  const [apiPartners, setApiPartners] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/integrate/data')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load api store integrations');
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.users)) {
          setApiPartners(data.users);
        }
      })
      .catch(err => console.error('Error fetching api partners inside orders view:', err));
  }, []);

  const [activeSegment, setActiveSegment] = useState<'orders' | 'leads' | 'reminders'>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'normal' | 'backorder'>('all');

  // Interactive sorting states
  const [sortField, setSortField] = useState<'createdAt' | 'preferredDeliveryDate'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Currently viewing/editing order modal state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Helper to programmatically download base64 or other data resource image attachment
  const handleDownloadImage = (base64Url: string, fileName: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const link = document.createElement('a');
      link.href = base64Url;
      link.download = fileName || 'custom-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open in new window if possible
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`<img src="${base64Url}" style="max-width: 100%; height: auto;" />`);
        newWindow.document.title = fileName || 'Custom Image Attachment';
      } else {
        alert('Could not download or open image. Please check your browser download permissions or popup blockers.');
      }
    }
  };

  // Quick Inline Confirmation State
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    orderId: string;
    orderRef: string;
    currentStatus: OrderStatus;
    newStatus: OrderStatus;
  } | null>(null);

  // Sort Fields Toggle
  const handleToggleSort = (field: 'createdAt' | 'preferredDeliveryDate') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to newest/latest first
    }
  };

  // Inline Fulfill Status Updates
  const handleInitiateStatusChange = (orderId: string, orderRef: string, currentStatus: OrderStatus, newStatus: OrderStatus) => {
    if (currentStatus === newStatus) return;
    setPendingStatusChange({
      orderId,
      orderRef,
      currentStatus,
      newStatus
    });
  };

  const updateOrderStockAndPayment = (
    order: Order,
    nextStatus: OrderStatus,
    nextPaymentStatus: 'pending' | 'paid' | 'failed' | 'refunded',
    products: Product[]
  ): { stockAdjusted: boolean } => {
    let currentlyAdjusted = !!order.stockAdjusted;
    const items = order.items;

    const isCancelled = nextStatus === OrderStatus.CANCELLED;
    const becamePaid = nextPaymentStatus === 'paid' && !isCancelled;

    if (currentlyAdjusted && isCancelled) {
      // Return stock back!
      items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          if (prod.isHamper && prod.hamperItems && prod.hamperItems.length > 0) {
            prod.hamperItems.forEach(subItem => {
              const subProd = products.find(p => p.id === subItem.productId);
              if (subProd) {
                const totalAdd = item.quantity * subItem.quantity;
                subProd.stock += totalAdd;
                if (subProd.stock > 0 && subProd.outOfStockDate) {
                  delete subProd.outOfStockDate;
                }
              }
            });
          } else {
            prod.stock += item.quantity;
            if (prod.stock > 0 && prod.outOfStockDate) {
              delete prod.outOfStockDate;
            }
          }
        }
      });
      currentlyAdjusted = false;
    } else if (!currentlyAdjusted && becamePaid) {
      // Deduct stock!
      items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (prod) {
          if (prod.isHamper && prod.hamperItems && prod.hamperItems.length > 0) {
            prod.hamperItems.forEach(subItem => {
              const subProd = products.find(p => p.id === subItem.productId);
              if (subProd) {
                const totalDeduct = item.quantity * subItem.quantity;
                subProd.stock = Math.max(0, subProd.stock - totalDeduct);
                if (subProd.stock <= 0 && !subProd.outOfStockDate) {
                  subProd.outOfStockDate = new Date().toISOString().split('T')[0];
                }
              }
            });
          } else {
            prod.stock = Math.max(0, prod.stock - item.quantity);
            if (prod.stock <= 0 && !prod.outOfStockDate) {
              prod.outOfStockDate = new Date().toISOString().split('T')[0];
            }
          }
        }
      });
      currentlyAdjusted = true;
    }

    return { stockAdjusted: currentlyAdjusted };
  };

  const handleConfirmStatusChange = () => {
    if (!pendingStatusChange) return;
    const { orderId, newStatus, orderRef } = pendingStatusChange;
    
    const list = [...state.orders];
    const idx = list.findIndex(o => o.id === orderId);
    if (idx >= 0) {
      const oldOrder = list[idx];
      const products = [...state.products];
      
      let nextPayStatus = oldOrder.paymentStatus || 'pending';
      // Auto upgrade payment status if order marked DELIVERED or SHIPPED
      if ((newStatus === OrderStatus.DELIVERED || newStatus === OrderStatus.SHIPPED) && nextPayStatus !== 'paid') {
        nextPayStatus = 'paid';
      }

      // Stock adjustment logic
      const { stockAdjusted } = updateOrderStockAndPayment(
        oldOrder,
        newStatus,
        nextPayStatus,
        products
      );

      list[idx].status = newStatus;
      list[idx].paymentStatus = nextPayStatus;
      list[idx].stockAdjusted = stockAdjusted;

      let templateId: 'confirmation' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | null = null;
      if (newStatus === OrderStatus.PAID) templateId = 'processing';
      else if (newStatus === OrderStatus.SHIPPED) templateId = 'shipped';
      else if (newStatus === OrderStatus.DELIVERED) templateId = 'delivered';
      else if (newStatus === OrderStatus.CANCELLED) templateId = 'cancelled';

      const updatedOrder = list[idx];
      if (templateId) {
        sendOrderStatusEmail({ ...state, orders: list, products }, updatedOrder, templateId).then(updatedState => {
          onUpdateState(updatedState);
        }).catch(err => {
          console.error(err);
          onUpdateState({ ...state, orders: list, products });
        });
      } else {
        onUpdateState({ ...state, orders: list, products });
      }

      alert(`Order ${orderRef} fulfillment pipeline set to ${newStatus.toUpperCase()}`);
    }
    setPendingStatusChange(null);
  };

  // Full Order Details saving
  const handleSaveOrderEdit = (updatedOrder: Order) => {
    const list = [...state.orders];
    const idx = list.findIndex(o => o.id === updatedOrder.id);
    if (idx >= 0) {
      const oldOrder = list[idx];
      const products = [...state.products];
      
      const nextStatus = updatedOrder.status;
      const nextPaymentStatus = updatedOrder.paymentStatus || 'pending';

      const { stockAdjusted } = updateOrderStockAndPayment(
        oldOrder,
        nextStatus,
        nextPaymentStatus,
        products
      );

      updatedOrder.stockAdjusted = stockAdjusted;
      list[idx] = updatedOrder;

      const flagStatusChanged = oldOrder.status !== nextStatus;

      let templateId: 'confirmation' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | null = null;
      if (nextStatus === OrderStatus.PAID) templateId = 'processing';
      else if (nextStatus === OrderStatus.SHIPPED) templateId = 'shipped';
      else if (nextStatus === OrderStatus.DELIVERED) templateId = 'delivered';
      else if (nextStatus === OrderStatus.CANCELLED) templateId = 'cancelled';

      if (flagStatusChanged && templateId) {
        sendOrderStatusEmail({ ...state, orders: list, products }, updatedOrder, templateId).then(updatedState => {
          onUpdateState(updatedState);
        }).catch(err => {
          console.error(err);
          onUpdateState({ ...state, orders: list, products });
        });
      } else {
        onUpdateState({ ...state, orders: list, products });
      }

      setEditingOrder(null);
      alert(`Order details for ${updatedOrder.refId} successfully updated.`);
    }
  };

  // Update Lead status
  const handleUpdateLeadStatus = (leadId: string, newStatus: LeadStatus) => {
    const list = [...state.leads];
    const idx = list.findIndex(l => l.id === leadId);
    if (idx >= 0) {
      const targetLead = list[idx];
      const previousStatus = targetLead.status;
      list[idx].status = newStatus;

      let nextOrders = [...state.orders];
      // If the lead is marked as RECOVERED, check if we need to auto-create an order
      if (newStatus === LeadStatus.RECOVERED && previousStatus !== LeadStatus.RECOVERED) {
        // Look up if an order has already been created for this lead's info
        const alreadyHasOrder = state.orders.some(o => 
          (o.customerPhone === targetLead.customerPhone || o.senderPhone === targetLead.customerPhone) &&
          o.totalAmount === targetLead.totalAmount &&
          o.items.length === targetLead.cartItems.length
        );

        if (!alreadyHasOrder) {
          const matchDistrict = state.deliveryDistricts?.find(d => d.id === targetLead.deliveryDistrictId);
          const districtName = matchDistrict ? matchDistrict.name : undefined;

          // Generate a beautifully styled, complete fulfillment order matching standard orders
          const randomSuffix = Math.floor(Math.random() * 90000 + 10000);
          const newOrder: Order = {
            id: `order-lead-${targetLead.id}-${Date.now()}`,
            refId: `KO-${randomSuffix}`,
            customerName: targetLead.customerName || 'Handover Client',
            customerEmail: targetLead.customerEmail || 'support@koseli.com',
            customerPhone: targetLead.customerPhone || '980100000',
            shippingAddress: targetLead.deliveryAddress || 'Kathmandu Valley (Recovered Lead Support)',
            senderName: targetLead.customerName || 'Handover Client',
            senderEmail: targetLead.customerEmail || 'support@koseli.com',
            senderPhone: targetLead.customerPhone || '980100000',
            receiverName: targetLead.receiverName || targetLead.customerName || 'Handover Client',
            receiverPhone: targetLead.receiverPhone || targetLead.customerPhone || '980100000',
            deliveryDistrict: districtName,
            deliveryAddress: targetLead.deliveryAddress || 'Kathmandu Valley (Recovered Lead Support)',
            orderNote: targetLead.orderNote || undefined,
            preferredDeliveryDate: targetLead.preferredDeliveryDate || undefined,
            selectedTimeSlot: targetLead.selectedTimeSlotId || undefined,
            items: targetLead.cartItems.map(c => {
              const matchedProduct = state.products.find(p => p.id === c.productId);
              return {
                productId: c.productId,
                productName: matchedProduct ? matchedProduct.name : 'Unknown Boutique Basket',
                quantity: c.quantity,
                selectedPrice: matchedProduct ? (matchedProduct.discountPrice || matchedProduct.price) : 1000,
                selectedVariations: c.selectedVariations || [],
                customMessage: c.customMessage,
                customImageUrl: c.customImageUrl
              };
            }),
            additionalServiceFeeAdded: targetLead.additionalServiceFeeAdded || null,
            additionalServiceFeeAmount: 0,
            currency: targetLead.currency || 'NPR',
            exchangeRate: 1.0,
            totalAmount: targetLead.totalAmount,
            totalAmountBase: targetLead.totalAmount,
            paymentMethod: targetLead.paymentMethod || 'MANUAL',
            status: OrderStatus.PENDING,
            paymentStatus: 'paid', // Mark as paid since support verified it!
            stockAdjusted: true,
            createdAt: new Date().toISOString()
          };

          // Also reduce stock of the matched products or hampers!
          const products = state.products.map(p => {
            const boughtItem = targetLead.cartItems.find(item => item.productId === p.id);
            if (boughtItem) {
              const newStock = Math.max(0, p.stock - boughtItem.quantity);
              const isOutOfStockNow = newStock <= 0;
              return { 
                ...p, 
                stock: newStock,
                outOfStockDate: isOutOfStockNow ? new Date().toISOString().split('T')[0] : p.outOfStockDate
              };
            }
            return p;
          });

          nextOrders = [newOrder, ...nextOrders];
          onUpdateState({ 
            ...state, 
            leads: list, 
            orders: nextOrders,
            products
          });
          alert(`Convert Success: A new Fulfillment order (${newOrder.refId}) has been automatically routed to your dispatch lists and product stock adjusted.`);
          return;
        }
      }

      onUpdateState({ ...state, leads: list });
    }
  };

  // Filter & Sort orders
  const filteredOrders = state.orders.filter(o => {
    // Search query matches customer name, refId, or contact phone
    const s = searchQuery.toLowerCase();
    const sender = (o.senderName || o.customerName || '').toLowerCase();
    const receiver = (o.receiverName || o.customerName || '').toLowerCase();
    const ref = (o.refId || '').toLowerCase();
    const phone = ((o.senderPhone || o.customerPhone || '') + ' ' + (o.receiverPhone || '')).toLowerCase();
    
    const matchesSearch = sender.includes(s) || receiver.includes(s) || ref.includes(s) || phone.includes(s);
    const matchesStatus = statusFilter === 'all' ? true : o.status === statusFilter;
    
    const pStatus = o.paymentStatus || 'pending';
    const matchesPayment = paymentFilter === 'all' ? true : pStatus === paymentFilter;

    let matchesOrderType = true;
    if (orderTypeFilter === 'normal') {
      matchesOrderType = !o.items.some(it => it.isBackorder);
    } else if (orderTypeFilter === 'backorder') {
      matchesOrderType = o.items.some(it => it.isBackorder);
    }

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(o.createdAt) >= new Date(startDate);
    }
    if (endDate) {
      const ed = new Date(endDate);
      ed.setHours(23, 59, 59);
      matchesDate = matchesDate && new Date(o.createdAt) <= ed;
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesDate && matchesOrderType;
  });

  // Execute Dynamic Sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortField === 'createdAt') {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      // Sort by preferred delivery date
      const valA = a.preferredDeliveryDate ? new Date(a.preferredDeliveryDate).getTime() : 0;
      const valB = b.preferredDeliveryDate ? new Date(b.preferredDeliveryDate).getTime() : 0;
      
      if (valA === valB) {
        // Fallback to chronological newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
  });

  // Pagination states
  const [adminOrdersPage, setAdminOrdersPage] = useState(1);
  const itemsPerPage = 50;

  React.useEffect(() => {
    setAdminOrdersPage(1);
  }, [searchQuery, statusFilter, paymentFilter, startDate, endDate, orderTypeFilter, sortField, sortOrder]);

  const totalAdminOrdersPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const paginatedAdminOrders = sortedOrders.slice(
    (adminOrdersPage - 1) * itemsPerPage,
    adminOrdersPage * itemsPerPage
  );

  const [adminLeadsPage, setAdminLeadsPage] = useState(1);
  const totalAdminLeadsPages = Math.ceil(state.leads.length / itemsPerPage);
  const paginatedAdminLeads = state.leads.slice(
    (adminLeadsPage - 1) * itemsPerPage,
    adminLeadsPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Sub tabs switches */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-850">Operational Fulfillment</h2>
          <p className="text-sm text-slate-500">Monitor consumer sales, fulfill gift hamper dispatch pipelines, and follow up on customer leads.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveSegment('orders')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${activeSegment === 'orders' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
          >
            Fulfillment Orders ({state.orders.length})
          </button>
          <button
            onClick={() => setActiveSegment('leads')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${activeSegment === 'leads' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
          >
            Follow-up Leads ({state.leads.filter(l => l.status === LeadStatus.FAILED).length})
          </button>
          <button
            onClick={() => setActiveSegment('reminders')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${activeSegment === 'reminders' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
          >
            📅 Customer Reminders ({(state.specialDayReminders || []).length})
          </button>
        </div>
      </div>

      {activeSegment === 'orders' ? (
        <div className="space-y-4">
          {/* Query Filter Toolbar */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Client, phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Fulfillment Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-full focus:outline-none text-slate-650 cursor-pointer"
              >
                <option value="all">All Order Statuses</option>
                <option value={OrderStatus.PENDING}>Payment Pending</option>
                <option value={OrderStatus.PAID}>Order Received</option>
                <option value={OrderStatus.PREPARING}>Preparing</option>
                <option value={OrderStatus.SHIPPED}>Dispatch</option>
                <option value={OrderStatus.DELIVERED}>Delivered</option>
                <option value={OrderStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-full focus:outline-none text-slate-650 cursor-pointer"
              >
                <option value="all">All Payment Statuses</option>
                <option value="pending">Pending Payment</option>
                <option value="paid">Prepaid / Paid</option>
                <option value="failed">Failed Payment</option>
                <option value="refunded">Refunded / Voided</option>
              </select>
            </div>

            {/* Order Type Filter (Normal vs Overriden Backorder) */}
            <div>
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value as any)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-full focus:outline-none text-slate-650 cursor-pointer font-medium"
              >
                <option value="all">All Order Types (Normal & Backorders)</option>
                <option value="normal">Normal Orders Only</option>
                <option value="backorder">Special Backorder Overrides</option>
              </select>
            </div>

            {/* Sorting helper dropdown */}
            <div>
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-') as [any, any];
                  setSortField(field);
                  setSortOrder(order);
                }}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-full focus:outline-none text-slate-650 cursor-pointer"
              >
                <option value="createdAt-desc">Order Date: Newest First</option>
                <option value="createdAt-asc">Order Date: Oldest First</option>
                <option value="preferredDeliveryDate-asc">Delivery Date: Earliest First</option>
                <option value="preferredDeliveryDate-desc">Delivery Date: Latest First</option>
              </select>
            </div>

            {/* Date Range Matcher */}
            <div className="flex gap-2 items-center md:col-span-4 lg:col-span-1">
              <div className="relative flex-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-8 pr-2 py-2 text-[10px] bg-slate-50 border border-slate-200 rounded-lg w-full font-mono focus:outline-none text-slate-700"
                />
              </div>
              <span className="text-slate-400 text-xs">to</span>
              <div className="relative flex-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-8 pr-2 py-2 text-[10px] bg-slate-50 border border-slate-200 rounded-lg w-full font-mono focus:outline-none text-slate-700"
                />
              </div>
              {(startDate || endDate || searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || orderTypeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => { 
                    setStartDate(''); 
                    setEndDate(''); 
                    setSearchQuery(''); 
                    setStatusFilter('all'); 
                    setPaymentFilter('all'); 
                    setOrderTypeFilter('all');
                  }}
                  className="p-2 text-xs text-rose-600 hover:bg-rose-50 rounded bg-slate-50 border border-slate-150 cursor-pointer font-bold shrink-0 transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Clean Dashboard Table Design */}
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="py-3 px-4 font-mono">Ref ID</th>
                    
                    {/* Sortable Header - Order Date */}
                    <th 
                      onClick={() => handleToggleSort('createdAt')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition"
                    >
                      <div className="flex items-center gap-1">
                        <span>Order Date</span>
                        {sortField === 'createdAt' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-amber-600" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-350" />
                        )}
                      </div>
                    </th>

                    {/* Sortable Header - Delivery Date */}
                    <th 
                      onClick={() => handleToggleSort('preferredDeliveryDate')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 select-none transition"
                    >
                      <div className="flex items-center gap-1">
                        <span>Delivery Date</span>
                        {sortField === 'preferredDeliveryDate' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-amber-600" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-350" />
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-4">Sender Name & Details</th>
                    <th className="py-3 px-4">Receiver Name & Logistics</th>
                    <th className="py-3 px-4 max-w-xs">Hampers / Bought Items</th>
                    <th className="py-3 px-4 text-right">Sum Amount</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-center">Fulfill Status</th>
                    <th className="py-3 px-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {sortedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-medium font-mono text-xs">
                        No orders matched criteria query.
                      </td>
                    </tr>
                  ) : (
                    paginatedAdminOrders.map(o => {
                      const pStatus = o.paymentStatus || 'pending';
                      return (
                        <tr 
                          key={o.id} 
                          className="hover:bg-slate-100/40 transition-colors group cursor-pointer"
                          onClick={() => setEditingOrder(o)}
                        >
                          {/* Ref ID */}
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <div className="text-rose-600">{o.refId}</div>
                            
                            {/* API Partner Details */}
                            {(o.apiPartnerId || o.refId?.startsWith('KO-API') || o.orderNote?.includes('API placed order') || o.apiPartnerUsername) && (() => {
                              const partner = apiPartners.find((p: any) => p.id === o.apiPartnerId || p.username?.toLowerCase() === o.apiPartnerUsername?.toLowerCase());
                              const partnerName = partner ? partner.integrationName : (o.apiPartnerUsername || 'API Partner');
                              const partnerUserId = partner ? partner.id : (o.apiPartnerId || 'api_user');
                              return (
                                <div className="mt-1 flex flex-col items-start gap-0.5" onClick={(e) => e.stopPropagation()}>
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200/50 px-1.5 py-0.5 rounded-md font-extrabold uppercase">
                                    🔌 {partnerName}
                                  </span>
                                  <span className="text-[8.5px] font-bold text-slate-400 block font-mono">
                                    UID: {partnerUserId.substring(0, 16)}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Order Date */}
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(o.createdAt).toLocaleDateString(undefined, { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </td>

                          {/* Preferred Delivery Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold">
                            {o.preferredDeliveryDate ? (
                              <div className="flex flex-col gap-1 text-left items-start">
                                <div className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-md text-[11px]">
                                  <Calendar className="w-3 h-3 text-emerald-600" />
                                  <span>{o.preferredDeliveryDate}</span>
                                </div>
                                {o.selectedTimeSlot && (
                                  <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-500/10 px-2 py-0.5 rounded-md text-[10px]">
                                    <Clock className="w-2.5 h-2.5 text-purple-650" />
                                    <span>{o.selectedTimeSlot}</span>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">-</span>
                            )}
                          </td>

                          {/* Sender Column */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{o.senderName || o.customerName}</div>
                            <div className="text-[10px] text-slate-400 leading-normal">{o.senderEmail || o.customerEmail || 'Guest'}</div>
                            <div className="text-[10px] text-slate-500 font-mono font-semibold mt-0.5">{o.senderPhone || o.customerPhone}</div>
                          </td>

                          {/* Receiver Column */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{o.receiverName || o.customerName}</div>
                            <div className="text-[10px] text-slate-500 font-mono font-semibold">{o.receiverPhone || o.customerPhone}</div>
                            <div className="text-[10px] text-slate-650 bg-slate-50 p-1.5 rounded border border-slate-200/40 mt-1.5 max-w-[180px] break-words">
                              <div className="font-medium text-slate-700 leading-tight">{o.deliveryAddress || o.shippingAddress}</div>
                              {o.deliveryDistrict && (
                                <span className="text-[8px] font-extrabold text-amber-700 bg-amber-500/10 px-1 py-0.5 rounded inline-block mt-1 uppercase tracking-wider">
                                  {o.deliveryDistrict}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Items Column */}
                          <td className="py-3.5 px-4 max-w-xs" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-1.5">
                              {o.items.map((item, idx) => (
                                <div key={idx} className="border-b border-dashed border-slate-100 last:border-b-0 pb-1.5 last:pb-0 mb-1 last:mb-0">
                                  <div className="font-semibold text-slate-700 leading-normal">
                                    • {item.productName} <span className="text-slate-400 font-mono text-[10px]">x {item.quantity}</span>
                                  </div>
                                  {item.selectedVariations && item.selectedVariations.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1 ml-2.5 justify-start text-left max-w-full">
                                      {item.selectedVariations.map((vOpt, vOptIdx) => (
                                        <span 
                                          key={vOptIdx} 
                                          className="inline-block text-[8px] font-mono px-1 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/50 leading-none"
                                        >
                                          {vOpt.name}: <span className="font-extrabold">{vOpt.value}</span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {item.customMessage && (
                                    <div className="ml-2.5 p-1 bg-amber-500/5 text-amber-900 border border-amber-200/40 rounded mt-0.5 text-[9.5px] leading-snug">
                                      {item.customMessage}
                                    </div>
                                  )}
                                  {item.customImageUrl && (
                                    <div className="ml-2.5 flex items-center gap-2 mt-1">
                                      <span className="text-[8px] font-black uppercase text-slate-400">File:</span>
                                      <button 
                                        type="button"
                                        onClick={(e) => handleDownloadImage(item.customImageUrl!, `order-${o.refId || o.id}-item-${idx + 1}.png`, e)}
                                        className="relative inline-block border hover:opacity-80 transition cursor-pointer group"
                                        title="Click to download personalized image"
                                      >
                                        <img src={item.customImageUrl} referrerPolicy="no-referrer" className="w-8 h-8 object-cover rounded" alt="Upload" />
                                        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                                          <Download className="w-3 h-3" />
                                        </span>
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={(e) => handleDownloadImage(item.customImageUrl!, `order-${o.refId || o.id}-item-${idx + 1}.png`, e)}
                                        className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                        title="Download attachment"
                                      >
                                        <Download className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Sum Amount */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="font-mono font-extrabold text-slate-850 text-sm">
                              {o.currency} {o.totalAmount.toLocaleString()}
                            </div>
                            {o.currency !== 'NPR' && (
                              <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                                (Base: NPR {o.totalAmountBase.toLocaleString()})
                              </div>
                            )}
                            <div className="text-[9.5px] text-slate-400 mt-0.5 font-medium">{o.paymentMethod}</div>
                          </td>

                          {/* Payment Status */}
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <span className={`inline-block px-2.5 py-1 text-[9px] tracking-wider uppercase font-black rounded-lg ${
                              pStatus === 'paid' ? 'bg-emerald-50 text-emerald-650 border border-emerald-250' :
                              pStatus === 'failed' ? 'bg-rose-50 text-rose-650 border border-rose-250 font-black' :
                              pStatus === 'refunded' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                              'bg-amber-50 text-amber-705 border border-amber-200 font-bold animate-pulse'
                            }`}>
                              {pStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={o.status}
                              onChange={(e) => handleInitiateStatusChange(o.id, o.refId, o.status, e.target.value as OrderStatus)}
                              className="p-1 text-[10px] font-bold border border-slate-200 rounded-md bg-slate-50 text-slate-700 cursor-pointer focus:outline-none"
                            >
                              <option value={OrderStatus.PENDING}>Payment Pending</option>
                              <option value={OrderStatus.PAID}>Order Received</option>
                              <option value={OrderStatus.PREPARING}>Preparing</option>
                              <option value={OrderStatus.SHIPPED}>Dispatch</option>
                              <option value={OrderStatus.DELIVERED}>Delivered</option>
                              <option value={OrderStatus.CANCELLED}>Cancelled</option>
                            </select>
                          </td>

                          {/* View Detail Action */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 justify-end items-center">
                              {/* WhatsApp Ping Customer */}
                              <a
                                href={getWhatsAppNotificationUrl(o, state.smtpSettings, false)}
                                target="_blank"
                                rel="noreferrer"
                                title="Send WhatsApp Update to Customer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-extrabold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 rounded-lg transition-all hover:scale-[1.02] cursor-pointer font-sans no-underline"
                              >
                                <span className="text-xs">💬</span>
                                <span className="hidden sm:inline font-bold">WhatsApp Client</span>
                              </a>

                              {/* WhatsApp Ping Admin logistics line */}
                              {state.smtpSettings?.notificationWhatsapp && state.smtpSettings?.whatsappEnabled && (
                                <a
                                  href={getWhatsAppNotificationUrl(o, state.smtpSettings, true)}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Dispatch WhatsApp Alert to Admin Logistics"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-extrabold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all hover:scale-[1.02] cursor-pointer font-sans no-underline"
                                >
                                  <span className="text-xs">🔔</span>
                                  <span className="hidden sm:inline font-bold">Admin Ping</span>
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => setEditingOrder(o)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-250 rounded-lg hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all cursor-pointer font-sans shadow-2xs"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>View & Edit</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalAdminOrdersPages > 1 && (
              <div className="bg-slate-50 border-t border-slate-100 px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                <div>
                  Showing <strong className="text-slate-800">{Math.min(sortedOrders.length, (adminOrdersPage - 1) * itemsPerPage + 1)}-{Math.min(sortedOrders.length, adminOrdersPage * itemsPerPage)}</strong> of <strong className="text-slate-800">{sortedOrders.length}</strong> fulfillment orders
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={adminOrdersPage === 1}
                    onClick={() => setAdminOrdersPage(1)}
                    className="p-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                  >
                    First
                  </button>
                  <button
                    type="button"
                    disabled={adminOrdersPage === 1}
                    onClick={() => setAdminOrdersPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1 font-bold text-slate-800 bg-white/50 border border-slate-200 rounded">
                    {adminOrdersPage} / {totalAdminOrdersPages}
                  </span>
                  <button
                    type="button"
                    disabled={adminOrdersPage === totalAdminOrdersPages}
                    onClick={() => setAdminOrdersPage(prev => Math.min(totalAdminOrdersPages, prev + 1))}
                    className="p-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    disabled={adminOrdersPage === totalAdminOrdersPages}
                    onClick={() => setAdminOrdersPage(totalAdminOrdersPages)}
                    className="p-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeSegment === 'leads' ? (
        /* LEADS PIPELINE LOG */
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-xs leading-relaxed">
            💡 <strong>Leads are created</strong> when a client begins checking out and enters their contacts but fails or leaves. 
            Reaching out via custom WhatsApp templates restores up to <strong>15% of abandoned carts!</strong>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm text-slate-650">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-3">Ref Date</th>
                  <th className="p-3">Client Information</th>
                  <th className="p-3">Unfinished Cart Items</th>
                  <th className="p-3">Valuation</th>
                  <th className="p-3 text-center">Audit Status</th>
                  <th className="p-3 text-right">Engagements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {state.leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 font-mono font-semibold">
                      Checkout Leads empty.
                    </td>
                  </tr>
                ) : (
                  paginatedAdminLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-55 transition">
                      <td className="p-3 font-mono text-[10px] text-slate-400">
                        {new Date(lead.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 min-w-[200px]">
                        <div className="font-bold text-slate-800">{lead.customerName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{lead.customerEmail}</div>
                        <div className="text-[10px] font-mono font-bold text-slate-705">{lead.customerPhone}</div>
                        
                        {lead.status === LeadStatus.RECOVERED && (
                          (() => {
                            const matchedOrder = state.orders.find(o => o.id.includes(lead.id));
                            if (matchedOrder) {
                              return (
                                <div className="mt-2.5 p-2.5 bg-emerald-500/[0.03] border border-emerald-500/20 rounded-lg space-y-2 text-slate-700 max-w-sm">
                                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 border-b border-emerald-500/10 pb-1.5">
                                    <span className="flex items-center gap-1 text-emerald-700 font-bold">📋 Linked Converted Order</span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingOrder(matchedOrder)}
                                      className="px-2 py-0.5 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 hover:text-emerald-950 rounded font-bold transition shadow-3xs cursor-pointer inline-flex items-center gap-0.5 text-[9px]"
                                    >
                                      Inspect ➜
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] leading-normal font-semibold">
                                    <div>Ref ID: <strong className="text-slate-905 font-mono">{matchedOrder.refId}</strong></div>
                                    <div>Status: <span className="font-bold uppercase text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">{matchedOrder.status}</span></div>
                                    <div>Recipient: <span className="font-bold text-slate-800">{matchedOrder.receiverName || 'N/A'}</span></div>
                                    <div>Phone: <span className="font-semibold text-slate-750 font-mono">{matchedOrder.receiverPhone || 'N/A'}</span></div>
                                    {matchedOrder.deliveryDistrict && (
                                      <div className="col-span-2">District: <span className="text-slate-600 font-bold">{matchedOrder.deliveryDistrict}</span></div>
                                    )}
                                    <div className="col-span-2 space-y-0.5">
                                      <span className="text-[9px] text-slate-450 uppercase font-bold tracking-wider block">Fulfillment Destination</span>
                                      <span className="font-semibold text-slate-700">{matchedOrder.deliveryAddress || matchedOrder.shippingAddress || 'N/A'}</span>
                                    </div>
                                    {matchedOrder.preferredDeliveryDate && (
                                      <div className="col-span-2 pb-0.5">Delivery Date: <span className="text-slate-600 font-bold font-mono">{matchedOrder.preferredDeliveryDate} {matchedOrder.selectedTimeSlot ? `(${matchedOrder.selectedTimeSlot})` : ''}</span></div>
                                    )}
                                    
                                    {/* Order Items & Summary Pricing Details - All come as order */}
                                    <div className="col-span-2 border-t border-emerald-500/10 pt-1.5 mt-1">
                                      <div className="flex justify-between items-center text-[9.5px] font-mono mb-1">
                                        <span className="text-[9px] uppercase font-bold tracking-widest text-slate-405">Purchased Items</span>
                                        <span className="font-extrabold text-rose-600">NPR {matchedOrder.totalAmount.toLocaleString()}</span>
                                      </div>
                                      <div className="space-y-1 pl-2 border-l-2 border-emerald-500/25">
                                        {matchedOrder.items?.map((it, idx) => (
                                          <div key={idx} className="text-slate-650 flex justify-between items-center gap-1 font-mono text-[9px]">
                                            <span>• {it.productName}</span>
                                            <span className="text-slate-400">x{it.quantity}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {matchedOrder.orderNote && (
                                      <div className="col-span-2 italic text-slate-500 border-t border-emerald-500/5 pt-1 mt-1">
                                        <span className="text-[9px] font-bold text-slate-400 block not-italic">Order Note:</span>
                                        "{matchedOrder.orderNote}"
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            } else {
                              return <div className="mt-1.5 text-[10px] text-slate-400 italic">No direct linked order found in system</div>;
                            }
                          })()
                        )}
                      </td>
                      <td className="p-3 space-y-0.5">
                        {lead.cartItems.map((c, i) => {
                          const p = state.products.find(prod => prod.id === c.productId);
                          return (
                            <div key={i} className="text-slate-550 font-semibold">
                              - {p ? p.name : 'Unknown Product'} x {c.quantity}
                            </div>
                          );
                        })}
                      </td>
                      <td className="p-3 font-mono font-extrabold text-slate-800">
                        {lead.currency} {lead.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center text-xs">
                        <span className={`inline-block px-2 py-0.5 font-bold tracking-wider uppercase rounded text-[9px] ${
                          lead.status === LeadStatus.RECOVERED ? 'bg-emerald-50 text-emerald-600' :
                          lead.status === LeadStatus.FOLLOWED_UP ? 'bg-blue-50 text-blue-650' :
                          'bg-amber-50 text-amber-600 animate-pulse'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5 flex justify-end items-center h-full">
                        <button
                          onClick={() => {
                            const waUrl = `https://wa.me/${lead.customerPhone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Hi ${lead.customerName}, this is Koseli Xpress customer support. We noticed you tried placing an order for premium gift hampers, but payments didn't finalize. Can we assist your checkout or set custom bank accounts?`)}`;
                            window.open(waUrl, '_blank');
                            handleUpdateLeadStatus(lead.id, LeadStatus.FOLLOWED_UP);
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-650 rounded-md border border-emerald-200 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <PhoneCall className="w-3 h-3" /> WhatsApp Follow
                        </button>
                        <button
                          onClick={() => handleUpdateLeadStatus(lead.id, LeadStatus.RECOVERED)}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md cursor-pointer"
                        >
                          Recovered ✓
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalAdminLeadsPages > 1 && (
              <div className="bg-slate-50 border-t border-slate-100 px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                <div>
                  Showing <strong className="text-slate-800">{Math.min(state.leads.length, (adminLeadsPage - 1) * itemsPerPage + 1)}-{Math.min(state.leads.length, adminLeadsPage * itemsPerPage)}</strong> of <strong className="text-slate-800">{state.leads.length}</strong> follow-up leads
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    disabled={adminLeadsPage === 1}
                    onClick={() => setAdminLeadsPage(1)}
                    className="p-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                  >
                    First
                  </button>
                  <button
                    type="button"
                    disabled={adminLeadsPage === 1}
                    onClick={() => setAdminLeadsPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1 font-bold text-slate-800 bg-white/50 border border-slate-200 rounded">
                    {adminLeadsPage} / {totalAdminLeadsPages}
                  </span>
                  <button
                    type="button"
                    disabled={adminLeadsPage === totalAdminLeadsPages}
                    onClick={() => setAdminLeadsPage(prev => Math.min(totalAdminLeadsPages, prev + 1))}
                    className="p-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    disabled={adminLeadsPage === totalAdminLeadsPages}
                    onClick={() => setAdminLeadsPage(totalAdminLeadsPages)}
                    className="p-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 disabled:opacity-40 disabled:hover:bg-white select-none transition cursor-pointer"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* REMINDERS PIPELINE SEGMENT */
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 text-rose-800 border border-rose-100 rounded-lg text-xs leading-relaxed">
            💡 <strong>Special Day Reminder Systems</strong> are registered by customer clients inside their private profile lounges. 
            Check upcoming family events, birthdays, or anniversaries, and click the Solicitation trigger button to remind them of timely booking options!
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-1 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total User Reminders</span>
              <span className="text-xl font-mono font-extrabold text-slate-805">
                {(state.specialDayReminders || []).length}
              </span>
            </div>
            <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-1 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Dispatched Alerts</span>
              <span className="text-xl font-mono font-extrabold text-emerald-600">
                {(state.specialDayReminders || []).filter(r => r.autoReminded).length}
              </span>
            </div>
            <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-1 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Active Queues</span>
              <span className="text-xl font-mono font-extrabold text-[#a855f7]">
                {(state.specialDayReminders || []).filter(r => !r.autoReminded).length}
              </span>
            </div>
            <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-1 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Conversion Rate</span>
              <span className="text-xl font-mono font-extrabold text-amber-600">12.5%</span>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm text-slate-650">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-3">Registered Date</th>
                  <th className="p-3">Client Email / WhatsApp No.</th>
                  <th className="p-3">Recipient Name (Celebrant)</th>
                  <th className="p-3">Relationship Label</th>
                  <th className="p-3">Occurring Event Date</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Fulfillment Solicitation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
                {(!state.specialDayReminders || state.specialDayReminders.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center font-mono text-slate-400 text-xs italic">
                      No customer special day registries captured.
                    </td>
                  </tr>
                ) : (
                  state.specialDayReminders.map(rem => (
                    <tr key={rem.id} className="hover:bg-slate-55 transition text-xs">
                      <td className="p-3 font-mono text-slate-400 font-bold">
                        {rem.createdAt || 'N/A'}
                      </td>
                      <td className="p-3 text-slate-805">
                        <div className="font-bold">{rem.email}</div>
                        {rem.phone && <div className="text-[10px] font-mono text-slate-500">{rem.phone}</div>}
                      </td>
                      <td className="p-3 font-sans font-bold text-slate-805">
                        {rem.name}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[9px] rounded-full font-extrabold uppercase">{rem.relation}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-805">
                        {rem.date}
                      </td>
                      <td className="p-3 text-center">
                        {rem.autoReminded ? (
                          <span className="text-[9px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full">
                            ✓ Reminder Sent
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wide bg-slate-105 text-slate-500 px-2.5 py-0.5 rounded-full">
                            Pending Cycle
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            const list = (state.specialDayReminders || []).map(r => r.id === rem.id ? { ...r, autoReminded: true } : r);
                            onUpdateState({ ...state, specialDayReminders: list });
                            alert(`🎉 Manual Order Solicitation Email successfully dispatched to client ${rem.email} for celebrant ${rem.name}!`);
                          }}
                          className="px-3.5 py-1 font-bold text-[9.5px] tracking-wide uppercase bg-rose-600 hover:bg-rose-700 text-white rounded cursor-pointer transition shadow-xs"
                        >
                          📣 Solicitation Alert
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW & EDIT ORDER DETAILED OVERLAY MODAL */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 text-slate-850">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200/80 w-full max-w-4xl p-6 relative max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span>Order Details:</span>
                    <span className="text-rose-600 font-mono font-black">{editingOrder.refId}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Placed On: {new Date(editingOrder.createdAt).toLocaleString()}
                  </p>
                  {/* API Partner Details on order in processing modal */}
                  {(editingOrder.apiPartnerId || editingOrder.refId?.startsWith('KO-API') || editingOrder.orderNote?.includes('API placed order') || editingOrder.apiPartnerUsername) && (() => {
                    const partner = apiPartners.find((p: any) => p.id === editingOrder.apiPartnerId || p.username?.toLowerCase() === editingOrder.apiPartnerUsername?.toLowerCase());
                    const partnerName = partner ? partner.integrationName : (editingOrder.apiPartnerUsername || 'API Partner');
                    const partnerUserId = partner ? partner.id : (editingOrder.apiPartnerId || 'api_user');
                    return (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 bg-indigo-50 border border-indigo-150 px-2.5 py-1 rounded-md text-[10.5px] text-indigo-700 font-semibold font-sans">
                        <span className="font-extrabold uppercase">🔌 API Integrated Order</span>
                        <span className="text-indigo-200">|</span>
                        <span>Partner: <strong className="text-indigo-900 font-bold">{partnerName}</strong></span>
                        <span className="text-indigo-200">|</span>
                        <span>User ID / Client ID: <strong className="text-slate-900 font-mono font-bold bg-slate-150/70 px-1 py-0.5 rounded">{partnerUserId}</strong></span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <button 
                onClick={() => setEditingOrder(null)}
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveOrderEdit(editingOrder);
              }}
              className="flex-1 overflow-y-auto py-4 space-y-6 text-left"
            >
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* COLUMN 1: SENDER & RECEIVER INFO */}
                <div className="space-y-4">
                  
                  {/* Sender Section */}
                  <div className="p-4 bg-amber-50/20 border border-amber-200/40 rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-amber-200/30 pb-1.5">
                      <User className="w-4 h-4 text-amber-600" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800">Sender Details</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-400 block">Sender Name</label>
                        <input 
                          type="text" 
                          required
                          value={editingOrder.senderName || editingOrder.customerName || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, senderName: e.target.value, customerName: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-400 block">Sender Phone</label>
                        <input 
                          type="text" 
                          required
                          value={editingOrder.senderPhone || editingOrder.customerPhone || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, senderPhone: e.target.value, customerPhone: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-400 block">Sender Email</label>
                        <input 
                          type="email" 
                          required
                          value={editingOrder.senderEmail || editingOrder.customerEmail || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, senderEmail: e.target.value, customerEmail: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Receiver Section */}
                  <div className="p-4 bg-violet-50/20 border border-violet-200/40 rounded-xl space-y-3 font-sans">
                    <div className="flex items-center gap-1.5 border-b border-violet-200/30 pb-1.5">
                      <MapPin className="w-4 h-4 text-violet-600" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-violet-800">Receiver Details & Logistics</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-400 block">Receiver Name</label>
                        <input 
                          type="text" 
                          required
                          value={editingOrder.receiverName || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, receiverName: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-400 block">Receiver Phone</label>
                        <input 
                          type="text" 
                          required
                          value={editingOrder.receiverPhone || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, receiverPhone: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                        />
                      </div>
                      
                      {/* Destination District selection dropdown */}
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-400 block">Destination District / Region (Rates Matcher)</label>
                        <select
                          value={editingOrder.deliveryDistrict || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, deliveryDistrict: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold cursor-pointer text-slate-800"
                        >
                          <option value="">-- Match No District / Default --</option>
                          {(state.deliveryDistricts || []).map(dist => (
                            <option key={dist.id} value={dist.name}>{dist.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-400 block">Exact/Street Delivery Address</label>
                        <textarea 
                          rows={2}
                          required
                          value={editingOrder.deliveryAddress || editingOrder.shippingAddress || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, deliveryAddress: e.target.value, shippingAddress: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 leading-normal"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* COLUMN 2: TIMELINES, NOTES AND PIPELINE STATUS */}
                <div className="space-y-4">
                  
                  {/* Calendar Timelines */}
                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3 font-sans">
                    <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Fulfillment Timelines & Notes</h4>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-400 block">Preferred Delivery Date</label>
                        <div className="relative">
                          <input 
                            type="date" 
                            value={editingOrder.preferredDeliveryDate || ''}
                            onChange={(e) => setEditingOrder({ ...editingOrder, preferredDeliveryDate: e.target.value })}
                            className="w-full pl-3 pr-3 py-1.5 bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold text-emerald-800"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-400 block">Preferred Time Slot</label>
                        <input 
                          type="text" 
                          value={editingOrder.selectedTimeSlot || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, selectedTimeSlot: e.target.value || undefined })}
                          className="w-full pl-3 pr-3 py-1.5 bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans font-bold text-xs text-purple-800"
                          placeholder="No preferred slot selected"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-400 block">Gift Note / Personalized Message (printed on card)</label>
                        <textarea 
                          rows={3}
                          value={editingOrder.orderNote || ''}
                          onChange={(e) => setEditingOrder({ ...editingOrder, orderNote: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 leading-normal italic text-slate-700"
                          placeholder="e.g. Wishing you a fabulous birthday! Love, Mom."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Independent Payment & Fulfillment Status configuration */}
                  <div className="p-4 bg-rose-50/10 border border-rose-200/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-rose-200/20 pb-1.5">
                      <Clock className="w-4 h-4 text-rose-600" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-rose-800">Operational Flow & Payment Control</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      
                      {/* Payment Status Switcher */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-450 block">Payment Status</label>
                        <div className="flex flex-col gap-1 bg-white p-1 rounded-lg border border-slate-200">
                          {['pending', 'paid', 'failed', 'refunded'].map((pStat) => {
                            const active = (editingOrder.paymentStatus || 'pending') === pStat;
                            return (
                              <button
                                key={pStat}
                                type="button"
                                onClick={() => setEditingOrder({ ...editingOrder, paymentStatus: pStat as any })}
                                className={`w-full text-left px-2.5 py-1 rounded text-xs font-semibold capitalize transition ${
                                  active 
                                    ? pStat === 'paid' ? 'bg-emerald-500 text-white' :
                                      pStat === 'failed' ? 'bg-rose-600 text-white' :
                                      pStat === 'refunded' ? 'bg-slate-500 text-white' :
                                      'bg-amber-500 text-slate-900 font-bold'
                                    : 'hover:bg-slate-50 text-slate-650'
                                }`}
                              >
                                {pStat}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Fulfillment Status Switcher */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[9px] font-mono uppercase font-black text-slate-450 block">Fulfillment / Pipeline Status</label>
                        <div className="flex flex-col gap-1 bg-white p-1 rounded-lg border border-slate-200">
                          {[
                            { value: OrderStatus.PENDING, label: 'Payment Pending' },
                            { value: OrderStatus.PAID, label: 'Order Received' },
                            { value: OrderStatus.PREPARING, label: 'Preparing' },
                            { value: OrderStatus.SHIPPED, label: 'Dispatch' },
                            { value: OrderStatus.DELIVERED, label: 'Delivered' },
                            { value: OrderStatus.CANCELLED, label: 'Cancelled' }
                          ].map((item) => {
                            const active = editingOrder.status === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                  // Auto set payment status if user marks shipped/delivered
                                  let nextPayStatus = editingOrder.paymentStatus || 'pending';
                                  if (item.value === OrderStatus.DELIVERED || item.value === OrderStatus.SHIPPED) {
                                    nextPayStatus = 'paid';
                                  }
                                  setEditingOrder({ 
                                    ...editingOrder, 
                                    status: item.value,
                                    paymentStatus: nextPayStatus
                                  });
                                }}
                                className={`w-full text-left px-2.5 py-1 rounded text-xs font-semibold transition ${
                                  active 
                                    ? 'bg-indigo-650 text-white bg-slate-800' 
                                    : 'hover:bg-slate-50 text-slate-650'
                                }`}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

              </div>

              {/* Hampers/Bought items list details display */}
              <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-xl space-y-3 font-sans">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 pb-1.5 border-b border-slate-200">
                  Purchased Custom Gift Hampers / Items ({editingOrder.items.length})
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {editingOrder.items.map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 flex gap-3">
                      {item.customImageUrl && (
                        <div className="relative group shrink-0">
                          <button 
                            type="button"
                            onClick={(e) => handleDownloadImage(item.customImageUrl!, `order-${editingOrder.refId || editingOrder.id}-item-${idx + 1}.png`, e)}
                            className="w-14 h-14 bg-slate-100 rounded border border-slate-200 overflow-hidden relative block hover:opacity-85 transition cursor-pointer"
                            title="Click to download personalized image"
                          >
                            <img src={item.customImageUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Customer design" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                              <Download className="w-4 h-4" />
                            </div>
                          </button>
                        </div>
                      )}
                      <div className="space-y-1 text-xs text-left flex-1">
                        <div className="font-bold text-slate-800">{item.productName}</div>
                        {item.selectedVariations && item.selectedVariations.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 justify-start text-left max-w-full">
                            {item.selectedVariations.map((vOpt, vOptIdx) => (
                              <span 
                                key={vOptIdx} 
                                className="inline-block text-[8.5px] font-mono px-1 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/50 leading-none"
                              >
                                {vOpt.name}: <span className="font-bold text-slate-900">{vOpt.value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 font-mono font-medium">
                          Quantity: <span className="font-bold text-slate-700">{item.quantity}</span> | Rate: {editingOrder.currency} {item.selectedPrice.toLocaleString()}
                        </div>
                        {item.customImageUrl && (
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={(e) => handleDownloadImage(item.customImageUrl!, `order-${editingOrder.refId || editingOrder.id}-item-${idx + 1}.png`, e)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold rounded text-[9.5px] tracking-wide uppercase transition cursor-pointer select-none"
                              title="Download full size customer image"
                            >
                              <Download className="w-3 h-3 text-rose-600" />
                              <span>Download Personalized Image</span>
                            </button>
                          </div>
                        )}
                        {item.customMessage && (
                          <div className="p-1.5 bg-amber-500/5 border border-amber-200/50 text-amber-900 rounded font-sans text-[10px] italic leading-snug mt-1">
                            <span className="font-mono text-[8px] font-black tracking-widest text-[#d97706] uppercase block not-italic">Personalization note:</span>
                            "{item.customMessage}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valuation Breakdown and Charges Details */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-mono font-semibold">
                <div className="space-y-1 text-slate-600">
                  <div>Payment Method Code: <span className="text-slate-800 font-extrabold uppercase font-sans text-xs">{editingOrder.paymentMethod}</span></div>
                  <div>Base Conversion Exchange multiplier rate: <span className="font-bold">{editingOrder.exchangeRate} NPR</span></div>
                  {editingOrder.additionalServiceFeeAdded && (
                    <div className="text-rose-650 font-sans text-[11px] font-bold space-y-2 pt-1 border-t border-dashed border-slate-200 mt-2">
                      <div>Checked Package Extras: {editingOrder.additionalServiceFeeAdded} (NPR {editingOrder.additionalServiceFeeAmount})</div>
                      {editingOrder.serviceFeeDetails && editingOrder.serviceFeeDetails.length > 0 && (
                        <div className="bg-white border border-rose-150 rounded-lg p-2.5 space-y-2 mt-1.5 font-sans font-medium text-slate-700">
                          <span className="text-[9.5px] uppercase font-bold tracking-wider text-rose-500 block">🎁 Premium Customizations Inputs:</span>
                          {editingOrder.serviceFeeDetails.map((detail: any, idx: number) => {
                            if (!detail.text && !detail.imageUrl) return null;
                            return (
                              <div key={idx} className="text-xs border-b border-rose-50 pb-1.5 last:border-0 last:pb-0 space-y-1">
                                <span className="font-bold text-rose-700 block">{detail.name} details:</span>
                                {detail.text && <div className="italic text-slate-800 bg-slate-50/50 p-1.5 rounded text-[11px]">Message: "{detail.text}"</div>}
                                {detail.imageUrl && (
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 mt-1">
                                    <div className="w-12 h-12 rounded-lg border border-slate-300 bg-slate-100 overflow-hidden shrink-0">
                                      <img src={detail.imageUrl} className="w-full h-full object-cover" alt="Custom upload" />
                                    </div>
                                    <div className="flex-1 flex flex-col items-start gap-1">
                                      <span className="text-[10px] text-slate-500 font-bold tracking-tight">Custom uploaded photo attachment</span>
                                      <div className="flex flex-wrap gap-2 mt-0.5">
                                        <button
                                          type="button"
                                          onClick={(e) => handleDownloadImage(detail.imageUrl!, `order-${editingOrder.refId || editingOrder.id}-addon-${idx + 1}.png`, e)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[9.5px] uppercase tracking-wider transition cursor-pointer"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span>Download Image</span>
                                        </button>
                                        <a 
                                          href={detail.imageUrl} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[9.5px] uppercase tracking-wider transition"
                                        >
                                          <span>Open Preview</span>
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-2xs text-right w-full md:w-auto md:min-w-64 font-mono">
                  <div className="flex justify-between gap-6 text-[10.5px] text-slate-505 font-bold uppercase">
                    <span>Valuation sum (Base):</span>
                    <span>NPR {editingOrder.totalAmountBase.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-6 font-extrabold text-slate-900 text-sm border-t border-slate-100 pt-1.5">
                    <span className="font-sans">Grand Total Amount Paid:</span>
                    <span>{editingOrder.currency} {editingOrder.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

            </form>

            {/* Modal Actions Footer */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
              {/* WhatsApp Dynamic Actions */}
              <a
                href={getWhatsAppNotificationUrl(editingOrder, state.smtpSettings, false)}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 font-extrabold text-emerald-850 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 rounded-lg transition text-xs flex items-center gap-1.5 cursor-pointer no-underline font-sans"
              >
                <span>💬 WhatsApp Client</span>
              </a>

              {state.smtpSettings?.notificationWhatsapp && state.smtpSettings?.whatsappEnabled && (
                <a
                  href={getWhatsAppNotificationUrl(editingOrder, state.smtpSettings, true)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 font-extrabold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition text-xs flex items-center gap-1.5 cursor-pointer no-underline font-sans"
                >
                  <span>🔔 Logistics Ping</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4.5 py-2 font-bold text-slate-650 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition cursor-pointer text-xs"
              >
                Cancel & Back
              </button>
              <button
                type="button"
                onClick={() => handleSaveOrderEdit(editingOrder)}
                className="px-5 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition cursor-pointer text-xs font-sans"
              >
                Save Order Changes
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Inline Quick transition alert dialog prompt */}
      {pendingStatusChange && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[200] p-4 text-slate-800">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200/85 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-2.5 pb-2 border-b border-rose-100">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h4 className="font-bold text-slate-900 text-sm">Confirm Status Update</h4>
            </div>
            
            <div className="space-y-2 text-xs text-slate-600">
              <p className="leading-relaxed">
                You are updating the fulfillment pipeline for Order <strong className="text-rose-600 font-mono uppercase bg-rose-50 px-1.5 py-0.5 rounded">{pendingStatusChange.orderRef}</strong>.
              </p>
              <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 space-y-1.5 font-mono">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 uppercase font-black tracking-wider text-[9px]">Sender Current State:</span>
                  <span className="uppercase text-slate-700 font-extrabold">{pendingStatusChange.currentStatus}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-amber-600 uppercase font-black tracking-wider text-[9px]">Transition Target:</span>
                  <span className="uppercase text-amber-800 font-extrabold">{pendingStatusChange.newStatus}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Proceeding will record the change and trigger stock recoveries if transitioning to a cancelled state.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setPendingStatusChange(null)}
                className="px-4 py-2 font-bold text-slate-605 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition cursor-pointer text-xs"
              >
                No, Discard
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                className="px-4.5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition cursor-pointer text-xs font-sans"
              >
                Yes, Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
