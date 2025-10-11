// Mobile App Environment Validator
import { Platform } from 'react-native';
import Constants from 'expo-constants';

class MobileEnvValidator {
  constructor() {
    this.warnings = [];
    this.errors = [];
  }

  // Validate mobile app environment
  validate() {
    console.log('🔍 Validating mobile app environment...\n');

    // Check Expo configuration
    this.validateExpoConfig();
    
    // Check API configuration
    this.validateApiConfig();
    
    // Check platform-specific settings
    this.validatePlatformConfig();
    
    // Print summary
    this.printSummary();
    
    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  validateExpoConfig() {
    const { manifest, expoConfig } = Constants;
    
    // Check app version
    if (manifest?.version || expoConfig?.version) {
      const version = manifest?.version || expoConfig?.version;
      console.log(`✅ App Version: ${version}`);
    } else {
      this.warnings.push('App version not found in manifest');
    }

    // Check bundle identifier
    const bundleId = manifest?.ios?.bundleIdentifier || expoConfig?.ios?.bundleIdentifier;
    if (bundleId) {
      console.log(`✅ Bundle ID: ${bundleId}`);
    } else {
      this.warnings.push('iOS bundle identifier not configured');
    }

    // Check Android package
    const androidPackage = manifest?.android?.package || expoConfig?.android?.package;
    if (androidPackage) {
      console.log(`✅ Android Package: ${androidPackage}`);
    } else {
      this.warnings.push('Android package name not configured');
    }

    // Check SDK version
    if (Constants.expoVersion) {
      console.log(`✅ Expo SDK: ${Constants.expoVersion}`);
    }
  }

  validateApiConfig() {
    // Check if API_BASE_URL is properly configured
    try {
      const { API_BASE_URL } = require('../app/config');
      
      if (!API_BASE_URL) {
        this.errors.push('API_BASE_URL is not configured');
        return;
      }

      // Validate URL format
      try {
        new URL(API_BASE_URL);
        console.log(`✅ API Base URL: ${API_BASE_URL}`);
      } catch {
        this.errors.push(`Invalid API_BASE_URL format: ${API_BASE_URL}`);
      }

      // Check if it's pointing to localhost in production
      if (!__DEV__ && API_BASE_URL.includes('localhost')) {
        this.errors.push('Production build is pointing to localhost API');
      }

      // Check if it's HTTPS in production
      if (!__DEV__ && !API_BASE_URL.startsWith('https://')) {
        this.warnings.push('Production API should use HTTPS');
      }

    } catch (error) {
      this.errors.push('Failed to load API configuration');
    }
  }

  validatePlatformConfig() {
    console.log(`✅ Platform: ${Platform.OS} ${Platform.Version}`);
    
    // Check if running on device or simulator
    if (Constants.isDevice) {
      console.log('✅ Running on physical device');
    } else {
      console.log('⚠️  Running on simulator/emulator');
    }

    // Check development mode
    if (__DEV__) {
      console.log('⚠️  Development mode enabled');
    } else {
      console.log('✅ Production build');
    }

    // Platform-specific checks
    if (Platform.OS === 'ios') {
      this.validateiOSConfig();
    } else if (Platform.OS === 'android') {
      this.validateAndroidConfig();
    }
  }

  validateiOSConfig() {
    // Check iOS-specific configurations
    const iosVersion = Platform.Version;
    if (iosVersion < 13) {
      this.warnings.push(`iOS version ${iosVersion} may not support all features`);
    }
  }

  validateAndroidConfig() {
    // Check Android-specific configurations
    const androidVersion = Platform.Version;
    if (androidVersion < 23) {
      this.warnings.push(`Android API level ${androidVersion} may not support all features`);
    }
  }

  printSummary() {
    console.log('\n📊 Mobile Environment Validation Summary:');
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.error('\n❌ Critical environment errors:');
      this.errors.forEach(error => console.error(`❌ ${error}`));
    }

    if (this.warnings.length > 0) {
      console.warn('\n⚠️ Environment warnings:');
      this.warnings.forEach(warning => console.warn(`⚠️  ${warning}`));
    }

    if (this.errors.length === 0) {
      console.log('\n✅ Mobile environment validation completed successfully!\n');
    } else {
      console.error('\n❌ Mobile environment validation failed!\n');
    }
  }

  // Get configuration info for debugging
  getConfigInfo() {
    return {
      platform: Platform.OS,
      platformVersion: Platform.Version,
      isDevice: Constants.isDevice,
      isDevelopment: __DEV__,
      expoVersion: Constants.expoVersion,
      appVersion: Constants.manifest?.version || Constants.expoConfig?.version,
      bundleId: Constants.manifest?.ios?.bundleIdentifier || Constants.expoConfig?.ios?.bundleIdentifier,
      androidPackage: Constants.manifest?.android?.package || Constants.expoConfig?.android?.package
    };
  }
}

// Create validator instance
const mobileEnvValidator = new MobileEnvValidator();

// Export validation functions
export const validateMobileEnvironment = () => mobileEnvValidator.validate();
export const getMobileConfigInfo = () => mobileEnvValidator.getConfigInfo();
export default mobileEnvValidator;
