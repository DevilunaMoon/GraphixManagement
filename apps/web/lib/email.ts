import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendNotificationEmail = async (to: string, deviceName: string, progress: string, isNew: boolean) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("GMAIL_USER or GMAIL_APP_PASSWORD is not set");
    return;
  }

  let subject = '';
  let text = '';
  let html = '';

  if (isNew) {
    subject = `Graphix Management - Repair Started for ${deviceName}`;
    text = `Hello,\n\nWe have received your device (${deviceName}) and started the repair process. Current progress: ${progress}.\n\nYou can track the progress on your customer dashboard.\n\nThank you,\nGraphix Team`;
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #bd00ff;">Repair Started</h2>
        <p>Hello,</p>
        <p>We have successfully registered your device <strong>${deviceName}</strong> into our system and the repair process has begun.</p>
        <p><strong>Current Status/Progress:</strong> ${progress}</p>
        <p>You can track the live progress at any time by logging into your customer dashboard.</p>
        <br/>
        <p>Thank you,</p>
        <p><strong>Graphix Management Team</strong></p>
      </div>
    `;
  } else {
    subject = `Graphix Management - Progress Update for ${deviceName}`;
    text = `Hello,\n\nThere is an update on your device (${deviceName}). Current progress: ${progress}.\n\nYou can track the progress on your customer dashboard.\n\nThank you,\nGraphix Team`;
    html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #bd00ff;">Repair Progress Update</h2>
        <p>Hello,</p>
        <p>There has been an update regarding your device: <strong>${deviceName}</strong>.</p>
        <p><strong>New Progress:</strong> ${progress}</p>
        <p>You can track the live progress at any time by logging into your customer dashboard.</p>
        <br/>
        <p>Thank you,</p>
        <p><strong>Graphix Management Team</strong></p>
      </div>
    `;
  }

  try {
    const info = await transporter.sendMail({
      from: '"Graphix PC Repair" <' + process.env.GMAIL_USER + '>',
      to,
      subject,
      text,
      html,
    });
    console.log("Email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email: ", error);
    return false;
  }
};

export const sendPasswordResetEmail = async (to: string, token: string, baseUrl: string) => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("GMAIL_USER or GMAIL_APP_PASSWORD is not set");
    return;
  }

  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  const subject = "Graphix Management - Password Reset Request";
  const text = `Hello,\n\nYou requested to reset your password. Please click the link below to reset it:\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\nThank you,\nGraphix Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #bd00ff;">Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password for your Graphix Management account.</p>
      <p>Please click the button below to reset your password. This link is valid for 1 hour.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #bd00ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all;"><a href="${resetLink}">${resetLink}</a></p>
      <br/>
      <p>If you did not request a password reset, please ignore this email.</p>
      <p>Thank you,</p>
      <p><strong>Graphix Management Team</strong></p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"Graphix PC Repair" <' + process.env.GMAIL_USER + '>',
      to,
      subject,
      text,
      html,
    });
    console.log("Reset email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending reset email: ", error);
    return false;
  }
};
