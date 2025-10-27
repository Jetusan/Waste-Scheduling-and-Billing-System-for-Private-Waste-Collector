# Special Pickup System Enhancement Plan

## Current Issues Identified

### 1. Payment Collection Gap
- ❌ No payment collection when collector completes pickup
- ❌ No cash receipt/proof of payment system
- ❌ No cash on hand tracking for collectors
- ❌ Money goes nowhere after collection

### 2. Measurement System Missing
- ❌ No quantity field (how many sacks?)
- ❌ No measurement unit (per sack, per bag, per item)
- ❌ Only final price without breakdown
- ❌ No basis for pricing calculation

### 3. Mobile App Limitations
- ❌ Resident can't specify quantity when requesting
- ❌ Collector has no payment collection interface
- ❌ No receipt generation system
- ❌ No cash balance tracking

## Proposed Enhanced Flow

### 1. Resident Request (Mobile App)
```
Current: Waste Type + Description + Date + Address
Enhanced: Waste Type + Description + Estimated Quantity + Unit + Date + Address

Example:
- Waste Type: "Electronic Waste"
- Description: "Old computer and monitor"
- Estimated Quantity: 2
- Measurement Unit: "items" 
- Date: Tomorrow
- Address: Home address
```

### 2. Admin Pricing (Web Dashboard)
```
Current: Sets final_price only
Enhanced: Sets price_per_unit + confirms quantity

Example:
- Estimated: 2 items
- Price per item: ₱150
- Total price: ₱300
- Status: "Price Set - Awaiting Collection"
```

### 3. Collector Collection (Mobile App)
```
Current: Just marks as "collected"
Enhanced: Collection + Payment + Receipt

Collection Interface:
- Actual quantity collected: [2] items
- Price per unit: ₱150 (from admin)
- Total amount: ₱300
- Payment method: Cash ✓
- Amount received: ₱300
- Generate receipt: SP-123-1698765432
- Collector notes: "Items in good condition"
```

### 4. Cash Tracking System
```
Collector Cash Balance:
- Previous balance: ₱500
- Today's collection: +₱300
- New balance: ₱800
- Pending deposit: ₱800

Daily Summary:
- Collections today: 3 pickups
- Total cash collected: ₱800
- Special pickups: ₱300
- Regular collections: ₱500
```

### 5. Ledger Integration
```
Invoice Creation (Auto):
- Description: "Special Pickup - Electronic Waste (2 items)"
- Amount: ₱300
- Status: "Paid" (since cash collected)
- Payment reference: SP-123-1698765432

Ledger Entry:
- Date: Oct 27, 2025
- Description: "Special Pickup - Electronic Waste"
- Debit: ₱300
- Credit: ₱300 (payment received)
- Balance: ₱0
```

## Required Database Changes

### New Columns in special_pickup_requests:
- `quantity` - Number of units
- `measurement_unit` - sack, bag, item, box, etc.
- `price_per_unit` - Price per unit
- `payment_collected` - Boolean flag
- `payment_method` - cash, gcash, etc.
- `payment_date` - When payment was collected
- `collector_notes` - Notes from collector

### New Tables:
- `special_pickup_payments` - Payment collection records
- `collector_cash_on_hand` - Cash balance tracking

## Mobile App UI Changes Needed

### 1. Resident Request Form (spickup.jsx)
Add quantity selection:
```jsx
// After waste type selection
<View style={styles.quantitySection}>
  <Text style={styles.label}>Estimated Quantity</Text>
  <View style={styles.quantityRow}>
    <TextInput 
      style={styles.quantityInput}
      placeholder="How many?"
      value={quantity}
      onChangeText={setQuantity}
      keyboardType="numeric"
    />
    <Picker
      selectedValue={measurementUnit}
      onValueChange={setMeasurementUnit}
      style={styles.unitPicker}
    >
      <Picker.Item label="Sacks" value="sack" />
      <Picker.Item label="Bags" value="bag" />
      <Picker.Item label="Items" value="item" />
      <Picker.Item label="Boxes" value="box" />
    </Picker>
  </View>
</View>
```

### 2. Collector Collection Interface
New payment collection screen:
```jsx
// When collector marks as collected
<PaymentCollectionModal>
  <Text>Collect Payment</Text>
  <Text>Estimated: {request.quantity} {request.measurement_unit}</Text>
  <Text>Price per unit: ₱{request.price_per_unit}</Text>
  
  <TextInput 
    placeholder="Actual quantity collected"
    value={actualQuantity}
    onChangeText={setActualQuantity}
  />
  
  <Text>Total Amount: ₱{actualQuantity * request.price_per_unit}</Text>
  
  <TextInput 
    placeholder="Amount received from customer"
    value={amountReceived}
    onChangeText={setAmountReceived}
  />
  
  <Button title="Collect Payment & Generate Receipt" />
</PaymentCollectionModal>
```

### 3. Cash Balance Dashboard
New collector cash tracking:
```jsx
<CashBalanceCard>
  <Text>Cash on Hand: ₱{cashBalance}</Text>
  <Text>Today's Collections: ₱{todayCollections}</Text>
  <Text>Pending Deposit: ₱{pendingDeposit}</Text>
  <Button title="View Collection History" />
  <Button title="Request Cash Deposit" />
</CashBalanceCard>
```

## Implementation Priority

### Phase 1: Database Enhancement
1. Run enhance_special_pickup_system.sql
2. Add payment collection functions
3. Create cash tracking tables

### Phase 2: Backend API Updates
1. Update special pickup endpoints
2. Add payment collection endpoints
3. Add cash balance endpoints

### Phase 3: Mobile App Updates
1. Add quantity selection to resident form
2. Create collector payment interface
3. Add cash balance tracking

### Phase 4: Admin Dashboard Updates
1. Show quantity in special pickup management
2. Add cash balance monitoring
3. Add payment collection reports

## Expected Final Flow

```
Resident Request:
Mobile App → "2 sacks of garden waste" → Admin sets ₱100/sack → Total: ₱200

Collector Collection:
Collector App → Collects 2 sacks → Customer pays ₱200 cash → Receipt generated
→ Collector cash balance +₱200 → Invoice auto-created and marked paid

Ledger Result:
- Special Pickup - Garden Waste (2 sacks): ₱200 debit
- Payment Received - Cash: ₱200 credit  
- Balance: ₱0 (paid in full)

Cash Tracking:
- Collector has ₱200 cash on hand
- Admin can see collector cash balances
- Deposit requests can be made to admin
```

This creates a complete payment collection and tracking system for special pickups with proper quantity measurement and cash handling.
