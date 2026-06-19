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

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('Missing RESEND_API_KEY environment variable.');
    return res.status(500).json({ error: 'Mail service is not configured yet. Please set RESEND_API_KEY in Vercel.' });
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

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'PixelAI Studio <onboarding@resend.dev>',
        to: [email],
        subject: `Welcome to PixelAI Studio, ${name || 'Creator'}!`,
        html: htmlContent
      })
    });

    const resData = await response.json();
    if (!response.ok) {
      console.error('Resend API response error:', resData);
      return res.status(response.status).json({ error: resData.message || 'Failed to send welcome email.' });
    }

    return res.status(200).json({ success: true, data: resData });
  } catch (error) {
    console.error('Welcome email serverless exception:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
