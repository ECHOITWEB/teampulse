// Temporary email service stub for Firebase Functions deployment
// TODO: Implement using Firebase Extensions or SendGrid

// Create transporter for sending emails
const createTransporter = () => {
  // For now, always use console logging
  return {
    sendMail: async (options) => {
      console.log('📧 Email would be sent:');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('Content:', options.text || options.html);
      return { messageId: 'stub-' + Date.now() };
    }
  };
};

const transporter = createTransporter();

// Send workspace invitation email
const sendWorkspaceInvitation = async (to, inviterName, workspaceName, invitationUrl) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@teampulse.com',
    to,
    subject: `${inviterName} invited you to join ${workspaceName} on TeamPulse`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited to TeamPulse!</h2>
        <p>${inviterName} has invited you to join the <strong>${workspaceName}</strong> workspace on TeamPulse.</p>
        <p>TeamPulse is a collaborative workspace where teams can manage goals, tasks, and communicate effectively.</p>
        <div style="margin: 30px 0;">
          <a href="${invitationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Invitation email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    throw error;
  }
};

// Send welcome email
const sendWelcomeEmail = async (to, userName) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@teampulse.com',
    to,
    subject: 'Welcome to TeamPulse!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to TeamPulse, ${userName}!</h2>
        <p>We're excited to have you on board. TeamPulse is your all-in-one workspace for team collaboration.</p>
        <h3>Getting Started:</h3>
        <ul>
          <li>Create your first workspace or join an existing one</li>
          <li>Set up your team's goals and objectives</li>
          <li>Start managing tasks with our Kanban boards</li>
          <li>Collaborate with your team in real-time</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The TeamPulse Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome emails - they're not critical
  }
};

// Send password reset email
const sendPasswordResetEmail = async (to, resetUrl) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@teampulse.com',
    to,
    subject: 'Reset your TeamPulse password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your TeamPulse password.</p>
        <p>Click the button below to reset your password:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendWorkspaceInvitation,
  sendWelcomeEmail,
  sendPasswordResetEmail
};