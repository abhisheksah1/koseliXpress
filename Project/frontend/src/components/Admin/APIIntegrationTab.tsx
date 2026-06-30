import React, { useState, useEffect } from 'react';
import { DatabaseState, APIIntegrationUser, APILog, ManualPaymentSetup, APIFieldBehavior } from '../../types';
import { 
  Key, 
  FileText, 
  Terminal, 
  Check, 
  X, 
  Lock, 
  Unlock, 
  Settings, 
  RefreshCw, 
  Trash2, 
  Edit,
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  Building, 
  User, 
  Mail, 
  Layers, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Copy, 
  Download, 
  PlayCircle,
  Eye,
  EyeOff,
  Save,
  HelpCircle,
  BarChart3,
  Calendar,
  TrendingUp,
  PieChart,
  Calculator
} from 'lucide-react';

interface APIIntegrationTabProps {
  state: DatabaseState;
  onUpdateState: (newState: DatabaseState) => void;
}

const DEFAULT_FIELDS = [
  { id: 'sender_name', label: 'Sender Name', category: 'Sender Info' },
  { id: 'sender_email', label: 'Sender Email (Receipts Target)', category: 'Sender Info' },
  { id: 'sender_mobile', label: 'Sender Mobile', category: 'Sender Info' },
  { id: 'receiver_name', label: 'Receiver Name', category: 'Receiver Info' },
  { id: 'receiver_mobile', label: 'Receiver Mobile', category: 'Receiver Info' },
  { id: 'delivery_address', label: 'Precise Delivery Address', category: 'Delivery Location' },
  { id: 'delivery_city', label: 'Delivery City / District', category: 'Delivery Location' },
  { id: 'delivery_date', label: 'Preferred Delivery Date', category: 'Fulfillment Time' },
  { id: 'delivery_slot', label: 'Delivery Time Slot ID', category: 'Fulfillment Time' },
  { id: 'gift_message', label: 'Gifting Custom Greeting Note', category: 'Personalization' },
  { id: 'occasion', label: 'Gifting Occasion Tag', category: 'Personalization' },
  { id: 'instructions', label: 'Fulfillment Courier Instructions', category: 'Personalization' },
  { id: 'service_addons', label: 'Optional Service Add-ons', category: 'Pricing Elements' },
  { id: 'coupon', label: 'Corporate Promo Coupon', category: 'Pricing Elements' },
  { id: 'internal_notes', label: 'Integration Internal Reference Note', category: 'Accounting metadata' }
];

export default function APIIntegrationTab({ state, onUpdateState }: APIIntegrationTabProps) {
  // Main loaded states from server api-store.json
  const [users, setUsers] = useState<APIIntegrationUser[]>([]);
  const [logs, setLogs] = useState<APILog[]>([]);
  const [manualPayment, setManualPayment] = useState<ManualPaymentSetup>({
    bankName: '',
    accountName: '',
    accountNumber: '',
    qrCode: '',
    instructions: '',
    whatsAppNumber: ''
  });

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Active sub-sections
  const [activeSubSection, setActiveSubSection] = useState<'users' | 'payment' | 'logs' | 'docs' | 'tester' | 'reports'>('users');

  // New/Edit User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // User entity form states
  const [formIntegrationName, setFormIntegrationName] = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'disabled'>('active');
  const [formAllowedIps, setFormAllowedIps] = useState('');

  // Whitelist configuration view states
  const [selectedUserForRestrictions, setSelectedUserForRestrictions] = useState<string | null>(null);
  const [showSecretUserId, setShowSecretUserId] = useState<string | null>(null);

  // Expanded log row
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Reports state
  const [reportPartnerId, setReportPartnerId] = useState<string>('all');
  const [reportTimeframe, setReportTimeframe] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [reportStartDate, setReportStartDate] = useState<string>('');
  const [reportEndDate, setReportEndDate] = useState<string>('');

  // API dynamic docs selected user
  const [selectedDocUserId, setSelectedDocUserId] = useState<string>('');

  // Sandbox API Tester states
  const [testerUserId, setTesterUserId] = useState<string>('');
  const [testerPayload, setTesterPayload] = useState<string>('{}');
  const [testerResponse, setTesterResponse] = useState<string>('');
  const [testerLoading, setTesterLoading] = useState(false);
  const [testerStatuscode, setTesterStatuscode] = useState<number | null>(null);
  const [checkingPrice, setCheckingPrice] = useState(false);

  // Fetch initial state from server
  const fetchAPIStoreData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/integrate/data');
      if (res.ok) {
        const store = await res.json();
        setUsers(store.users || []);
        setLogs(store.logs || []);
        if (store.manualPaymentSetup) {
          setManualPayment(store.manualPaymentSetup);
        }

        if (store.users && store.users.length > 0) {
          setSelectedDocUserId(store.users[0].id);
          setTesterUserId(store.users[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load api store', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAPIStoreData();
    // Also trigger initial catalog sync so background verification works
    syncCatalog();
  }, []);

  // Sync catalog helper
  const syncCatalog = async () => {
    try {
      await fetch('/api/integrate/sync-catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products: state.products || [],
          deliveryDistricts: state.deliveryDistricts || [],
          coupons: state.coupons || [],
          serviceFees: state.serviceFees || [],
          deliveryGroups: state.deliveryGroups || [],
          deliveryTimeSlotSettings: state.deliveryTimeSlotSettings
        })
      });
    } catch (e) {
      console.error('Catalog sync exception', e);
    }
  };

  // Save state back to server
  const saveToServer = async (
    updatedUsers: APIIntegrationUser[],
    updatedPayment?: ManualPaymentSetup,
    updatedLogs?: APILog[]
  ) => {
    try {
      setSaveStatus('Saving changes...');
      const res = await fetch('/api/integrate/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          users: updatedUsers,
          logs: updatedLogs !== undefined ? updatedLogs : logs,
          manualPaymentSetup: updatedPayment !== undefined ? updatedPayment : manualPayment,
        })
      });

      if (res.ok) {
        setSaveStatus('Changes persisted successfully! 🛡️');
        setTimeout(() => setSaveStatus(null), 3500);
      } else {
        setSaveStatus('Failed to write changes on server.');
      }
    } catch (err: any) {
      setSaveStatus(`Connection error: ${err.message}`);
    }
  };

  // Merge newly added or processed orders from API into state.orders
  const handleMergeOrders = async () => {
    try {
      const res = await fetch('/api/integrate/data');
      if (res.ok) {
        const store = await res.json();
        if (store.apiOrders && store.apiOrders.length > 0) {
          let updated = false;
          const currentOrders = [...state.orders];
          
          store.apiOrders.forEach((apiOrd: any) => {
            const exists = currentOrders.some(o => o.id === apiOrd.id || o.refId === apiOrd.refId);
            if (!exists) {
              currentOrders.unshift(apiOrd);
              updated = true;
            }
          });

          if (updated) {
            onUpdateState({
              ...state,
              orders: currentOrders
            });
            alert(`Synchronized: ${store.apiOrders.length} API placed orders merged into standard order list.`);
          } else {
            alert('Your workspace order index has already been synchronized.');
          }
        } else {
          alert('No API placed orders exist in current server queue.');
        }
      }
    } catch (e) {
      alert('Error fetching API order backlog.');
    }
  };

  // Generate random credentials
  const generateRandomKey = (prefix: 'kp' | 'ks', length: number) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = prefix + '_';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Handle open user form
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingUserId(null);
    setFormIntegrationName('');
    setFormCompanyName('');
    setFormContactPerson('');
    setFormEmail('');
    setFormUsername('');
    setFormStatus('active');
    setFormAllowedIps('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: APIIntegrationUser) => {
    setModalMode('edit');
    setEditingUserId(user.id);
    setFormIntegrationName(user.integrationName);
    setFormCompanyName(user.companyName);
    setFormContactPerson(user.contactPerson);
    setFormEmail(user.email);
    setFormUsername(user.username);
    setFormStatus(user.status);
    setFormAllowedIps(user.allowedIps || '');
    setIsModalOpen(true);
  };

  // Handle submit user form
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIntegrationName || !formCompanyName || !formUsername) {
      alert('Integration name, company, and username handles are required.');
      return;
    }

    if (modalMode === 'create') {
      const usernameExists = users.some(u => u.username.toLowerCase() === formUsername.toLowerCase().trim());
      if (usernameExists) {
        alert('API username is already assigned to another partner. Please choose another prefix.');
        return;
      }

      // Preconfigure standard default fields configuration
      const initialFields: Record<string, APIFieldBehavior> = {};
      DEFAULT_FIELDS.forEach(f => {
        initialFields[f.id] = { enabled: true, mandatory: f.id.includes('name') || f.id.includes('address') || f.id.includes('city') || f.id.includes('date') };
      });

      const newUser: APIIntegrationUser = {
        id: 'api-usr-' + Math.floor(100000 + Math.random() * 900000),
        integrationName: formIntegrationName,
        companyName: formCompanyName,
        contactPerson: formContactPerson,
        email: formEmail,
        username: formUsername.trim().toLowerCase(),
        apiKey: generateRandomKey('kp', 24),
        apiSecret: generateRandomKey('ks', 32),
        status: formStatus,
        allowedProducts: [], 
        allowedCities: [],
        fieldConfig: initialFields,
        allowedIps: formAllowedIps.trim()
      };

      const updated = [...users, newUser];
      setUsers(updated);
      saveToServer(updated);
    } else {
      const updated = users.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            integrationName: formIntegrationName,
            companyName: formCompanyName,
            contactPerson: formContactPerson,
            email: formEmail,
            status: formStatus,
            allowedIps: formAllowedIps.trim()
          };
        }
        return u;
      });
      setUsers(updated);
      saveToServer(updated);
    }

    setIsModalOpen(false);
  };

  // Delete User
  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to delete this integrated API User? Access credentials will be permanently revoked.')) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      saveToServer(updated);
    }
  };

  // Reset Keys
  const handleResetCredentials = (user: APIIntegrationUser) => {
    if (confirm(`Do you wish to regenerate the API credentials for ${user.integrationName}? Existing API scripts will fail immediately till credentials are updated.`)) {
      const updated = users.map(u => {
        if (u.id === user.id) {
          return {
            ...u,
            apiKey: generateRandomKey('kp', 24),
            apiSecret: generateRandomKey('ks', 32)
          };
        }
        return u;
      });
      setUsers(updated);
      saveToServer(updated);
    }
  };

  // Restructure Restrictions
  const activeUserEntity = users.find(u => u.id === selectedUserForRestrictions);

  // Toggle allowed product whitelist
  const handleToggleProductAllowed = (productId: string) => {
    if (!selectedUserForRestrictions) return;
    const updated = users.map(u => {
      if (u.id === selectedUserForRestrictions) {
        const list = u.allowedProducts || [];
        const updatedList = list.includes(productId) 
          ? list.filter(id => id !== productId) 
          : [...list, productId];
        return {
          ...u,
          allowedProducts: updatedList
        };
      }
      return u;
    });
    setUsers(updated);
    saveToServer(updated);
  };

  // Toggle allowed delivery city whitelist
  const handleToggleCityAllowed = (cityName: string) => {
    if (!selectedUserForRestrictions) return;
    const updated = users.map(u => {
      if (u.id === selectedUserForRestrictions) {
        const list = u.allowedCities || [];
        const updatedList = list.includes(cityName)
          ? list.filter(name => name !== cityName)
          : [...list, cityName];
        return {
          ...u,
          allowedCities: updatedList
        };
      }
      return u;
    });
    setUsers(updated);
    saveToServer(updated);
  };

  // Set explicit field rule constraint: 'mandatory' | 'optional' | 'remove'
  const handleSetFieldRule = (fieldId: string, rule: 'mandatory' | 'optional' | 'remove') => {
    if (!selectedUserForRestrictions) return;
    const updated = users.map(u => {
      if (u.id === selectedUserForRestrictions) {
        const configs = u.fieldConfig || {};
        const newFieldRule = {
          enabled: rule !== 'remove',
          mandatory: rule === 'mandatory'
        };
        return {
          ...u,
          fieldConfig: {
            ...configs,
            [fieldId]: newFieldRule
          }
        };
      }
      return u;
    });
    setUsers(updated);
    saveToServer(updated);
  };

  // Set all items allowed/cleared helper
  const handleClearWhiteLists = (type: 'products' | 'cities') => {
    if (!selectedUserForRestrictions) return;
    const updated = users.map(u => {
      if (u.id === selectedUserForRestrictions) {
        return {
          ...u,
          [type === 'products' ? 'allowedProducts' : 'allowedCities']: []
        };
      }
      return u;
    });
    setUsers(updated);
    saveToServer(updated);
  };

  const handleAllowAllProducts = () => {
    if (!selectedUserForRestrictions) return;
    const allIds = state.products.map(p => p.id);
    const updated = users.map(u => {
      if (u.id === selectedUserForRestrictions) {
        return {
          ...u,
          allowedProducts: allIds
        };
      }
      return u;
    });
    setUsers(updated);
    saveToServer(updated);
  };

  const handleAllowAllCities = () => {
    if (!selectedUserForRestrictions) return;
    const allDistricts = state.deliveryDistricts?.map(d => d.name) || ['Kathmandu', 'Lalitpur', 'Bhaktapur'];
    const updated = users.map(u => {
      if (u.id === selectedUserForRestrictions) {
        return {
          ...u,
          allowedCities: allDistricts
        };
      }
      return u;
    });
    setUsers(updated);
    saveToServer(updated);
  };

  // Manual payment save
  const handleSavePaymentSetup = (e: React.FormEvent) => {
    e.preventDefault();
    saveToServer(users, manualPayment);
  };

  const clearLogsHistory = () => {
    if (confirm('Clear all API access activity records permanently from backend database?')) {
      saveToServer(users, manualPayment, []);
      setLogs([]);
    }
  };

  // Real-time generator of Dynamic Payload Schema for Selected User
  const getDynamicDocs = (userId: string) => {
    const usr = users.find(u => u.id === userId);
    if (!usr) return 'No documentation available.';

    const configs = usr.fieldConfig || {};
    const whitelistedProducts = usr.allowedProducts && usr.allowedProducts.length > 0 
      ? state.products.filter(p => usr.allowedProducts?.includes(p.id))
      : state.products;

    const whitelistedCities = usr.allowedCities && usr.allowedCities.length > 0
      ? usr.allowedCities
      : (state.deliveryDistricts?.map(d => d.name) || ['Kathmandu', 'Lalitpur', 'Bhaktapur']);

    // Build markdown documentation dynamically
    let docs = `# Dynamic API Order Integration Specifications: **${usr.integrationName}**
---
**Company Group Name:** ${usr.companyName}
**Fulfillment Node:** Nepal Base (NPR Currency Settlement)
**Integrated Partner Handle:** \`${usr.username}\`

This documentation is generated in real-time according to the active whitelists and configuration options specified by the Admin.

---

## 1. Gateway Connection Parameters
The portal uses standard SSL headers or query credentials for authentication. 

### A. Live Products & Price Retrieval
Allows you or your downstream API partners to dynamically query active catalog items and live pricing (discount prices, Base prices, variations, stock counters). This ensures that **whenever you update product prices in the Admin panel, they are instantly updated for API users in real time, with no manual document sharing needed.**

* **Endpoint URL:** 
  \`\`\`http
  GET https://ais-dev-6wvxuovayenlwntbszqp7m-942183571108.asia-southeast1.run.app/api/v1/products
  \`\`\`
* **Query Parameters Alternative:** (Useful for lightweight integrations or partner sharing)
  \`https://ais-dev-6wvxuovayenlwntbszqp7m-942183571108.asia-southeast1.run.app/api/v1/products?api_key=\${usr.apiKey}&api_secret=[YOUR_API_SECRET]\`

### B. Live Price Calculation & Verification
Provides real-time subtotal, discounts, service addons, and delivery calculations. Calling this endpoint allows you to pre-qualify prices. Your systems can verify individual item rates dynamically to guarantee zero order errors.

* **Endpoint URL:**
  \`\`\`http
  POST https://ais-dev-6wvxuovayenlwntbszqp7m-942183571108.asia-southeast1.run.app/api/v1/check-price
  \`\`\`
* **Headers Required:**
  * \`Content-Type\`: \`application/json\`
  * \`x-api-key\`: \`\${usr.apiKey}\`
  * \`x-api-secret\`: \`[YOUR_API_SECRET]\`

### C. Order Submission
* **Submit Endpoint URL:** 
  \`\`\`http
  POST https://ais-dev-6wvxuovayenlwntbszqp7m-942183571108.asia-southeast1.run.app/api/v1/orders
  \`\`\`

* **Transport Headers Required:**
  * \`Content-Type\`: \`application/json\`
  * \`x-api-key\`: \`\${usr.apiKey}\`
  * \`x-api-secret\`: \`[REDACTED_API_SECRET_KEY]\` (Reset / fetch from admin)

* **IP Address Network Security Restrictions (Active whitelist):**
  * Active Network Ingress Whitelisted IP addresses: \`\${usr.allowedIps && usr.allowedIps.trim() !== '' ? usr.allowedIps : '🔓 Any calling IP address allowed (Unrestricted)'}\`
  * *Note: Orders triggered outside these authorized addresses will result in a \`403 Security Access Blocked\` error.*

---

## 2. Order Submission Payload (JSON Structure)

Here is your custom-structured JSON payload. Note that fields marked down as mandatory are STRICTLY validated on the server.

\`\`\`json
{
`;

    // Sender object
    let hasSenderInfo = false;
    let senderLines = [];
    if (configs['sender_name']?.enabled) {
      senderLines.push(`    "name": "Arjun Silwal"${configs['sender_name'].mandatory ? ' // REQUIRED' : ' // Optional'}`);
      hasSenderInfo = true;
    }
    if (configs['sender_email']?.enabled) {
      senderLines.push(`    "email": "corporate-receipt@domain.com"${configs['sender_email'].mandatory ? ' // REQUIRED' : ' // Optional'}`);
      hasSenderInfo = true;
    }
    if (configs['sender_mobile']?.enabled) {
      senderLines.push(`    "mobile": "+9779841234567"${configs['sender_mobile'].mandatory ? ' // REQUIRED' : ' // Optional'}`);
      hasSenderInfo = true;
    }

    if (hasSenderInfo) {
      docs += `  "sender": {\n${senderLines.join(',\n')}\n  },\n`;
    }

    // Receiver object
    let hasReceiverInfo = false;
    let receiverLines = [];
    if (configs['receiver_name']?.enabled) {
      receiverLines.push(`    "name": "Pranisha Chalise"${configs['receiver_name'].mandatory ? ' // REQUIRED' : ' // Optional'}`);
      hasReceiverInfo = true;
    }
    if (configs['receiver_mobile']?.enabled) {
      receiverLines.push(`    "mobile": "+9779801234567"${configs['receiver_mobile'].mandatory ? ' // REQUIRED' : ' // Optional'}`);
      hasReceiverInfo = true;
    }

    if (hasReceiverInfo) {
      docs += `  "receiver": {\n${receiverLines.join(',\n')}\n  },\n`;
    }

    // Delivery address and city
    if (configs['delivery_address']?.enabled) {
      docs += `  "delivery_address": "House No 12, Lazimpat Marg"${configs['delivery_address'].mandatory ? ' // REQUIRED' : ' // Optional'},\n`;
    }
    if (configs['delivery_city']?.enabled) {
      docs += `  "delivery_city": "${whitelistedCities[0] || 'Kathmandu'}"${configs['delivery_city'].mandatory ? ' // REQUIRED' : ' // Optional'},\n`;
    }

    // Order Details subobject
    let hasOrderDetails = false;
    let orderLines = [];
    if (configs['delivery_date']?.enabled) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const toStr = tomorrow.toISOString().split('T')[0];
      orderLines.push(`    "delivery_date": "${toStr}"${configs['delivery_date'].mandatory ? ' // REQUIRED' : ' // Optional'}`);
      hasOrderDetails = true;
    }
    if (configs['delivery_slot']?.enabled) {
      orderLines.push(`    "delivery_slot": "Morning slot (9:00 AM - 12:00 PM)"${configs['delivery_slot'].mandatory ? ' // REQUIRED' : ' // Optional'}`);
      hasOrderDetails = true;
    }
    if (configs['gift_message']?.enabled) {
      orderLines.push(`    "gift_message": "A handwritten message to my sibling - Max 3-10 words"${configs['gift_message'].mandatory ? ' // REQUIRED' : ' // Optional'}`);
      hasOrderDetails = true;
    }
    if (configs['occasion']?.enabled) {
      orderLines.push(`    "occasion": "Birthday Celebration"${configs['occasion'].mandatory ? ' // REQUIRED' : ' // Optional'}`);
      hasOrderDetails = true;
    }
    if (configs['instructions']?.enabled) {
      orderLines.push(`    "instructions": "Call before dispatch, handle glass fragile handle with care"${configs['instructions'].mandatory ? ' // REQUIRED font size 10' : ' // Optional'}`);
      hasOrderDetails = true;
    }

    if (hasOrderDetails) {
      docs += `  "order": {\n${orderLines.join(',\n')}\n  },\n`;
    }

    // Fixed currency validation note
    docs += `  "currency": "NPR", // NPR is the only allowed currency. Submitted currencies other than NPR return 400.\n`;

    // Line items
    docs += `  "items": [\n    {\n      "product_id": "${whitelistedProducts[0]?.id || 'prod-sku-example'}", // Whitelisted product ID / SKU\n      "quantity": 1,\n      "variations": [\n        {\n          "name": "Flavor",\n          "value": "Chocolate Truffle Extra Special"\n        }\n      ]\n    }\n  ],\n`;

    // Additional options
    let hasAdditional = false;
    let addLines = [];
    if (configs['service_addons']?.enabled) {
      addLines.push(`    "service_addons": ["fee_wrapping"] // Array of service fee IDs`);
      hasAdditional = true;
    }
    if (configs['coupon']?.enabled) {
      addLines.push(`    "coupon": "HAPPY10" // discount coupon active code`);
      hasAdditional = true;
    }
    if (configs['internal_notes']?.enabled) {
      addLines.push(`    "internal_notes": "Internal order reference ID group 38"`);
      hasAdditional = true;
    }

    if (hasAdditional) {
      docs += `  "additional": {\n${addLines.join(',\n')}\n  }\n`;
    } else {
      // slice trailing comma
      docs = docs.slice(0, -2) + '\n';
    }

    docs += `}\n\`\`\`

---

## 3. Product Access Scope (Whitelisted Catalog)
You are permitted to send orders for the following products only. Submitting non-permitted IDs yields a \`403 Product Not Allowed\` error on checkout.

| Product ID | SKU | Product Base Name | Base Price |
|---|---|---|---|
${whitelistedProducts.map(p => `| \`${p.id}\` | \`${p.sku}\` | ${p.name} | NPR ${p.price.toLocaleString()} |`).join('\n')}

---

## 4. Delivery Whitelist Locations
Fulfillment services exist in these locations only. Non-whitelist cities return \`403 Delivery Location Not Allowed\`.

${whitelistedCities.map(c => `* **${c}**`).join('\n')}

---

## 5. Payment Rule (Automatic Settlement Instructions)
API orders automatically inherit:
1. **Currency:** \`NPR\` (Base Nepalese rupee)
2. **Payment Method:** \`Manual Bank Transfer / QR Pay\`
3. **Checkout Status:** \`pending\` (Status: Pending Payment)

Upon submission, the server returns manual account details. Processing will be locked until confirmation receipt is loaded.

**Manual accounts configured currently by Super Admin:**
* **Receiving Institution:** ${manualPayment.bankName || 'N/A'}
* **Beneficiary Name:** ${manualPayment.accountName || 'N/A'}
* **Account Number:** ${manualPayment.accountNumber || 'N/A'}
* **CSR WhatsApp hotline:** ${manualPayment.whatsAppNumber || 'N/A'}

---

## 6. Response Codes Reference

* **\`201 Created\`**: Order scheduled successfully. Returns order tracking ID and payment instructions block.
* **\`400 Required Field Missing\`**: Check missing payload parameters.
* **\`401 Access Denied\`**: Invalid key or secret headers.
* **\`403 Integration User Disabled\`**: Blocked corporate credentials.
* **\`403 Product Not Allowed\`**: Product submitted falls outside whitelisted catalog scope.
* **\`403 Delivery Location Not Allowed\`**: Submitted city falls outside district coverage scope.
* **\`444 Product Not Found\`**: Submitted product ID is not loaded on active catalog.
`;

    return docs;
  };

  // Markdown copy and download helpers
  const handleCopyDocs = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('API Documentation markdown content copied successfully to clipboard.');
  };

  const handleDownloadDocs = (username: string, text: string) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `API_Specs_${username}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadOperationsManual = (username: string) => {
    const text = `# KOSELI API GATEWAY: PARTNER OPERATIONS MANUAL
Document ID: KOSELI-OM-2026-V1
Target Integration: ${username || 'Partner System'}
Status: Fully Confirmed
Last Updated: June 2026

---

## INTRODUCTORY OVERVIEW
Welcome to the Koseli gifting API integration network. This manual outlines operational procedures, manual payment reconciliation steps, and general support channels for corporate partners automating order placements.

---

## 1. TRANSACTION FLOW STANDARD OPERATING PROCEDURES (SOP)
API order submissions are processed in real-time according to the following sequence:

1. **Payload Prep:** Your system compiles orders according to the dynamic technical JSON structure whitelisted for your account.
2. **Submission:** Order is dispatched via SSL secure HTTPS POST call.
3. **Receipt Validation:** Our gateway performs 4 independent layers of validation:
   - Credentials (API Key & API Secret)
   - Traffic source network (IP address security gate)
   - Allowed items (Custom assigned catalog checking)
   - Delivery destinations (Nepal district checking)
4. **Order Staging (Status: pending):** Successfully passed orders are initialized in our queue, locked in 'pending_payment' state.
5. **Reconciliation:** Your finance team uploads payment confirmations using the manual account configuration keys or reaches our admin group on WhatsApp with API reference IDs.
6. **Processing & Fulfillment:** Koseli admins verify the transfer ledger, transition orders to "paid" state, and schedule courier routing immediately.

---

## 2. MANUAL PAYMENTS COORDINATION GUIDELINES
Because API orders inherit manual bank wire & QR settlements, instant status updates are critical. 

### Core Payment Credentials:
- **Receiving Bank:** ${manualPayment.bankName || 'Global IME Bank Nepal'}
- **Account Title:** ${manualPayment.accountTitle || manualPayment.accountName || 'Koseli Gifts & Cards Private Limited'}
- **Card/Account Number:** ${manualPayment.accountNumber || '0129302194821'}
- **WhatsApp Support hotline:** ${manualPayment.whatsAppNumber || '+977-9801-000000'}

### Daily Reconciliation Workflow:
- Each response payload from a successful order creation includes our system **order ID** (e.g. \`KS-API-948212\`) and **total amount due**.
- Ensure bank wire transfer slips reference the exact API order serial reference in the Remarks field (e.g., "Koseli API KS-API-948212").
- Dispatch wire screenshots directly to our WhatsApp operations team for zero-delay approval.

---

## 3. EDGE CASES & ERROR CONFLICTS RESOLUTION
* **Invalid Delivery Address:** Ensure the delivery address is clear and descriptive with landmarks. Call the administrator if orders are held in 'pending' indefinitely.
* **Out of Stock Inventory:** Product allocations are reserved on a first-come, first-served basis. Sync catalogs daily using our products lookup endpoints to minimize out of stock rejections.
* **Handdrawn notes:** "Premium Add-ons & Wrapping" notes (e.g. custom hand written messages) are restricted to 3 - 10 words. Ensure your upstream systems validate length constraints before submitting.

---
© 2026 Koseli Gifting Solutions (Private) Ltd. Nepal.
All rights reserved. Unauthorized distribution is prohibited.`;

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Koseli_API_Gateway_User_Manual_${username || 'Partner'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSecurityManual = (username: string) => {
    const text = `# KOSELI API GATEWAY: PARTNER CYBER-SECURITY POLICY
Document ID: KOSELI-SEC-2026-V1
Target Integration: ${username || 'Partner System'}
Classification: Confidential - Partner Shared
Last Updated: June 2026

---

## OVERVIEW & REGULATORY SCOPE
Secure automated transactions protect Koseli, our corporate partners, and end recipient consumers in Nepal. This security guideline regulates keys protection, IP whitelisting constraints, and network access requirements.

---

## 1. THE IP SECURITY SHIELD (NETWORK CONTROLS)
To prevent unauthorized dispatch of payloads and fake order transactions:
- **Restriction Gate:** Network ingress controls filter traffic based on partner router source IPs.
- **Rules Configuration:** Super Admin registers your company's stable gateway IPv4 addresses. Packets originating from unlisted IPs yield a hard \`433 Security Access Blocked / 403 Forbidden\` response.
- **Dynamic IPs:** If your development server uses dynamic host allocation (e.g. AWS or dynamic CDN), configure your outbound traffic through a static proxy tunnel or contact Koseli Admin to whitelist your current IP address range.

---

## 2. API CREDENTIALS MANAGEMENT & ROTATION
Your profile consists of two distinct components:
1. **API Key (x-api-key):** Acts as a public client identification header.
2. **API Secret (x-api-secret):** Acts as a highly confidential cryptographic password.

### MANDATORY SECURITY MATRICES:
- **Encryption:** Never store API secrets in cleartext format inside public source repositories (e.g. GitHub public files). Always ingest credentials via environment variables (\`process.env\`).
- **Rotation Schedule:** We recommend resetting credentials every 180 days. This is easily achieved in our panel via the "Reset API Credentials" action, which immediately regenerates keys.
- **SSL Requirements:** All API gateway transactions are transmitted strictly over TLS 1.3. Plain text HTTP calls are permanently ... (Enforced SSL)

---

## 3. AUDITING & ANOMALOUS LOG INVESTIGATIONS
- **Real-Time Logs:** Use the "API Logs" portal inside the main dashboard to check your payload payloads, transmission timestamps, source IPs, and responding status messages.
- **Conflict Tracking:** If your logs reveal high status 401 (Unauthorized) blocks, trigger a credentials verification or audit your developer setup for configuration drifting.
- **Intrusion Response:** If your system detects a database leak or credential exposure on your side, notify Koseli security engineers immediately to disable the user profile or reset your credentials.

---
© 2026 Koseli Gifting Solutions (Private) Ltd. Nepal.
All rights reserved. SSL Connection Enforced.`;

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Koseli_API_Gateway_Security_Manual_${username || 'Partner'}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check product price and update editor parameters
  const handleCheckPrice = async () => {
    const targetUser = users.find(u => u.id === testerUserId);
    if (!targetUser) {
      alert('Please select an active integration user.');
      return;
    }

    try {
      setCheckingPrice(true);
      setTesterResponse('Contacting Webstore Pricing Engine at /api/v1/check-price ...');
      setTesterStatuscode(null);

      let parsedPayload: any = {};
      try {
        parsedPayload = JSON.parse(testerPayload);
      } catch (err) {
        setTesterResponse('JSON Error: Your test payload contains invalid syntax spacing.');
        setCheckingPrice(false);
        return;
      }

      const res = await fetch('/api/v1/check-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': targetUser.apiKey,
          'x-api-secret': targetUser.apiSecret
        },
        body: JSON.stringify(parsedPayload)
      });

      setTesterStatuscode(res.status);
      const data = await res.json();
      setTesterResponse(JSON.stringify(data, null, 2));

      if (res.status === 200 && data.success && data.items) {
        // Map resolved prices back into the items array of our sandbox textarea payload
        if (parsedPayload.items && Array.isArray(parsedPayload.items)) {
          parsedPayload.items = parsedPayload.items.map((it: any) => {
            const match = data.items.find((x: any) => x.product_id === it.product_id || x.sku === it.product_id);
            if (match) {
              return {
                ...it,
                price: match.unit_price,
                name_preview: match.name
              };
            }
            return it;
          });
          // Write back the updated payload containing Webstore validated prices
          setTesterPayload(JSON.stringify(parsedPayload, null, 2));
        }
      }

      // Auto-reload logs after price checks too
      const logsRes = await fetch('/api/integrate/data');
      if (logsRes.ok) {
        const store = await logsRes.json();
        setLogs(store.logs || []);
      }
    } catch (err: any) {
      setTesterResponse(`Price Check Error: Network exchange failed: ${err.message}`);
    } finally {
      setCheckingPrice(false);
    }
  };

  // Run tester sandbox request
  const handleRunTester = async () => {
    const targetUser = users.find(u => u.id === testerUserId);
    if (!targetUser) {
      alert('Please select an active integration user.');
      return;
    }

    try {
      setTesterLoading(true);
      setTesterResponse('Initiating sandbox transmission to http://localhost:3000/api/v1/orders ...');
      setTesterStatuscode(null);

      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(testerPayload);
      } catch (err) {
        setTesterResponse('JSON Error: Your test payload contains invalid syntax spacing.');
        setTesterLoading(false);
        return;
      }

      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': targetUser.apiKey,
          'x-api-secret': targetUser.apiSecret
        },
        body: JSON.stringify(parsedPayload)
      });

      setTesterStatuscode(res.status);
      const data = await res.json();
      setTesterResponse(JSON.stringify(data, null, 2));
      
      // Auto-reload API logs after tester runs
      const logsRes = await fetch('/api/integrate/data');
      if (logsRes.ok) {
        const store = await logsRes.json();
        setLogs(store.logs || []);
      }
    } catch (err: any) {
      setTesterResponse(`Sandbox Error: Network exchange failed: ${err.message}`);
    } finally {
      setTesterLoading(false);
    }
  };

  // Auto-load template helper in sandbox for selected user
  const handleLoadTesterTemplate = (userId: string) => {
    const usr = users.find(u => u.id === userId);
    if (!usr) return;

    const configs = usr.fieldConfig || {};
    const whitelistedProducts = usr.allowedProducts && usr.allowedProducts.length > 0 
      ? state.products.filter(p => usr.allowedProducts?.includes(p.id))
      : state.products;

    const whitelistedCities = usr.allowedCities && usr.allowedCities.length > 0
      ? usr.allowedCities
      : (state.deliveryDistricts?.map(d => d.name) || ['Kathmandu', 'Lalitpur', 'Bhaktapur']);

    const samplePayload: any = {};

    // Sender
    if (configs['sender_name']?.enabled || configs['sender_email']?.enabled || configs['sender_mobile']?.enabled) {
      samplePayload.sender = {};
      if (configs['sender_name']?.enabled) samplePayload.sender.name = "Ram Bahadur";
      if (configs['sender_email']?.enabled) samplePayload.sender.email = "ram.secured@gmail.com";
      if (configs['sender_mobile']?.enabled) samplePayload.sender.mobile = "+9779841000000";
    }

    // Receiver
    if (configs['receiver_name']?.enabled || configs['receiver_mobile']?.enabled) {
      samplePayload.receiver = {};
      if (configs['receiver_name']?.enabled) samplePayload.receiver.name = "Sita Kumari";
      if (configs['receiver_mobile']?.enabled) samplePayload.receiver.mobile = "+9779801000000";
    }

    // Cities / address
    if (configs['delivery_address']?.enabled) {
      samplePayload.delivery_address = "Pipal Tree Chowk House 5";
    }
    if (configs['delivery_city']?.enabled) {
      samplePayload.delivery_city = whitelistedCities[0] || "Kathmandu";
    }

    // Order
    if (configs['delivery_date']?.enabled || configs['delivery_slot']?.enabled || configs['gift_message']?.enabled || configs['occasion']?.enabled || configs['instructions']?.enabled) {
      samplePayload.order = {};
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (configs['delivery_date']?.enabled) samplePayload.order.delivery_date = tomorrow.toISOString().split('T')[0];
      if (configs['delivery_slot']?.enabled) samplePayload.order.delivery_slot = "Evening slot (4 PM - 7 PM)";
      if (configs['gift_message']?.enabled) samplePayload.order.gift_message = "Best wishes on your milestone!";
      if (configs['occasion']?.enabled) samplePayload.order.occasion = "Anniversary";
      if (configs['instructions']?.enabled) samplePayload.order.instructions = "Ring bell twice, fragile package";
    }

    // Currency must be NPR
    samplePayload.currency = "NPR";

    // Products
    samplePayload.items = [
      {
        product_id: whitelistedProducts[0]?.id || "example-id",
        quantity: 1
      }
    ];

    // Additional
    if (configs['service_addons']?.enabled || configs['coupon']?.enabled || configs['internal_notes']?.enabled) {
      samplePayload.additional = {};
      if (configs['service_addons']?.enabled) samplePayload.additional.service_addons = [];
      if (configs['coupon']?.enabled) samplePayload.additional.coupon = "";
      if (configs['internal_notes']?.enabled) samplePayload.additional.internal_notes = "Corporate Batch Ref 010";
    }

    setTesterPayload(JSON.stringify(samplePayload, null, 2));
    setTesterResponse('');
    setTesterStatuscode(null);
  };

  useEffect(() => {
    if (testerUserId) {
      handleLoadTesterTemplate(testerUserId);
    }
  }, [testerUserId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-slate-100 min-h-[350px]">
        <RefreshCw className="w-8 h-8 text-rose-600 animate-spin mb-4" />
        <p className="text-slate-500 font-semibold text-xs">Accessing API Integration settings on Node server...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Tab Area banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 text-left">
          <span className="text-[10px] bg-rose-600/25 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">B2B Core Gateway</span>
          <h2 className="text-xl font-bold tracking-tight">API Order Acceptance Platform</h2>
          <p className="text-xs text-slate-350 max-w-xl font-medium">Configure corporate partner credentials, whitelists, payment gateways, and dynamically generate integration documents in real-time.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 text-xs shrink-0 self-start md:self-center">
          <button
            onClick={handleMergeOrders}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition shadow-md shadow-rose-600/10 cursor-pointer"
          >
            Pull & Sync API Orders 🔄
          </button>
          <button
            onClick={() => { fetchAPIStoreData(); syncCatalog(); }}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700"
            title="Refresh integration cache"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="p-3 bg-slate-900 text-slate-100 rounded-xl flex items-center gap-2 text-xs font-bold border border-rose-500/10 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Settings section selector bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
        <button
          onClick={() => { setActiveSubSection('users'); setSelectedUserForRestrictions(null); }}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 shrink-0 transition-colors cursor-pointer ${
            activeSubSection === 'users' && !selectedUserForRestrictions
              ? 'border-rose-600 text-rose-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          API Integration Users ({users.length})
        </button>
        
        {selectedUserForRestrictions && (
          <button
            className="px-4 py-2.5 text-xs font-extrabold border-b-2 shrink-0 border-rose-600 text-rose-600 bg-rose-50/50 flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5 text-rose-600 animate-spin" />
            Config: {activeUserEntity?.integrationName} Whitelists
          </button>
        )}

        <button
          onClick={() => { setActiveSubSection('docs'); setSelectedUserForRestrictions(null); }}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 shrink-0 transition-colors cursor-pointer ${
            activeSubSection === 'docs'
              ? 'border-rose-600 text-rose-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Dynamic API Docs
        </button>

        <button
          onClick={() => { setActiveSubSection('tester'); setSelectedUserForRestrictions(null); }}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 shrink-0 transition-colors cursor-pointer ${
            activeSubSection === 'tester'
              ? 'border-rose-600 text-rose-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Interactive API Tester 🧪
        </button>

        <button
          onClick={() => { setActiveSubSection('logs'); setSelectedUserForRestrictions(null); }}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 shrink-0 transition-colors cursor-pointer ${
            activeSubSection === 'logs'
              ? 'border-rose-600 text-rose-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          API Access Logs ({logs.length})
        </button>

        <button
          onClick={() => { setActiveSubSection('reports'); setSelectedUserForRestrictions(null); }}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 shrink-0 transition-colors cursor-pointer ${
            activeSubSection === 'reports'
              ? 'border-rose-600 text-rose-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Partner Reports & Analytics 📊
        </button>

        <button
          onClick={() => { setActiveSubSection('payment'); setSelectedUserForRestrictions(null); }}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 shrink-0 transition-colors cursor-pointer ${
            activeSubSection === 'payment'
              ? 'border-rose-600 text-rose-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Manual Bank Setup
        </button>
      </div>

      {/* Main Sub Sec      {/* Subsection: Users Registry */}
      {activeSubSection === 'users' && !selectedUserForRestrictions && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-150">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>Integration Credentials Index</span>
            </h3>
            <button
              onClick={handleOpenCreateModal}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Integration Partner
            </button>
          </div>

          {/* Setup Walkthrough Helper Guide Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden text-left space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-600/20 text-rose-400 rounded-xl">
                <Settings className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">Merchant Partner Customization gateway</h4>
                <p className="text-[13px] font-extrabold text-slate-100">How to Setup Product Restrictions, Delivery Locations Whitelist & Field Requirements:</p>
              </div>
            </div>
            
            <p className="text-[11.5px] text-slate-350 leading-relaxed max-w-3xl">
              Each API integration partner can be locked down with distinct rules. To customize an integration partner:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] text-slate-300 font-semibold leading-normal">
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-750/30">
                <span className="text-rose-400 block font-bold mb-1">🎁 1. Allowed Products Setup</span>
                Check specific catalog items. If checked, the partner cannot order any items outside this exclusive set.
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-750/30">
                <span className="text-rose-400 block font-bold mb-1">📍 2. Delivery Location Whitelist</span>
                Restrict accepted orders to certain districts (e.g. Kathmandu, Lalitpur). Other inputs trigger a 403 error.
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-750/30">
                <span className="text-rose-400 block font-bold mb-1">📋 3. Dynamic Field Customization</span>
                Set field rules: <strong className="text-white">Mandatory Filled</strong>, <strong className="text-white">Non-Mandatory</strong>, or <strong className="text-white">Remove</strong> (hides from scheme & docs).
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-bold bg-slate-950/40 px-3 py-1.5 rounded-lg inline-block">
              💡 Action: Click the big rose-colored button <strong className="text-rose-400">"⚙️ Setup Restrictions & Field Requirements"</strong> on any partner card below to configure.
            </p>
          </div>

          {users.length === 0 ? (
            <div className="bg-white border border-slate-150 rounded-xl p-10 text-center space-y-3">
              <Info className="w-10 h-10 text-slate-350 mx-auto" />
              <p className="text-slate-500 text-xs font-bold">No active API integration accounts are configured currently on your platform.</p>
              <button
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Create API User Credential
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {users.map(usr => (
                <div key={usr.id} className="bg-white rounded-xl border border-slate-150 shadow-xs p-5 space-y-4 text-left hover:border-rose-200 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{usr.integrationName}</h4>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded font-mono ${
                          usr.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : 'bg-rose-50 text-rose-600'
                        }`}>
                          {usr.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-semibold">{usr.companyName} | Contact: {usr.contactPerson || 'None'} ({usr.email || 'None'})</p>
                    </div>

                    <div className="flex flex-wrap gap-1 items-center text-xs">
                      {/* VERY PROMINENT & HIGH CONTRAST CONFIG BUTTON */}
                      <button
                        onClick={() => setSelectedUserForRestrictions(usr.id)}
                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-600/20 shrink-0 text-[11px]"
                      >
                        <Settings className="w-3.5 h-3.5 animate-spin-slow" />
                        <span>⚙️ Setup Restrictions & Field Requirements</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(usr)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                        title="Edit Partner info"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleResetCredentials(usr)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-amber-600 rounded-lg transition cursor-pointer"
                        title="Reset credentials API keys"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(usr.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                        title="Delete User credentials and block access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Keys section */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-150 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450 uppercase text-[9px] font-extrabold tracking-wider">Access Username:</span>
                      <span className="font-bold text-slate-800">{usr.username}</span>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-450 uppercase text-[9px] font-extrabold tracking-wider">API key (x-api-key):</span>
                      <span className="bg-slate-200/60 px-2 py-0.5 rounded text-slate-700 break-all text-right">{usr.apiKey}</span>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-450 uppercase text-[9px] font-extrabold tracking-wider">API Secret (x-api-secret):</span>
                      <div className="flex items-center gap-1.5">
                        {showSecretUserId === usr.id ? (
                          <span className="bg-slate-200 text-slate-800 border border-slate-300 font-bold px-2 py-0.5 rounded select-all break-all text-right">{usr.apiSecret}</span>
                        ) : (
                          <span className="text-slate-400">••••••••••••••••••••••••••••••••</span>
                        )}
                        <button
                          onClick={() => setShowSecretUserId(showSecretUserId === usr.id ? null : usr.id)}
                          className="text-slate-450 hover:text-slate-700 text-[10px] uppercase font-bold tracking-tight underline focus:outline-none cursor-pointer"
                        >
                          {showSecretUserId === usr.id ? 'Hide' : 'Reveal'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary of limits */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedUserForRestrictions(usr.id)}
                      className="bg-slate-50/60 border border-slate-100 hover:border-rose-300 hover:bg-rose-50/10 rounded-lg p-2.5 text-left transition-all cursor-pointer group"
                    >
                      <span className="text-[10px] text-slate-400 block font-bold group-hover:text-rose-600 flex items-center justify-between">
                        <span>WHITELISTED PRODUCTS</span>
                        <span className="text-[9px] text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">Edit ⚙️</span>
                      </span>
                      <span className="font-bold text-slate-700 block mt-0.5">
                        {usr.allowedProducts && usr.allowedProducts.length > 0 
                          ? `${usr.allowedProducts.length} Selected Limits` 
                          : 'All Catalog Products (Global)'}
                      </span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setSelectedUserForRestrictions(usr.id)}
                      className="bg-slate-50/60 border border-slate-100 hover:border-rose-300 hover:bg-rose-50/10 rounded-lg p-2.5 text-left transition-all cursor-pointer group"
                    >
                      <span className="text-[10px] text-slate-400 block font-bold group-hover:text-rose-600 flex items-center justify-between">
                        <span>WHITELISTED DESTINATIONS</span>
                        <span className="text-[9px] text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">Edit ⚙️</span>
                      </span>
                      <span className="font-bold text-slate-700 block mt-0.5">
                        {usr.allowedCities && usr.allowedCities.length > 0
                          ? `${usr.allowedCities.length} Selected Districts`
                          : 'All Nepal Cities (Global)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedUserForRestrictions(usr.id)}
                      className="bg-slate-50/60 border border-slate-100 hover:border-rose-300 hover:bg-rose-50/10 rounded-lg p-2.5 text-left transition-all cursor-pointer group"
                    >
                      <span className="text-[10px] text-slate-400 block font-bold group-hover:text-rose-600 flex items-center justify-between">
                        <span>MANDATORY & REMOVED FIELDS</span>
                        <span className="text-[9px] text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">Customize ⚙️</span>
                      </span>
                      <span className="font-bold text-slate-700 block mt-0.5">
                        {usr.fieldConfig 
                          ? `${Object.values(usr.fieldConfig).filter((f: any) => f.enabled && f.mandatory).length} Mandatory, ${Object.values(usr.fieldConfig).filter((f: any) => !f.enabled).length} Removed`
                          : 'Standard defaults'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedUserForRestrictions(usr.id)}
                      className="bg-slate-50/60 border border-slate-100 hover:border-rose-300 hover:bg-rose-50/10 rounded-lg p-2.5 text-left transition-all cursor-pointer group"
                    >
                      <span className="text-[10px] text-slate-400 block font-bold group-hover:text-rose-600 flex items-center justify-between">
                        <span>IP SECURITY WHITELIST</span>
                        <span className="text-[9px] text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">Lock 🔒</span>
                      </span>
                      <span className="font-bold text-slate-700 truncate block mt-0.5" title={usr.allowedIps || 'No IP restrictions (Open Access)'}>
                        {usr.allowedIps && usr.allowedIps.trim() !== '' && usr.allowedIps !== '*'
                          ? usr.allowedIps
                          : 'No IP restriction (🔓 Open)'}
                      </span>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subsection: Restrictions Config page */}
      {selectedUserForRestrictions && activeUserEntity && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-150">
            <div className="text-left space-y-1">
              <span className="text-slate-450 font-bold uppercase text-[9px] tracking-wider block">Currently configuring restriction lists for:</span>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>{activeUserEntity.integrationName}</span>
                <span className="text-xs bg-slate-100 text-slate-500 py-0.5 px-2 rounded-full font-mono font-bold">@{activeUserEntity.username}</span>
              </h3>
            </div>
            
            <button
              onClick={() => setSelectedUserForRestrictions(null)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition font-bold text-xs cursor-pointer"
            >
              ← Done, Return to Registry
            </button>
          </div>

          {/* Grid layout for Whitelists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
            
            {/* Box 1: Whitelist Products */}
            <div className="bg-white rounded-xl border border-slate-150 p-5 space-y-4 flex flex-col h-[400px]">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-4 h-4 text-rose-500" />
                    <span>Assign Allowed Products</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold leading-normal">If active, checking restricts partner checkout permissions to selected items only.</p>
                </div>

                <div className="flex gap-1.5 text-[10px]">
                  <button 
                    onClick={handleAllowAllProducts}
                    className="font-bold text-rose-600 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button 
                    onClick={() => handleClearWhiteLists('products')}
                    className="font-bold text-slate-500 hover:underline"
                  >
                    Allow All Global
                  </button>
                </div>
              </div>

              {/* Scrollable products check registry */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                {state.products.filter(p => p.status === 'active').map(product => {
                  const isChecked = activeUserEntity.allowedProducts?.includes(product.id);
                  return (
                    <label 
                      key={product.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold select-none cursor-pointer hover:bg-slate-50 transition ${
                        isChecked 
                          ? 'border-rose-300 bg-rose-50/20' 
                          : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          checked={isChecked || false}
                          onChange={() => handleToggleProductAllowed(product.id)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-slate-800 line-clamp-1">{product.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{product.sku}</span>
                    </label>
                  );
                })}
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500 font-semibold leading-relaxed flex items-start gap-1.5">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>If blank, the integration partner can buy any product inside the entire live store queue.</span>
              </div>
            </div>

            {/* Box 2: Whitelist Cities */}
            <div className="bg-white rounded-xl border border-slate-150 p-5 space-y-4 flex flex-col h-[400px]">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>Assign Allowed Locations</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold leading-normal">Checking limits allowed package destinations for partner checkout requests.</p>
                </div>

                <div className="flex gap-1.5 text-[10px]">
                  <button 
                    onClick={handleAllowAllCities}
                    className="font-bold text-rose-600 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button 
                    onClick={() => handleClearWhiteLists('cities')}
                    className="font-bold text-slate-500 hover:underline"
                  >
                    Allow All Nepal
                  </button>
                </div>
              </div>

              {/* Scrollable cities check registry */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                {(state.deliveryDistricts && state.deliveryDistricts.length > 0 
                  ? state.deliveryDistricts 
                  : [{ id: 'ktm', name: 'Kathmandu' }, { id: 'lal', name: 'Lalitpur' }, { id: 'bhk', name: 'Bhaktapur' }]
                ).map(district => {
                  const isChecked = activeUserEntity.allowedCities?.includes(district.name);
                  return (
                    <label 
                      key={district.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold select-none cursor-pointer hover:bg-slate-50 transition ${
                        isChecked 
                          ? 'border-rose-300 bg-rose-50/20' 
                          : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          checked={isChecked || false}
                          onChange={() => handleToggleCityAllowed(district.name)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-slate-800">{district.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">Nepal District</span>
                    </label>
                  );
                })}
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500 font-semibold leading-relaxed flex items-start gap-1.5">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>Non-matching cities will yield a <code>403 Delivery Location Not Allowed</code> on validation. Leave blank to bypass checks.</span>
              </div>
            </div>

          </div>

          {/* Dynamic Field Configuration Table */}
          <div className="bg-white rounded-xl border border-slate-150 p-5 text-left space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-rose-500 animate-spin-slow" />
                <span>Field Customization Gateway Rules</span>
              </h4>
              <p className="text-[11px] text-slate-400 font-semibold leading-normal">
                Configure constraints for each integration payload key. Omitted (Removed) fields are fully hidden from schemas, API documentation, and payload validations.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-150 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150 text-[10px] uppercase font-mono">
                  <tr>
                    <th className="p-3">JSON Field Path Key</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Constraint Level (Customization)</th>
                    <th className="p-3">Fulfillment Behavior Rules</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {DEFAULT_FIELDS.map(f => {
                    const configs = activeUserEntity.fieldConfig || {};
                    const rule = configs[f.id] || { enabled: true, mandatory: false };

                    let activeChoice: 'mandatory' | 'optional' | 'remove' = 'optional';
                    if (!rule.enabled) {
                      activeChoice = 'remove';
                    } else if (rule.mandatory) {
                      activeChoice = 'mandatory';
                    }

                    return (
                      <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3">
                          <code className="text-[11px] font-bold text-slate-900">{f.id}</code>
                          <span className="block text-[10px] text-slate-400 font-bold mt-0.5">{f.label}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[9.5px] font-bold bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full font-sans uppercase">
                            {f.category}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100/70 gap-0.5">
                            {/* Choice 1: Mandatory */}
                            <button
                              type="button"
                              onClick={() => handleSetFieldRule(f.id, 'mandatory')}
                              className={`px-2.5 py-1.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                activeChoice === 'mandatory'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-rose-600 hover:bg-slate-200/50'
                              }`}
                            >
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>Mandatory</span>
                            </button>

                            {/* Choice 2: Non-mandatory (Optional) */}
                            <button
                              type="button"
                              onClick={() => handleSetFieldRule(f.id, 'optional')}
                              className={`px-2.5 py-1.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                activeChoice === 'optional'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-200/50'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>Non-Mandatory</span>
                            </button>

                            {/* Choice 3: Remove */}
                            <button
                              type="button"
                              onClick={() => handleSetFieldRule(f.id, 'remove')}
                              className={`px-2.5 py-1.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                                activeChoice === 'remove'
                                  ? 'bg-slate-500 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-600 hover:bg-slate-200/50'
                              }`}
                            >
                              <X className="w-3 h-3 shrink-0" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </td>
                        <td className="p-3 leading-normal">
                          {activeChoice === 'mandatory' && (
                            <span className="text-[10px] text-rose-650 font-extrabold inline-flex items-center gap-1 bg-rose-50 px-2 py-1 rounded border border-rose-100">
                              🔒 MANDATORY FILLED: Strictly required. Returns 400 Bad Request if null.
                            </span>
                          )}
                          {activeChoice === 'optional' && (
                            <span className="text-[10px] text-emerald-700 font-extrabold inline-flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                              🔓 NON-MANDATORY FILLED: Optional field. Standard default validation if omitted.
                            </span>
                          )}
                          {activeChoice === 'remove' && (
                            <span className="text-[10px] text-slate-500 font-extrabold inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              🚫 REMOVE FIELD: Completely removed from endpoint schemas and ignored on validate.
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Subsection: Dynamic API Documentation */}
      {activeSubSection === 'docs' && (
        <div className="bg-white rounded-xl border border-slate-150 p-6 space-y-6 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-rose-600" />
                <span>Live Dynamic Integration spec sheets</span>
              </h3>
              <p className="text-xs text-slate-400 font-semibold">Select an integration partner profile to view, copy, or download customized and security-filtered specifications.</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-500">Corporate profile:</label>
              <select
                value={selectedDocUserId}
                onChange={(e) => setSelectedDocUserId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none"
              >
                <option value="" disabled>-- Choose Partner --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.integrationName} (@{u.username})</option>
                ))}
              </select>
            </div>
          </div>

          {selectedDocUserId ? (
            <div className="space-y-4">
              <div className="flex justify-end gap-2 text-xs font-bold">
                <button
                  onClick={() => handleCopyDocs(getDynamicDocs(selectedDocUserId))}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-750 border border-slate-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Markdown
                </button>
                <button
                  onClick={() => {
                    const matchedUser = users.find(u => u.id === selectedDocUserId);
                    if (matchedUser) {
                      handleDownloadDocs(matchedUser.username, getDynamicDocs(selectedDocUserId));
                    }
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download Markdown (.md)
                </button>
              </div>

              {/* Styled markdown output panel */}
              <div className="bg-slate-900 text-slate-100 p-5 rounded-xl font-mono text-[11px] overflow-auto max-h-[500px] leading-relaxed border border-slate-800 space-y-2 select-text">
                <pre className="whitespace-pre-wrap">{getDynamicDocs(selectedDocUserId)}</pre>
              </div>

              {/* Manuals & Downloads Section */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/85 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-rose-650" />
                    <span>Download Gateway Manuals & Security Guidelines</span>
                  </h4>
                  <p className="text-[11px] text-slate-550 font-semibold leading-relaxed">
                    Provide your technical team and financial coordinators with offline-ready documentation that clarifies manual payments reconciliation workflows and network IP protection rules.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Specs */}
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="inline-flex bg-rose-50 text-rose-700 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                        Technical API Spec
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-800">Custom Dynamic Integration Spec</h5>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Tailored markdown detailing your exact active whitelisted catalog, delivery cities, and mandatory payload parameters.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const matchedUser = users.find(u => u.id === selectedDocUserId);
                        if (matchedUser) {
                          handleDownloadDocs(matchedUser.username, getDynamicDocs(selectedDocUserId));
                        }
                      }}
                      className="w-full text-center py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Technical Spec (.md)
                    </button>
                  </div>

                  {/* Card 2: Ops Manual */}
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="inline-flex bg-indigo-50 text-indigo-750 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                        Finance & Ops Guide
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-800">Partner Operations Manual</h5>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Explains workflow coordination, manual bank credentials matching, WhatsApp receipt routing, and error resolution.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const matchedUser = users.find(u => u.id === selectedDocUserId);
                        if (matchedUser) {
                          handleDownloadOperationsManual(matchedUser.username);
                        }
                      }}
                      className="w-full text-center py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Ops Manual (.md)
                    </button>
                  </div>

                  {/* Card 3: Cyber Security */}
                  <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="inline-flex bg-amber-50 text-amber-800 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Security Policy
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-800">Whitelisting & Security Guide</h5>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Procedural standard on maintaining secure keys, configuring static IPs whitelisting, and auditing request logs.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const matchedUser = users.find(u => u.id === selectedDocUserId);
                        if (matchedUser) {
                          handleDownloadSecurityManual(matchedUser.username);
                        }
                      }}
                      className="w-full text-center py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Security Guide (.md)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-400 bg-slate-50 rounded-xl text-xs font-bold">
              Please choose or generate at least one API User profile above to access dynamic integrated manuals.
            </div>
          )}
        </div>
      )}

      {/* Subsection: Interactive API Tester Sandbox */}
      {activeSubSection === 'tester' && (
        <div className="bg-white rounded-xl border border-slate-150 p-6 space-y-6 text-left">
          
          <div className="space-y-1.5 border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-5 h-5 text-rose-600" />
              <span>Interactive Local API Testing Sandbox</span>
            </h3>
            <p className="text-xs text-slate-400 font-semibold max-w-2xl leading-normal">
              Stress-test payloads, restrictions, and dynamic required validation rules by launching live POST orders against the Node server local thread.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Selection and input */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-500">Integrator Token Profile:</span>
                  <select
                    value={testerUserId}
                    onChange={(e) => setTesterUserId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold focus:outline-none"
                  >
                    <option value="" disabled>-- Choose User Profile --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.integrationName} (@{u.username})</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleLoadTesterTemplate(testerUserId)}
                  className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 pr-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Template
                </button>
              </div>

              {/* Code editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] text-slate-400 font-mono font-extrabold uppercase tracking-wide">POST Request JSON payload body:</label>
                  <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    💡 Dynamic Pricing Configured
                  </span>
                </div>
                <textarea
                  value={testerPayload}
                  onChange={(e) => setTesterPayload(e.target.value)}
                  rows={13}
                  className="w-full bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-rose-500 leading-relaxed border border-slate-800"
                />
              </div>

              {/* Advanced Interactive Control Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={handleCheckPrice}
                  disabled={checkingPrice || testerLoading || !testerUserId}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Calculator className={`w-4 h-4 text-white ${checkingPrice ? 'animate-spin' : ''}`} />
                  <span>{checkingPrice ? 'Querying Webstore...' : '1. Check Product Price & Sync'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunTester}
                  disabled={testerLoading || checkingPrice || !testerUserId}
                  className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <PlayCircle className={`w-4 h-4 text-rose-500 ${testerLoading ? 'animate-pulse' : ''}`} />
                  <span>{testerLoading ? 'Broadcasting stream...' : '2. Transmit & Place SKU Order'}</span>
                </button>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg text-[10.5px] text-slate-600 font-medium leading-relaxed">
                🚨 <strong>B2B Price-Check Flow:</strong> Select products in your payload, then click <strong>Check Product Price & Sync</strong>. Our pricing engine fetches live catalog values, formats actual unit rates directly back into your payload, and allows downstream partners to preview total invoices instantly before finalizing!
              </div>
            </div>

            {/* Response Output panel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono font-extrabold uppercase tracking-wide block">HTTP server Response trace:</span>
                {testerStatuscode && (
                  <span className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                    testerStatuscode >= 200 && testerStatuscode < 300
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50'
                      : 'bg-rose-50 text-rose-600 border border-rose-200/50'
                  }`}>
                    STATUS: {testerStatuscode}
                  </span>
                )}
              </div>

              <div className={`bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[10.5px] overflow-auto h-[352px] leading-relaxed border border-slate-800 selection:bg-slate-800 ${
                testerStatuscode && testerStatuscode >= 200 && testerStatuscode < 300 ? 'border-l-4 border-l-emerald-500' : testerStatuscode ? 'border-l-4 border-l-rose-500' : ''
              }`}>
                {testerResponse ? (
                  <pre className="whitespace-pre-wrap">{testerResponse}</pre>
                ) : (
                  <div className="h-full flex flex-col justify-center items-center text-slate-500 space-y-1 p-4">
                    <HelpCircle className="w-8 h-8 text-slate-600" />
                    <p className="font-semibold text-center text-[10px]">Ready for transmission. Press transmit button to run validation checks against the live Node process thread.</p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-500 font-semibold leading-relaxed">
                Orders scheduled through this sandbox tester are placed in the backend queue. Press <strong>Pull & Sync Orders</strong> at the top to merge them in the admin dashboard!
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Subsection: Server Logs */}
      {activeSubSection === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-150 flex items-center justify-between">
            <div className="text-left">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Dynamic B2B Security Audit Logs</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Verify headers, timestamps, payloads, response state objects, and client exchange histories.</p>
            </div>

            <button
              onClick={clearLogsHistory}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-lg transition disabled:opacity-40 cursor-pointer"
            >
              Clear Logs Backlog
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-150 text-slate-400 text-xs font-semibold space-y-1">
              <Check className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-bold">Security vault clear. No API requests have been made to your platform server yet.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-150 rounded-xl overflow-hidden text-left">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-400 uppercase font-mono text-[9px] font-bold border-b border-slate-150 font-semibold">
                    <tr>
                      <th className="p-3">Logged Date</th>
                      <th className="p-3">Client Username</th>
                      <th className="p-3">Endpoint Route</th>
                      <th className="p-3">Client IP</th>
                      <th className="p-3 text-center">HTTP Code</th>
                      <th className="p-3 text-right">Raw inspection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-705 font-semibold">
                    {logs.map((log, idx) => {
                      const isExpanded = expandedLogId === log.id;
                      const isSuccess = log.responseStatus >= 200 && log.responseStatus < 300;
                      return (
                        <React.Fragment key={`${log.id || 'log'}-${idx}`}>
                          <tr className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setExpandedLogId(isExpanded ? null : log.id)}>
                            <td className="p-3 font-mono text-[10.5px] text-slate-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-3 font-bold">
                              @{log.username}
                            </td>
                            <td className="p-3 font-mono text-[10px]">
                              {log.endpoint}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-slate-400">
                              {log.ipAddress}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`font-mono font-bold text-[10px] uppercase px-1.5 py-0.5 rounded ${
                                isSuccess 
                                  ? 'bg-emerald-50 text-emerald-600' 
                                  : 'bg-rose-50 text-rose-600'
                              }`}>
                                {log.responseStatus}
                              </span>
                            </td>
                            <td className="p-3 text-right text-[10px]">
                              <button 
                                className="text-rose-600 font-extrabold hover:underline"
                                onClick={(e) => { e.stopPropagation(); setExpandedLogId(isExpanded ? null : log.id); }}
                              >
                                {isExpanded ? 'Hide Payload ▲' : 'View Payload ▼'}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded sub-row with JSON bodies */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="bg-slate-50 p-4 border-y border-slate-150">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-slate-400 font-mono font-extrabold uppercase tracking-wider block">Sent Request Payload JSON:</span>
                                    <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg leading-relaxed text-[10.5px] overflow-auto max-h-[220px] font-mono border border-slate-800 select-all">
                                      {JSON.stringify(JSON.parse(log.requestPayload || '{}'), null, 2)}
                                    </pre>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="text-[9px] text-slate-400 font-mono font-extrabold uppercase tracking-wider block">Received Response JSON body:</span>
                                    <pre className="bg-slate-900 text-slate-101 p-3 rounded-lg leading-relaxed text-[10.5px] overflow-auto max-h-[220px] font-mono border border-slate-800 select-all">
                                      {JSON.stringify(JSON.parse(log.responseBody || '{}'), null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subsection: Partner Reports & Analytics */}
      {activeSubSection === 'reports' && (() => {
        // Collect all orders. They are saved in state.orders
        const allOrders = state.orders || [];
        
        // Filter by API-placed orders
        let apis = allOrders.filter(order => {
          const isApi = (order.id && String(order.id).startsWith('ord-api')) || 
                        (order.refId && String(order.refId).startsWith('KO-API')) || 
                        (order.orderNote && String(order.orderNote).includes('API placed order')) ||
                        !!order.apiPartnerId;
          return isApi;
        });

        // Filter by timeframe
        if (reportTimeframe !== 'all') {
          const now = new Date();
          apis = apis.filter(order => {
            if (!order.createdAt) return false;
            const placedDate = new Date(order.createdAt);
            const diffTime = Math.abs(now.getTime() - placedDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (reportTimeframe === 'today') {
              return now.toDateString() === placedDate.toDateString();
            } else if (reportTimeframe === '7days') {
              return diffDays <= 7;
            } else if (reportTimeframe === '30days') {
              return diffDays <= 30;
            } else if (reportTimeframe === 'custom') {
              const placedTime = placedDate.getTime();
              const start = reportStartDate ? new Date(reportStartDate).setHours(0, 0, 0, 0) : null;
              const end = reportEndDate ? new Date(reportEndDate).setHours(23, 59, 59, 999) : null;
              if (start && placedTime < start) return false;
              if (end && placedTime > end) return false;
              return true;
            }
            return true;
          });
        }

        // Filter by partner
        if (reportPartnerId !== 'all') {
          const matchedUser = users.find(u => u.id === reportPartnerId);
          if (matchedUser) {
            apis = apis.filter(order => {
              return order.apiPartnerId === matchedUser.id || 
                     (order.apiPartnerUsername && String(order.apiPartnerUsername).toLowerCase() === matchedUser.username.toLowerCase()) ||
                     (order.customerEmail && String(order.customerEmail).toLowerCase() === matchedUser.email?.toLowerCase()) ||
                     (order.customerName && String(order.customerName).toLowerCase() === matchedUser.integrationName.toLowerCase());
            });
          }
        }

        const filteredOrders = apis;

        // Compute metrics
        const totalOrdersCount = filteredOrders.length;
        const totalRevenueVal = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const averageOrderVal = totalOrdersCount > 0 ? totalRevenueVal / totalOrdersCount : 0;

        // Status statistics helper
        const pendingCount = filteredOrders.filter(o => (o.status as string) === 'pending' || o.paymentStatus === 'pending').length;
        const paidCount = filteredOrders.filter(o => (o.status as string) === 'paid' || o.paymentStatus === 'paid').length;
        const fulfilledCount = filteredOrders.filter(o => (o.status as string) === 'processing' || (o.status as string) === 'completed' || (o.status as string) === 'delivered' || (o.status as string) === 'shipped').length;
        const cancelledCount = filteredOrders.filter(o => (o.status as string) === 'cancelled').length;

        // Top products calculation
        const productSalesMap: Record<string, { name: string, qty: number, revenue: number }> = {};
        filteredOrders.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
              const prodKey = item.productId || item.productName || 'Unknown SKU';
              const name = item.productName || 'Direct Gifting Product';
              const qty = item.quantity || 1;
              const rev = (item.selectedPrice || 0) * qty;
              
              if (!productSalesMap[prodKey]) {
                productSalesMap[prodKey] = { name, qty: 0, revenue: 0 };
              }
              productSalesMap[prodKey].qty += qty;
              productSalesMap[prodKey].revenue += rev;
            });
          }
        });
        const topProducts = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

        // Destined cities breakdown
        const cityCountMap: Record<string, number> = {};
        filteredOrders.forEach(order => {
          const city = order.deliveryDistrict || order.shippingAddress || 'Nepal Gifting';
          cityCountMap[city] = (cityCountMap[city] || 0) + 1;
        });
        const topCities = Object.entries(cityCountMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // Log statistics for error rate
        let filteredLogList = [...logs];
        if (reportTimeframe !== 'all') {
          const now = new Date();
          filteredLogList = filteredLogList.filter(l => {
            if (!l.timestamp) return false;
            const d = new Date(l.timestamp);
            const diffDays = Math.ceil(Math.abs(now.getTime() - d.getTime()) / (1000 * 3600 * 24));
            if (reportTimeframe === 'today') return now.toDateString() === d.toDateString();
            if (reportTimeframe === '7days') return diffDays <= 7;
            if (reportTimeframe === '30days') return diffDays <= 30;
            if (reportTimeframe === 'custom') {
              const placedTime = d.getTime();
              const start = reportStartDate ? new Date(reportStartDate).setHours(0, 0, 0, 0) : null;
              const end = reportEndDate ? new Date(reportEndDate).setHours(23, 59, 59, 999) : null;
              if (start && placedTime < start) return false;
              if (end && placedTime > end) return false;
              return true;
            }
            return true;
          });
        }
        if (reportPartnerId !== 'all') {
          const matchedUser = users.find(u => u.id === reportPartnerId);
          if (matchedUser) {
            filteredLogList = filteredLogList.filter(l => l.username?.toLowerCase() === matchedUser.username.toLowerCase());
          }
        }
        const successLogCount = filteredLogList.filter(l => l.status === 'success' || (parseInt(l.statusCode || '200') < 400)).length;
        const totalLogCount = filteredLogList.length;
        const successRate = totalLogCount > 0 ? (successLogCount / totalLogCount) * 100 : 100;

        // Export report to CSV
        const handleExportCSVReport = () => {
          let csvContent = "data:text/csv;charset=utf-8,";
          csvContent += "Serial ID,Reference ID,API User ID,API Partner Name,API Username,Sender Name,Receiver Name,Delivery Address,Delivery District,Date Placed,Total NPR,Order Status,Payment Status\n";
          
          filteredOrders.forEach(o => {
            const matchedPartner = users.find(u => u.id === o.apiPartnerId || u.username.toLowerCase() === o.apiPartnerUsername?.toLowerCase());
            const partnerName = matchedPartner ? matchedPartner.integrationName : (o.apiPartnerUsername || 'API Gateway');
            const partnerUserId = matchedPartner ? matchedPartner.id : (o.apiPartnerId || 'api_user');

            const row = [
              o.id || '',
              o.refId || '',
              partnerUserId,
              `"${partnerName.replace(/"/g, '""')}"`,
              o.apiPartnerUsername || 'partner_account',
              `"${(o.customerName || '').replace(/"/g, '""')}"`,
              `"${(o.receiverName || '').replace(/"/g, '""')}"`,
              `"${(o.shippingAddress || '').replace(/"/g, '""')}"`,
              `"${(o.deliveryDistrict || '').replace(/"/g, '""')}"`,
              o.createdAt ? o.createdAt.split('T')[0] : '',
              o.totalAmount || 0,
              o.status || '',
              o.paymentStatus || ''
            ].join(',');
            csvContent += row + "\n";
          });

          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          const nameSlug = reportPartnerId !== 'all' 
            ? users.find(u => u.id === reportPartnerId)?.username 
            : 'all_partners';
          const timeframeSlug = reportTimeframe === 'custom' 
            ? `${reportStartDate || 'start'}_to_${reportEndDate || 'end'}`
            : reportTimeframe;
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `Koseli_API_Gateway_Report_${nameSlug}_${timeframeSlug}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        const activeSelectedUserObj = users.find(u => u.id === reportPartnerId);

        return (
          <div className="space-y-6 text-left">
            {/* Filters bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <BarChart3 className="w-5 h-5 text-rose-600" />
                  <span>Partner Transactional Query Explorer</span>
                </h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed font-sans">
                  Generate instant client-wise analytical reports, audit order fulfillment ratios, and output compliance CSV sheets.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {/* Select Partner Dropdown */}
                <div className="flex flex-col gap-1 select-none">
                  <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider font-sans">Select Partner Context:</span>
                  <select
                    value={reportPartnerId}
                    onChange={(e) => setReportPartnerId(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer text-xs"
                  >
                    <option value="all">🌐 All Integration Partners ({users.length})</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.integrationName} (@{u.username})</option>
                    ))}
                  </select>
                </div>

                {/* Choose Timeframe Dropdown */}
                <div className="flex flex-col gap-1 select-none">
                  <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider font-sans font-extrabold">Select Time Period:</span>
                  <select
                    value={reportTimeframe}
                    onChange={(e) => setReportTimeframe(e.target.value as any)}
                    className="p-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer text-xs"
                  >
                    <option value="all">🗓️ All Recorded History</option>
                    <option value="today">⚡ Placed Today</option>
                    <option value="7days">📅 Last 7 Operational Days</option>
                    <option value="30days">📅 Last 30 Operational Days</option>
                    <option value="custom">📅 Custom Date Range ...</option>
                  </select>
                </div>

                {/* Custom Date Range Picker Options */}
                {reportTimeframe === 'custom' && (
                  <>
                    <div className="flex flex-col gap-1 select-none">
                      <span className="block text-[9px] font-extrabold uppercase text-rose-600 tracking-wider font-sans">Start Date:</span>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="p-1.5 border border-slate-200 rounded-lg bg-white font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1 select-none">
                      <span className="block text-[9px] font-extrabold uppercase text-rose-600 tracking-wider font-sans">End Date:</span>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="p-1.5 border border-slate-200 rounded-lg bg-white font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer text-xs"
                      />
                    </div>
                  </>
                )}

                {/* CSV Download Action */}
                <div className="flex items-end">
                  <button
                    onClick={handleExportCSVReport}
                    className="p-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition h-[36px] flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                    title="Export currently filtered dataset to spreadsheet CSV"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV Sheet</span>
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1 */}
              <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs flex items-center gap-3.5">
                <div className="p-3 rounded-lg bg-indigo-50 text-indigo-650">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">Placed Orders Count</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-slate-900 leading-none">{totalOrdersCount}</span>
                    <span className="text-[9px] text-slate-400 font-semibold font-sans">API placed</span>
                  </div>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs flex items-center gap-3.5">
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                  <span className="text-sm font-extrabold font-mono">रू</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">Gross Revenue (NPR)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-emerald-650 leading-none">Rs. {totalRevenueVal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs flex items-center gap-3.5">
                <div className="p-3 rounded-lg bg-rose-50 text-rose-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">Average Order Value</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-slate-900 leading-none">Rs. {Math.round(averageOrderVal).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Metric 4 */}
              <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs flex items-center gap-3.5">
                <div className={`p-3 rounded-lg ${successRate >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  <Terminal className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">API Connection Success Rate</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-extrabold leading-none ${successRate >= 90 ? 'text-emerald-605' : 'text-amber-600'}`}>
                      {successRate.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold font-mono">({totalLogCount} hits)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle analytics insights boards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Panel A: Order States & Ingress Locations */}
              <div className="bg-white rounded-xl border border-slate-150 p-5 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                  <PieChart className="w-4 h-4 text-rose-500" />
                  <span>Order Processing States</span>
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-center">
                    <span className="text-[10px] block text-slate-400 font-bold uppercase font-sans">Pending</span>
                    <span className="text-lg font-extrabold text-slate-800">{pendingCount}</span>
                  </div>
                  <div className="bg-emerald-50/20 border border-emerald-100 rounded-lg p-2.5 text-center">
                    <span className="text-[10px] block text-emerald-600 font-bold uppercase font-sans">Paid</span>
                    <span className="text-lg font-extrabold text-emerald-600">{paidCount}</span>
                  </div>
                  <div className="bg-indigo-50/20 border border-indigo-100 rounded-lg p-2.5 text-center">
                    <span className="text-[10px] block text-indigo-600 font-bold uppercase font-sans">Fulfilled</span>
                    <span className="text-lg font-extrabold text-indigo-600">{fulfilledCount}</span>
                  </div>
                  <div className="bg-rose-50/20 border border-rose-100 rounded-lg p-2.5 text-center">
                    <span className="text-[10px] block text-rose-600 font-bold uppercase font-sans">Cancelled</span>
                    <span className="text-lg font-extrabold text-rose-600">{cancelledCount}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3.5 space-y-2">
                  <span className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider font-sans">Top 5 Recipient Dispatch Cities / Districts</span>
                  
                  {topCities.length === 0 ? (
                    <p className="text-xs text-slate-400 italic font-sans font-medium">No destination data recorded under currently selected filters.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {topCities.map(([cityName, count]) => {
                        const pct = totalOrdersCount > 0 ? (count / totalOrdersCount) * 100 : 0;
                        return (
                          <div key={cityName} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 animate-bounce" />
                                <span className="font-sans font-bold text-slate-800">{cityName}</span>
                              </span>
                              <span className="font-mono text-slate-600">{count} orders ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Panel B: Active Catalog whitelists & top selling whitelisted items */}
              <div className="bg-white rounded-xl border border-slate-150 p-5 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                  <Layers className="w-4 h-4 text-rose-500" />
                  <span>Whitelisted Catalog & Top Sellers</span>
                </h4>

                {/* Whitelists Overview */}
                {activeSelectedUserObj ? (
                  <div className="p-3 bg-amber-50/20 border border-amber-500/10 rounded-xl space-y-2 text-xs">
                    <span className="block text-[9px] font-extrabold uppercase tracking-wide text-amber-700 font-sans">Whitelisting Restriction Status for {activeSelectedUserObj.integrationName}:</span>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                      <div className="bg-white p-2 rounded border border-amber-500/10">
                        <span className="block text-slate-400 font-bold uppercase text-[8px] font-sans">PRODS LISTED</span>
                        <span className="text-slate-800 font-sans font-bold">
                          {activeSelectedUserObj.allowedProducts && activeSelectedUserObj.allowedProducts.length > 0 
                            ? `${activeSelectedUserObj.allowedProducts.length} items` 
                            : '🔓 Global'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-amber-500/10">
                        <span className="block text-slate-400 font-bold uppercase text-[8px] font-sans">CITIES LISTED</span>
                        <span className="text-slate-800 font-sans font-bold">
                          {activeSelectedUserObj.allowedCities && activeSelectedUserObj.allowedCities.length > 0 
                            ? `${activeSelectedUserObj.allowedCities.length} districts` 
                            : '🔓 Global'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded border border-amber-500/10">
                        <span className="block text-slate-400 font-bold uppercase text-[8px] font-sans">REQUIRED KEYS</span>
                        <span className="text-slate-800 font-sans font-bold">
                          {activeSelectedUserObj.fieldConfig 
                            ? `${Object.values(activeSelectedUserObj.fieldConfig).filter((f: any) => f.enabled && f.mandatory).length} fields` 
                            : 'Default'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl text-center text-slate-400 text-xs font-bold font-sans">
                    🌐 Filtering all partners combined database ledger...
                  </div>
                )}

                <div className="space-y-2">
                  <span className="block text-[10px] font-font-extrabold uppercase text-slate-400 tracking-wider font-sans font-bold">Top Whitelisted Products Demanded</span>
                  {topProducts.length === 0 ? (
                    <p className="text-xs text-slate-400 italic font-sans font-medium">No whitelisted sales recorded in this context.</p>
                  ) : (
                    <div className="space-y-2 pt-1 font-semibold">
                      {topProducts.map((item, i) => {
                        return (
                          <div key={i} className="flex justify-between items-center text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="truncate max-w-[250px] font-bold block text-slate-800 font-sans">{item.name}</span>
                            <div className="flex gap-4 font-mono text-[10.5px]">
                              <span>Qty: <strong>{item.qty}</strong></span>
                              <span className="text-rose-600">Rs. {item.revenue.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section C: Detailed Transactional table */}
            <div className="bg-white rounded-xl border border-slate-150 p-5 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                <Settings className="w-4 h-4 text-rose-500" />
                <span>Line Transactional Ledgers for Audit ({filteredOrders.length} API Placements Found)</span>
              </h4>

              {filteredOrders.length === 0 ? (
                <div className="p-10 text-center text-slate-400 italic border border-dashed border-slate-200 rounded-xl font-sans">
                  No api orders found matching your selected partner profile or time range configuration.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-150 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150 text-[10px] uppercase font-mono">
                      <tr>
                        <th className="p-3">Order ID / Ref ID</th>
                        <th className="p-3">Date Placed</th>
                        <th className="p-3">API User ID</th>
                        <th className="p-3">API Partner Name</th>
                        <th className="p-3">Partner Username</th>
                        <th className="p-3">Sender \& Recipient</th>
                        <th className="p-3">Delivery Destination</th>
                        <th className="p-3">Manual Settlement Status</th>
                        <th className="p-3 text-right">Value (NPR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredOrders.map((order, idx) => {
                        const matchedPartner = users.find(u => u.id === order.apiPartnerId || u.username.toLowerCase() === order.apiPartnerUsername?.toLowerCase());
                        const partnerName = matchedPartner ? matchedPartner.integrationName : (order.apiPartnerUsername || 'API Gateway');
                        const partnerUserId = matchedPartner ? matchedPartner.id : (order.apiPartnerId || 'api_user');
                        
                        return (
                          <tr key={`${order.id || 'order'}-${idx}`} className="hover:bg-slate-50/60 font-medium">
                            <td className="p-3">
                              <div className="font-bold text-slate-900 font-mono text-[11px]">{order.id}</div>
                              <div className="text-[10px] font-bold text-slate-400 font-mono">{order.refId}</div>
                            </td>
                            <td className="p-3 text-slate-500 text-[11px]">
                              {order.createdAt ? order.createdAt.split('T')[0] : 'N/A'}
                            </td>
                            <td className="p-3">
                              <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200/50 px-2 py-0.5 rounded font-bold font-mono">
                                {partnerUserId}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-800 text-[11px]">
                              {partnerName}
                            </td>
                            <td className="p-3">
                              <span className="text-[10px] bg-indigo-50/80 text-indigo-600 px-2 py-0.5 rounded font-bold font-mono">
                                @{order.apiPartnerUsername || 'unknown_partner'}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] font-sans">
                              <p className="text-slate-800 font-bold max-w-[150px] truncate" title={order.customerName}>Sender: {order.customerName}</p>
                              <p className="text-slate-500 font-semibold max-w-[150px] truncate" title={order.receiverName}>Recipient: {order.receiverName}</p>
                            </td>
                            <td className="p-3">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-0.5 font-sans">
                                <span className="text-rose-500 animate-pulse">📍</span> {order.deliveryDistrict || 'Kathmandu'}
                              </span>
                              <div className="text-[10px] text-slate-400 max-w-[150px] truncate mt-0.5 font-sans">{order.shippingAddress}</div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 font-sans">
                                <span className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                  order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                  {order.paymentStatus === 'paid' ? '💰 PAID' : '⏳ PENDING PAYMENT'}
                                </span>
                                <span className={`text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                  (order.status as string) === 'completed' || (order.status as string) === 'delivered' 
                                    ? 'bg-emerald-50 text-emerald-600' 
                                    : ((order.status as string) === 'cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-650')
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-right font-extrabold font-mono text-slate-800 text-[11.5px]">
                              Rs. {(order.totalAmount || 0).toLocaleString()}
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
        );
      })()}

      {/* Subsection: Manual Payment setup */}
      {activeSubSection === 'payment' && (
        <form onSubmit={handleSavePaymentSetup} className="bg-white rounded-xl border border-slate-150 p-6 space-y-6 text-left">
          
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Manual Bank Ledger & QR setup</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Specify the bank details sent automatically inside the payment instructions after API order creation.</p>
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs tracking-tight transition flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-rose-500" />
              <span>Save Account Settings</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Nepal Financial Institution Bank Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nabil Bank Limited, Everest Bank"
                  value={manualPayment.bankName}
                  onChange={(e) => setManualPayment({ ...manualPayment, bankName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Beneficiary Account Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Koseli Gifting Solutions Private Limited"
                  value={manualPayment.accountName}
                  onChange={(e) => setManualPayment({ ...manualPayment, accountName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Depositor Account Number:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0110017500123"
                  value={manualPayment.accountNumber}
                  onChange={(e) => setManualPayment({ ...manualPayment, accountNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">CSR Support WhatsApp Helpline Contact:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +9779841234567"
                  value={manualPayment.whatsAppNumber}
                  onChange={(e) => setManualPayment({ ...manualPayment, whatsAppNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Fonepay / Standard Banking QR Code URL:</label>
                <input
                  type="text"
                  placeholder="e.g. https://cdn-icons-png.flaticon.com/512/10015/10015424.png"
                  value={manualPayment.qrCode || ''}
                  onChange={(e) => setManualPayment({ ...manualPayment, qrCode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Payment workflow settlement instruction text:</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Please transfer the exact NPR amount to our bank. Send your deposit scroll on our WhatsApp hotline so we can approve dispatch."
                  value={manualPayment.instructions}
                  onChange={(e) => setManualPayment({ ...manualPayment, instructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 leading-relaxed"
                />
              </div>

              {/* QR Previewer */}
              {manualPayment.qrCode && (
                <div className="pt-2">
                  <span className="block text-[9px] text-slate-400 font-mono font-extrabold uppercase tracking-wide mb-1">Live QR image Preview:</span>
                  <div className="w-24 h-24 bg-white border border-slate-150 rounded-lg p-1.5 flex items-center justify-center">
                    <img 
                      src={manualPayment.qrCode} 
                      alt="Bank QR Setup" 
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => { (e.target as any).style.display = 'none'; }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {/* Creation and Modification Drawer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-55 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-205 max-w-md w-full rounded-2xl shadow-2xl p-6 text-left space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-5 h-5 text-rose-600" />
                <span>{modalMode === 'create' ? 'Create API User profile' : 'Edit integration partner'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">System Integration Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ERP Synced, Shopify Portal, Vendor A"
                  value={formIntegrationName}
                  onChange={(e) => setFormIntegrationName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Company Group Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nepal Web Distributors Group"
                  value={formCompanyName}
                  onChange={(e) => setFormCompanyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Contact Person:</label>
                  <input
                    type="text"
                    placeholder="e.g. Pranish Silwal"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Contact Gmail/Email:</label>
                  <input
                    type="email"
                    placeholder="e.g. pranish@gmail.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">API handle Username:</label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    placeholder="e.g. shopify_hub"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
                  />
                  {modalMode === 'create' && <p className="text-[9px] text-slate-400 font-mono font-semibold">Will be used inside logging trace.</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Account Standing Status:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="active">Active (Access allowed)</option>
                    <option value="disabled">Disabled (Credentials blocked)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 bg-amber-50/20 border border-amber-500/10 p-3 rounded-xl">
                <label className="block text-[10px] text-amber-700 uppercase font-extrabold tracking-wider flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Whitelisted Partner IP Address(es):</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 202.166.205.14, 103.14.9.45, 127.0.0.1"
                  value={formAllowedIps}
                  onChange={(e) => setFormAllowedIps(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <p className="text-[9px] text-slate-550 leading-relaxed font-medium">
                  Separate multiple IP addresses using commas. To allow from any internet location, leave this field completely <strong>blank</strong> or enter <strong>*</strong>.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition cursor-pointer text-center shadow-md shadow-rose-600/10"
                >
                  {modalMode === 'create' ? 'Provision Account 🚀' : 'Persist Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
