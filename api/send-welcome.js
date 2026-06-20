const nodemailer = require('nodemailer');
const emailTemplate = require('./emailTemplate');

module.exports = async function handler(req, res) {
  // Configure CORS for client-side invocations
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, name, origin } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Get SMTP credentials from Vercel environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.error('Missing SMTP configuration environment variables.');
    return res.status(500).json({ 
      error: 'SMTP mail service is not configured. Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in Vercel settings.' 
    });
  }

  try {
    let htmlContent = emailTemplate;

    // Dynamically replace the default login href and image paths with absolute paths from the client origin
    const absoluteOrigin = origin || 'https://pixel-ai-studio-liart.vercel.app';
    
    // Replace URL redirect targets in email
    htmlContent = htmlContent.replace(/href="https:\/\/pixel-ai-studio-liart\.vercel\.app"/g, `href="${absoluteOrigin}"`);
    
    // Replace image targets in email
    htmlContent = htmlContent.replace(/src="images\/2fcc6b7420cbeb0685a89c7a68c635f1\.png"/g, `src="${absoluteOrigin}/email-assets/2fcc6b7420cbeb0685a89c7a68c635f1.png"`);
    htmlContent = htmlContent.replace(/src="images\/343b9a3afd264a9cbed272e60d4851e9\.png"/g, `src="${absoluteOrigin}/email-assets/343b9a3afd264a9cbed272e60d4851e9.png"`);

    // Replace name placeholder in email
    htmlContent = htmlContent.replace(/{{name}}/g, name || 'Creator');

    // Create a Nodemailer transporter using SMTP credentials
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465, // true for port 465, false for 587 or others
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    // Send mail
    const mailOptions = {
      from: `"PixelAI Studio" <${smtpUser}>`,
      to: email,
      subject: `Welcome to PixelAI Studio, ${name || 'Creator'}!`,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent via SMTP successfully:', info.messageId);

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Welcome email SMTP exception:', error);
    return res.status(500).json({ error: error.message || 'Failed to send welcome email via SMTP.' });
  }
};
