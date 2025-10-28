/**
 * Subscription Status Management Utility
 * 
 * This utility provides a centralized way to manage subscription statuses
 * across the entire application, ensuring consistency and preventing conflicts.
 */

/**
 * Standard subscription status definitions
 */
export const SUBSCRIPTION_STATUS = {
  // Active states
  ACTIVE: 'active',
  
  // Pending payment states
  PENDING_GCASH: 'pending_gcash',
  PENDING_MANUAL_GCASH: 'pending_manual_gcash', 
  PENDING_CASH: 'pending_cash',
  PENDING_PAYMENT: 'pending_payment', // Generic pending
  
  // Inactive states
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  
  // Error states
  PAYMENT_FAILED: 'payment_failed',
  UNKNOWN: 'unknown'
};

/**
 * Invoice status definitions
 */
export const INVOICE_STATUS = {
  PAID: 'paid',
  UNPAID: 'unpaid',
  OVERDUE: 'overdue',
  VOIDED: 'voided',
  PROCESSING: 'processing'
};

/**
 * Status priority order (higher index = higher priority)
 * Used when multiple status sources exist
 */
const STATUS_PRIORITY = [
  SUBSCRIPTION_STATUS.UNKNOWN,
  SUBSCRIPTION_STATUS.CANCELLED,
  SUBSCRIPTION_STATUS.EXPIRED,
  SUBSCRIPTION_STATUS.SUSPENDED,
  SUBSCRIPTION_STATUS.PAYMENT_FAILED,
  SUBSCRIPTION_STATUS.PENDING_PAYMENT,
  SUBSCRIPTION_STATUS.PENDING_CASH,
  SUBSCRIPTION_STATUS.PENDING_MANUAL_GCASH,
  SUBSCRIPTION_STATUS.PENDING_GCASH,
  SUBSCRIPTION_STATUS.ACTIVE
];

/**
 * Normalizes subscription status from various API response formats
 * @param {Object} subscriptionData - Raw subscription data from API
 * @returns {Object} - Normalized subscription status object
 */
export const normalizeSubscriptionStatus = (subscriptionData) => {
  if (!subscriptionData) {
    return {
      status: SUBSCRIPTION_STATUS.UNKNOWN,
      hasSubscription: false,
      isActive: false,
      isPending: false,
      canAccess: false
    };
  }

  // Extract status from various possible sources (in priority order)
  const possibleStatuses = [
    subscriptionData.uiState,
    subscriptionData.status,
    subscriptionData.subscription?.status,
    subscriptionData.subscription?.uiState
  ].filter(Boolean);

  // Find the highest priority status
  let finalStatus = SUBSCRIPTION_STATUS.UNKNOWN;
  let highestPriority = -1;

  for (const status of possibleStatuses) {
    const priority = STATUS_PRIORITY.indexOf(status);
    if (priority > highestPriority) {
      highestPriority = priority;
      finalStatus = status;
    }
  }

  // Determine subscription existence
  const hasSubscription = Boolean(
    subscriptionData.hasSubscription ?? 
    subscriptionData.has_subscription ?? 
    subscriptionData.subscription
  );

  // Determine access permissions
  const isActive = finalStatus === SUBSCRIPTION_STATUS.ACTIVE;
  const isPending = finalStatus.startsWith('pending_');
  const canAccess = isActive || isPending;

  return {
    status: finalStatus,
    hasSubscription,
    isActive,
    isPending,
    canAccess,
    rawData: subscriptionData // Keep original data for debugging
  };
};

/**
 * Normalizes invoice status from various API response formats
 * @param {Object} invoiceData - Raw invoice data from API
 * @returns {Object} - Normalized invoice status object
 */
export const normalizeInvoiceStatus = (invoiceData) => {
  if (!invoiceData) {
    return {
      status: INVOICE_STATUS.UNPAID,
      isPaid: false,
      isOverdue: false,
      amount: 0,
      dueDate: null
    };
  }

  // Extract status from various possible sources
  const rawStatus = (
    invoiceData.status || 
    invoiceData.invoice_status || 
    INVOICE_STATUS.UNPAID
  ).toString().toLowerCase();

  // Normalize status
  let status = INVOICE_STATUS.UNPAID;
  if (Object.values(INVOICE_STATUS).includes(rawStatus)) {
    status = rawStatus;
  }

  // Calculate overdue status
  const dueDate = invoiceData.dueDate || invoiceData.due_date;
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== INVOICE_STATUS.PAID;

  return {
    status: isOverdue ? INVOICE_STATUS.OVERDUE : status,
    isPaid: status === INVOICE_STATUS.PAID,
    isOverdue: Boolean(isOverdue),
    amount: parseFloat(invoiceData.amount || 0),
    dueDate: dueDate ? new Date(dueDate) : null,
    rawData: invoiceData
  };
};

/**
 * Gets UI display properties for a subscription status
 * @param {string} status - Normalized subscription status
 * @returns {Object} - UI properties (color, icon, text)
 */
export const getStatusUIProperties = (status) => {
  const properties = {
    [SUBSCRIPTION_STATUS.ACTIVE]: {
      color: '#28a745',
      icon: 'checkmark-circle',
      text: 'ACTIVE',
      description: 'Your subscription is active'
    },
    [SUBSCRIPTION_STATUS.PENDING_GCASH]: {
      color: '#ffc107',
      icon: 'time',
      text: 'PENDING PAYMENT',
      description: 'Waiting for GCash payment confirmation'
    },
    [SUBSCRIPTION_STATUS.PENDING_MANUAL_GCASH]: {
      color: '#ffc107',
      icon: 'camera',
      text: 'PENDING PAYMENT',
      description: 'Please upload your GCash receipt'
    },
    [SUBSCRIPTION_STATUS.PENDING_CASH]: {
      color: '#17a2b8',
      icon: 'cash',
      text: 'AWAITING COLLECTION',
      description: 'Pay the collector during pickup'
    },
    [SUBSCRIPTION_STATUS.SUSPENDED]: {
      color: '#dc3545',
      icon: 'pause-circle',
      text: 'SUSPENDED',
      description: 'Subscription is temporarily suspended'
    },
    [SUBSCRIPTION_STATUS.CANCELLED]: {
      color: '#6c757d',
      icon: 'close-circle',
      text: 'CANCELLED',
      description: 'Subscription has been cancelled'
    },
    [SUBSCRIPTION_STATUS.EXPIRED]: {
      color: '#dc3545',
      icon: 'alert-circle',
      text: 'EXPIRED',
      description: 'Subscription has expired'
    }
  };

  return properties[status] || {
    color: '#6c757d',
    icon: 'help-circle',
    text: 'UNKNOWN',
    description: 'Status unknown'
  };
};

/**
 * Determines what actions are available for a given subscription status
 * @param {Object} normalizedStatus - Result from normalizeSubscriptionStatus
 * @param {Object} invoiceStatus - Result from normalizeInvoiceStatus
 * @returns {Array} - Available actions
 */
export const getAvailableActions = (normalizedStatus, invoiceStatus = null) => {
  const baseActions = [
    { id: 'view_schedule', label: 'View Collection Schedule', primary: false },
    { id: 'payment_history', label: 'Payment History', primary: false },
    { id: 'contact_support', label: 'Contact Support', primary: false }
  ];

  if (!normalizedStatus.hasSubscription) {
    return [
      { id: 'subscribe', label: 'Subscribe Now', primary: true }
    ];
  }

  const actions = [...baseActions];

  // Add status-specific actions
  switch (normalizedStatus.status) {
    case SUBSCRIPTION_STATUS.ACTIVE:
      actions.push(
        { id: 'view_receipt', label: '📄 View Payment Receipt', primary: false },
        { id: 'renew_subscription', label: 'Renew Subscription', primary: false }
      );
      break;

    case SUBSCRIPTION_STATUS.PENDING_GCASH:
      actions.unshift({ id: 'continue_gcash_payment', label: 'Continue GCash Payment', primary: true });
      break;

    case SUBSCRIPTION_STATUS.PENDING_MANUAL_GCASH:
      actions.unshift({ id: 'upload_receipt', label: 'Upload GCash Receipt', primary: true });
      break;

    case SUBSCRIPTION_STATUS.PENDING_CASH:
      // No additional actions needed - just wait for collector
      break;

    case SUBSCRIPTION_STATUS.SUSPENDED:
    case SUBSCRIPTION_STATUS.CANCELLED:
    case SUBSCRIPTION_STATUS.EXPIRED:
      actions.unshift({ id: 'reactivate_subscription', label: 'Reactivate Subscription', primary: true });
      break;
  }

  // Add cancel action for active/pending subscriptions
  if (normalizedStatus.isActive || normalizedStatus.isPending) {
    actions.push({ id: 'cancel_subscription', label: 'Cancel Subscription', primary: false });
  }

  return actions;
};

/**
 * Validates status transitions to prevent invalid state changes
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Desired status
 * @returns {Object} - Validation result
 */
export const validateStatusTransition = (fromStatus, toStatus) => {
  const validTransitions = {
    [SUBSCRIPTION_STATUS.PENDING_GCASH]: [
      SUBSCRIPTION_STATUS.ACTIVE,
      SUBSCRIPTION_STATUS.PAYMENT_FAILED,
      SUBSCRIPTION_STATUS.CANCELLED
    ],
    [SUBSCRIPTION_STATUS.PENDING_MANUAL_GCASH]: [
      SUBSCRIPTION_STATUS.ACTIVE,
      SUBSCRIPTION_STATUS.PAYMENT_FAILED,
      SUBSCRIPTION_STATUS.CANCELLED
    ],
    [SUBSCRIPTION_STATUS.PENDING_CASH]: [
      SUBSCRIPTION_STATUS.ACTIVE,
      SUBSCRIPTION_STATUS.CANCELLED
    ],
    [SUBSCRIPTION_STATUS.ACTIVE]: [
      SUBSCRIPTION_STATUS.SUSPENDED,
      SUBSCRIPTION_STATUS.CANCELLED,
      SUBSCRIPTION_STATUS.EXPIRED,
      SUBSCRIPTION_STATUS.PENDING_GCASH, // For renewals
      SUBSCRIPTION_STATUS.PENDING_MANUAL_GCASH,
      SUBSCRIPTION_STATUS.PENDING_CASH
    ],
    [SUBSCRIPTION_STATUS.SUSPENDED]: [
      SUBSCRIPTION_STATUS.ACTIVE,
      SUBSCRIPTION_STATUS.CANCELLED
    ],
    [SUBSCRIPTION_STATUS.CANCELLED]: [
      SUBSCRIPTION_STATUS.PENDING_GCASH, // For reactivation
      SUBSCRIPTION_STATUS.PENDING_MANUAL_GCASH,
      SUBSCRIPTION_STATUS.PENDING_CASH
    ]
  };

  const allowedTransitions = validTransitions[fromStatus] || [];
  const isValid = allowedTransitions.includes(toStatus);

  return {
    isValid,
    reason: isValid ? null : `Cannot transition from ${fromStatus} to ${toStatus}`
  };
};

// Example usage:
/*
import { 
  normalizeSubscriptionStatus, 
  normalizeInvoiceStatus, 
  getStatusUIProperties, 
  getAvailableActions 
} from './utils/subscriptionStatusManager';

// In a React component:
const subscriptionStatus = normalizeSubscriptionStatus(apiResponse);
const invoiceStatus = normalizeInvoiceStatus(apiResponse.currentInvoice);
const uiProperties = getStatusUIProperties(subscriptionStatus.status);
const availableActions = getAvailableActions(subscriptionStatus, invoiceStatus);

// Use normalized data
if (subscriptionStatus.canAccess) {
  // Show subscription content
}

// Display status
<Text style={{ color: uiProperties.color }}>{uiProperties.text}</Text>
*/
