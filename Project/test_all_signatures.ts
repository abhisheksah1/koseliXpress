import crypto from 'crypto';

const expectedSignature = 'eaf9773b97cd56b444ed63e0e03e65a6cc3cea94e47099d36ec07be22797d6fdba645378de87423b0f5f2214570f20273998c631d8ed7ca23be70faac03f0a20';

const merchantId = '5269';
const merchantName = 'saroj01';
const amount = '100.00';
const merchantTxnId = 'Trnx UAT1234';

// Try different permutations of values
const permutations = [
  // 1. Alphabetical sorting: Amount, MerchantId, MerchantName, MerchantTxnId
  { name: 'AmountMRIdMRNameMRTxnId', val: amount + merchantId + merchantName + merchantTxnId },
  // 2. Doc order: MerchantId, MerchantName, Amount, MerchantTxnId
  { name: 'MRIdMRNameAmountMRTxnId', val: merchantId + merchantName + amount + merchantTxnId },
  // 3. Custom order common in some SDKs: MerchantId, MerchantName, MerchantTxnId, Amount
  { name: 'MRIdMRNameMRTxnIdAmount', val: merchantId + merchantName + merchantTxnId + amount },
  // 4. Case-insensitive sort order or without keys
  { name: 'AmountMRTxnIdMRIdMRName', val: amount + merchantTxnId + merchantId + merchantName },
];

const trialKeys = [
  'SecretKey', 'secret', 'secretKey', 'saroj01', '5269', 'nepalpayment',
  'Saroj01', 'SAROJ01', 'nps', 'onepg', 'demo', 'sandbox', 'test', 'payment',
  'api_key', 'apikey', 'key', '123456', '5269saroj01', 'saroj015269',
  'nps_secret_key_df9012', 'njs_secret_key', 'saroj', 'nepal',
  'saroj01@5269', '5269@saroj01',
];

let found = false;

for (const p of permutations) {
  for (const key of trialKeys) {
    const hmac = crypto.createHmac('sha512', key)
      .update(p.val)
      .digest('hex');
    
    if (hmac === expectedSignature) {
      console.log(`SUCCESS! Found match!`);
      console.log(`Permutation: ${p.name}`);
      console.log(`Key: ${key}`);
      found = true;
      break;
    }
  }
  if (found) break;
}

if (!found) {
  console.log('No matches found among simple guesses.');
}
