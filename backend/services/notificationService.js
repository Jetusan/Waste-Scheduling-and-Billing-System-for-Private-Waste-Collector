const { sendVerificationEmail } = require('./emailService');
const transporter = require('./mailer');

// Send registration approval notification to user
const sendRegistrationApprovalEmail = async (userEmail, userName) => {
  try {
    const info = await transporter.sendMail({
      from: `"WSBS" <${process.env.BREVO_SENDER_EMAIL}>`,
      to: userEmail,
      subject: "Registration Approved - Welcome to Waste Management System!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Registration Approved! 🎉</h2>
          <p>Hello ${userName},</p>
          <p>Great news! Your registration for the Waste Management System has been approved by our admin team.</p>
          
          <div style="background-color: #E8F5E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #2E7D32; margin-top: 0;">What's Next?</h3>
            <ul style="color: #2E7D32;">
              <li>You can now log in to your account using your credentials</li>
              <li>Access all waste collection services</li>
              <li>Schedule special pickups</li>
              <li>View collection schedules for your area</li>
              <li>Make payments for services</li>
            </ul>
          </div>
          
          <div style="margin: 30px 0; text-align: center;">
            <p style="color: #666;">Ready to get started?</p>
            <p style="font-size: 18px; font-weight: bold; color: #4CAF50;">Welcome to our community!</p>
          </div>
          
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
            If you have any questions, please contact our support team. Thank you for choosing our Waste Management System.
          </p>
        </div>
      `,
    });

    console.log('✅ Registration approval email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send registration approval email:', error);
    throw error;
  }
};

// Send registration rejection notification to user
const sendRegistrationRejectionEmail = async (userEmail, userName, reason = '') => {
  try {
    const info = await transporter.sendMail({
      from: `"WSBS" <${process.env.BREVO_SENDER_EMAIL}>`,
      to: userEmail,
      subject: "Registration Update - Waste Management System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #E53935;">Registration Update</h2>
          <p>Hello ${userName},</p>
          <p>Thank you for your interest in our Waste Management System. After reviewing your registration, we need to inform you of the following:</p>
          
          <div style="background-color: #FFEBEE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #E53935;">
            <p style="color: #C62828; margin: 0;">
              Your registration requires additional review or documentation.
              ${reason ? `<br><br><strong>Reason:</strong> ${reason}` : ''}
            </p>
          </div>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #333;">What You Can Do:</h3>
            <ul style="color: #666;">
              <li>Contact our support team for clarification</li>
              <li>Provide additional documentation if requested</li>
              <li>Resubmit your registration with corrected information</li>
            </ul>
          </div>
          
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">
            We appreciate your understanding. Please contact our support team if you have any questions about this decision.
          </p>
        </div>
      `,
    });

    console.log('✅ Registration rejection email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send registration rejection email:', error);
    throw error;
  }
};

module.exports = {
  sendRegistrationApprovalEmail,
  sendRegistrationRejectionEmail
};
