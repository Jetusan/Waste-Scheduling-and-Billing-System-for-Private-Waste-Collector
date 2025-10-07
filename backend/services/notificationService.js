const SibApiV3Sdk = require('sib-api-v3-sdk');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
const API_CONFIG = require('../config/config');

const getTransactionalEmailApi = () => {
  if (!process.env.BREVO_API_KEY) {
    console.warn('Brevo API key not configured - notification emails disabled');
    return null;
  }

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  return new SibApiV3Sdk.TransactionalEmailsApi();
};

const getSenderDetails = () => {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_SMTP_USER;

  if (!senderEmail) {
    console.warn('No Brevo sender email configured. Set BREVO_SENDER_EMAIL in env.');
  }

  return {
    name: process.env.BREVO_SENDER_NAME || 'WSBS Notifications',
    email: senderEmail
  };
};

const loadTemplate = (templateName) => {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
  const source = fs.readFileSync(templatePath, 'utf8');
  return handlebars.compile(source);
};

const sendEmail = async (templateName, subject, to, data) => {
  try {
    const template = loadTemplate(templateName);
    const html = template(data);
    const emailClient = getTransactionalEmailApi();

    if (!emailClient) {
      return { success: false, error: 'Email service not configured' };
    }

    const sender = getSenderDetails();
    const toList = Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }];
    const response = await emailClient.sendTransacEmail({
      sender,
      to: toList,
      subject,
      htmlContent: html
    });

    console.log(`✅ Email sent: ${subject} to ${to}
  Message ID: ${response['messageId'] || response.messageId}`);
    return { success: true, messageId: response['messageId'] || response.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

const sendRegistrationApprovalEmail = async (email, name) => {
  return sendEmail('registrationApproval', 'Resident Registration Approved', email, {
    name,
    loginUrl: `${API_CONFIG.PUBLIC_URL || 'https://waste-scheduling-and-billing-system-for.onrender.com'}/login`
  });
};

const sendRegistrationRejectionEmail = async (email, name, reason) => {
  return sendEmail('registrationRejection', 'Resident Registration Requires Updates', email, {
    name,
    reason,
    supportEmail: process.env.SUPPORT_EMAIL || 'support@wsbs.com'
  });
};

module.exports = {
  sendRegistrationApprovalEmail,
  sendRegistrationRejectionEmail
};
