/**
 * Smart Date Picker Component
 * 
 * This component handles date selection for special pickups with business rule validation.
 * It replaces the hardcoded date restrictions with flexible, configurable business logic.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { validateSpecialPickupSchedule, getDayNames, getAvailableDays } from '../config/businessRules';

const SmartDatePicker = ({ 
  selectedDate, 
  onDateChange, 
  userArea = '', 
  bagQuantity = 1,
  style = {} 
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateValidation, setDateValidation] = useState(null);

  // Validate the currently selected date whenever it changes
  useEffect(() => {
    if (selectedDate) {
      const validation = validateSpecialPickupSchedule(
        selectedDate,
        null, // No time validation for date picker
        userArea,
        bagQuantity
      );
      setDateValidation(validation);
    }
  }, [selectedDate, userArea, bagQuantity]);

  const handleDateChange = (event, newDate) => {
    setShowDatePicker(false);
    
    if (!newDate) return;

    // Validate the selected date
    const validation = validateSpecialPickupSchedule(
      newDate,
      null, // No time validation for date picker
      userArea,
      bagQuantity
    );

    if (!validation.isValid) {
      // Show detailed error message with suggestions
      let alertMessage = validation.reason;
      
      if (validation.suggestedDays && validation.suggestedDays.length > 0) {
        const suggestedDayNames = getDayNames(validation.suggestedDays);
        alertMessage += `\n\nAvailable days: ${suggestedDayNames.join(', ')}`;
      }
      
      if (validation.alternativeMessage) {
        alertMessage += `\n\n${validation.alternativeMessage}`;
      }
      
      if (validation.earliestDate) {
        alertMessage += `\n\nEarliest available date: ${validation.earliestDate.toLocaleDateString()}`;
      }

      Alert.alert(
        'Date Not Available',
        alertMessage,
        [
          { text: 'OK', style: 'default' },
          validation.suggestedDays && validation.suggestedDays.length > 0 && {
            text: 'Show Available Days',
            onPress: () => showAvailableDaysInfo()
          }
        ].filter(Boolean)
      );
      return;
    }

    // Show premium pricing warning if applicable
    if (validation.pricing && validation.pricing.isPremium) {
      Alert.alert(
        'Premium Pricing',
        `Special pickup on ${newDate.toLocaleDateString()} will cost ₱${validation.pricing.totalPrice.toFixed(2)} ` +
        `(${((validation.pricing.priceMultiplier - 1) * 100).toFixed(0)}% premium due to high demand).`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: () => {
              onDateChange(newDate);
              setDateValidation(validation);
            }
          }
        ]
      );
    } else {
      onDateChange(newDate);
      setDateValidation(validation);
    }
  };

  const showAvailableDaysInfo = () => {
    const availableDays = getAvailableDays();
    const dayNames = getDayNames(availableDays);
    
    Alert.alert(
      'Available Days for Special Pickup',
      `You can schedule special pickups on:\n\n${dayNames.join('\n')}\n\n` +
      'Note: Some days may have limited time slots or premium pricing.',
      [{ text: 'OK' }]
    );
  };

  const getDateButtonStyle = () => {
    if (!selectedDate) return styles.dateTimeButton;
    
    if (dateValidation && !dateValidation.isValid) {
      return [styles.dateTimeButton, styles.dateTimeButtonError];
    }
    
    if (dateValidation && dateValidation.pricing && dateValidation.pricing.isPremium) {
      return [styles.dateTimeButton, styles.dateTimeButtonPremium];
    }
    
    return [styles.dateTimeButton, styles.dateTimeButtonValid];
  };

  const getDateButtonText = () => {
    if (!selectedDate) return 'Select a date';
    
    const dateString = selectedDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    if (dateValidation && dateValidation.pricing && dateValidation.pricing.isPremium) {
      return `${dateString} (Premium)`;
    }
    
    return dateString;
  };

  const getDateButtonIcon = () => {
    if (!selectedDate) return 'calendar';
    
    if (dateValidation && !dateValidation.isValid) {
      return 'alert-circle';
    }
    
    if (dateValidation && dateValidation.pricing && dateValidation.pricing.isPremium) {
      return 'star';
    }
    
    return 'checkmark-circle';
  };

  const getDateButtonIconColor = () => {
    if (!selectedDate) return '#4CAF50';
    
    if (dateValidation && !dateValidation.isValid) {
      return '#F44336';
    }
    
    if (dateValidation && dateValidation.pricing && dateValidation.pricing.isPremium) {
      return '#FF9800';
    }
    
    return '#4CAF50';
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={getDateButtonStyle()}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.7}
      >
        <View style={styles.dateTimeIconContainer}>
          <Ionicons 
            name={getDateButtonIcon()} 
            size={22} 
            color={getDateButtonIconColor()} 
          />
        </View>
        <View style={styles.dateTimeTextContainer}>
          <Text style={styles.dateTimeLabel}>Pickup Date</Text>
          <Text style={styles.dateTimeValue}>
            {getDateButtonText()}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      {/* Validation Messages */}
      {dateValidation && dateValidation.pricing && dateValidation.pricing.isPremium && (
        <View style={styles.premiumNotice}>
          <Ionicons name="star" size={16} color="#FF9800" />
          <Text style={styles.premiumNoticeText}>
            Premium pricing: ₱{dateValidation.pricing.totalPrice.toFixed(2)} 
            ({((dateValidation.pricing.priceMultiplier - 1) * 100).toFixed(0)}% extra)
          </Text>
        </View>
      )}

      {dateValidation && dateValidation.restrictions && dateValidation.restrictions.length > 0 && (
        <View style={styles.restrictionsNotice}>
          <Ionicons name="information-circle" size={16} color="#2196F3" />
          <Text style={styles.restrictionsNoticeText}>
            Limited availability due to regular collection schedule
          </Text>
        </View>
      )}

      {/* Help Button */}
      <TouchableOpacity 
        style={styles.helpButton}
        onPress={showAvailableDaysInfo}
      >
        <Ionicons name="help-circle-outline" size={16} color="#666" />
        <Text style={styles.helpButtonText}>View available days</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
          maximumDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} // 30 days from now
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 8,
  },
  dateTimeButtonValid: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8e9',
  },
  dateTimeButtonError: {
    borderColor: '#F44336',
    backgroundColor: '#ffebee',
  },
  dateTimeButtonPremium: {
    borderColor: '#FF9800',
    backgroundColor: '#fff8e1',
  },
  dateTimeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  premiumNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  premiumNoticeText: {
    fontSize: 13,
    color: '#F57C00',
    marginLeft: 8,
    flex: 1,
  },
  restrictionsNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  restrictionsNoticeText: {
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 8,
    flex: 1,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  helpButtonText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
});

export default SmartDatePicker;

// Usage example:
/*
import SmartDatePicker from './components/SmartDatePicker';

// In your component:
<SmartDatePicker
  selectedDate={date}
  onDateChange={setDate}
  userArea={userProfile?.barangay || address}
  bagQuantity={bagQuantity}
/>
*/
