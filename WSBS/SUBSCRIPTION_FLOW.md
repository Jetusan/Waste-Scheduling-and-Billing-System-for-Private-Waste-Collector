# Mobile Subscription Flow Documentation

## Overview
The mobile application now includes a comprehensive subscription system with invoice generation and multiple payment methods, similar to GCash's payment flow.

## Features

### 1. Plan Selection
- **Lite Plan**: ₱99/month - 1 bag per week
- **Essential Plan**: ₱149/month - 2 bags per week  
- **Full Plan**: ₱199/month - 3 bags per week

### 2. Invoice Generation
When a user selects a plan and clicks "Next", the system:
- Generates a detailed invoice with customer information
- Shows service details and pricing breakdown
- Displays payment summary with subtotal, taxes, and total amount
- Includes terms and conditions

### 3. Payment Methods
Two payment options are available:

#### GCash Payment
- Instant payment processing
- Automatic payment record creation
- Invoice status marked as "Paid"
- Reference number generated (GCASH-{timestamp})

#### Cash on Collection
- Payment deferred until collector arrives
- Invoice status marked as "Unpaid"
- Payment record created when collector collects payment
- Reminder sent to user about pending payment

## User Flow

1. **Plan Selection**
   - User browses available plans
   - Can view detailed plan information
   - Selects desired plan

2. **Invoice Review**
   - System generates invoice automatically
   - User reviews invoice details
   - Clicks "Proceed to Payment"

3. **Payment Method Selection**
   - User chooses between GCash or Cash on Collection
   - System shows payment summary
   - User confirms payment

4. **Processing & Confirmation**
   - System creates subscription in database
   - Generates invoice record
   - Processes payment (if GCash)
   - Shows success confirmation
   - Redirects to home page

## API Endpoints

### Create Mobile Subscription
```
POST /api/billing/mobile-subscription
```

**Request Body:**
```json
{
  "resident_id": 1,
  "plan_id": 1,
  "payment_method": "GCash"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription created successfully",
  "subscription": {
    "id": 1,
    "plan_name": "Lite Plan",
    "price": 99,
    "billing_start_date": "2024-01-15",
    "payment_method": "GCash",
    "status": "active"
  },
  "invoice": {
    "id": "INV-001",
    "amount": 99,
    "due_date": "2024-02-14",
    "status": "paid"
  },
  "payment": {
    "id": 1,
    "amount": 99,
    "method": "GCash",
    "reference": "GCASH-1705315200000",
    "date": "2024-01-15"
  }
}
```

## Database Changes

The system uses existing database tables:
- `subscription_plans` - Available plans
- `customer_subscriptions` - User subscriptions
- `invoices` - Generated invoices
- `payments` - Payment records

## Testing

Run the test file to verify API functionality:
```bash
cd backend
node testMobileSubscription.js
```

## Mobile App Integration

The mobile app (`WSBS/app/Subscription.jsx`) includes:
- Plan selection interface
- Invoice modal with detailed breakdown
- Payment method selection modal
- API integration for subscription creation
- Error handling and user feedback

## Security Considerations

- Input validation on all API endpoints
- Error handling for database operations
- User authentication should be implemented
- Payment method validation
- Invoice number generation with proper formatting

## Future Enhancements

1. **Real GCash Integration**
   - Actual GCash API integration
   - Payment gateway integration
   - Transaction verification

2. **Additional Payment Methods**
   - Credit/Debit cards
   - Bank transfers
   - Other e-wallets

3. **Invoice Management**
   - PDF generation
   - Email delivery
   - Payment reminders

4. **Subscription Management**
   - Plan upgrades/downgrades
   - Cancellation handling
   - Payment history

## Troubleshooting

### Common Issues

1. **API Connection Error**
   - Check if backend server is running
   - Verify API_BASE_URL in mobile app
   - Check network connectivity

2. **Database Errors**
   - Ensure database is properly configured
   - Check table structure matches expectations
   - Verify foreign key relationships

3. **Payment Processing Issues**
   - Check payment method validation
   - Verify invoice generation logic
   - Review payment record creation

### Debug Mode

Enable debug logging in the backend by setting:
```javascript
console.log('Debug info:', data);
```

## Support

For technical support or questions about the subscription flow, please refer to the backend logs and mobile app console for detailed error information. 