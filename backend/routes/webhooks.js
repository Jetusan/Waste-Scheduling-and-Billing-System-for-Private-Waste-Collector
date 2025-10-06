const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../config/db');

/**
 * PayMongo Webhook Handler
 * Handles payment events from PayMongo
 */

// PayMongo webhook endpoint
router.post('/paymongo', async (req, res) => {
  console.log('🔔 PayMongo webhook received');
  
  try {
    // Verify webhook signature
    const signature = req.headers['paymongo-signature'];
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('❌ PAYMONGO_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    
    // Verify signature
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const event = req.body;
    console.log('📧 Webhook event:', event.data?.type);
    console.log('🔍 Event data:', JSON.stringify(event, null, 2));
    
    // Handle different event types
    switch (event.data?.type) {
      case 'source.chargeable':
        await handleSourceChargeable(event.data);
        break;
        
      case 'payment.paid':
        await handlePaymentPaid(event.data);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(event.data);
        break;
        
      default:
        console.log(`ℹ️ Unhandled webhook event type: ${event.data?.type}`);
    }
    
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle source.chargeable event (GCash payment authorized)
async function handleSourceChargeable(eventData) {
  console.log('💰 Processing source.chargeable event');
  
  try {
    const sourceId = eventData.attributes?.data?.id;
    const amount = eventData.attributes?.data?.attributes?.amount;
    
    if (!sourceId) {
      console.error('❌ No source ID in webhook data');
      return;
    }
    
    // Update payment source status
    await pool.query(
      `UPDATE payment_sources 
       SET status = 'chargeable', 
           updated_at = NOW(),
           webhook_data = $2
       WHERE source_id = $1`,
      [sourceId, JSON.stringify(eventData)]
    );
    
    console.log(`✅ Updated payment source ${sourceId} to chargeable`);
    
    // Auto-charge the source (create payment)
    await createPaymentFromSource(sourceId, amount);
    
  } catch (error) {
    console.error('❌ Error handling source.chargeable:', error);
  }
}

// Handle payment.paid event
async function handlePaymentPaid(eventData) {
  console.log('✅ Processing payment.paid event');
  
  try {
    const paymentId = eventData.attributes?.data?.id;
    const sourceId = eventData.attributes?.data?.attributes?.source?.id;
    const amount = eventData.attributes?.data?.attributes?.amount;
    
    // Update payment source status
    await pool.query(
      `UPDATE payment_sources 
       SET status = 'paid', 
           payment_id = $2,
           updated_at = NOW(),
           webhook_data = $3
       WHERE source_id = $1`,
      [sourceId, paymentId, JSON.stringify(eventData)]
    );
    
    // Get associated invoice and subscription
    const paymentQuery = await pool.query(
      `SELECT ps.*, i.subscription_id 
       FROM payment_sources ps
       LEFT JOIN invoices i ON ps.invoice_id = i.invoice_id
       WHERE ps.source_id = $1`,
      [sourceId]
    );
    
    if (paymentQuery.rows.length > 0) {
      const payment = paymentQuery.rows[0];
      
      // Update invoice status
      if (payment.invoice_id) {
        await pool.query(
          `UPDATE invoices 
           SET status = 'paid', 
               paid_at = NOW(),
               payment_method = 'gcash'
           WHERE invoice_id = $1`,
          [payment.invoice_id]
        );
        console.log(`✅ Invoice ${payment.invoice_id} marked as paid`);
      }
      
      // Activate subscription
      if (payment.subscription_id) {
        await pool.query(
          `UPDATE customer_subscriptions 
           SET status = 'active',
               payment_status = 'paid',
               payment_confirmed_at = NOW()
           WHERE subscription_id = $1`,
          [payment.subscription_id]
        );
        console.log(`✅ Subscription ${payment.subscription_id} activated`);
      }
    }
    
    console.log(`✅ Payment ${paymentId} processed successfully`);
    
  } catch (error) {
    console.error('❌ Error handling payment.paid:', error);
  }
}

// Handle payment.failed event
async function handlePaymentFailed(eventData) {
  console.log('❌ Processing payment.failed event');
  
  try {
    const sourceId = eventData.attributes?.data?.attributes?.source?.id;
    
    // Update payment source status
    await pool.query(
      `UPDATE payment_sources 
       SET status = 'failed', 
           updated_at = NOW(),
           webhook_data = $2
       WHERE source_id = $1`,
      [sourceId, JSON.stringify(eventData)]
    );
    
    console.log(`❌ Payment failed for source ${sourceId}`);
    
  } catch (error) {
    console.error('❌ Error handling payment.failed:', error);
  }
}

// Create payment from chargeable source
async function createPaymentFromSource(sourceId, amount) {
  console.log(`💳 Creating payment from source ${sourceId}`);
  
  try {
    const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;
    
    const paymentData = {
      data: {
        attributes: {
          amount: amount,
          source: {
            id: sourceId,
            type: 'source'
          },
          currency: 'PHP',
          description: 'WSBS Subscription Payment'
        }
      }
    };
    
    const response = await fetch('https://api.paymongo.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(paymongoSecretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Payment created successfully: ${result.data.id}`);
    } else {
      console.error('❌ Failed to create payment:', result);
    }
    
  } catch (error) {
    console.error('❌ Error creating payment:', error);
  }
}

module.exports = router;
