const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send email notification for new B2B application
const sendB2BApplicationNotification = async (application) => {
  try {
    const transporter = createTransporter();

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"PilotOn B2B" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `Cerere Nouă Cont B2B - ${application.companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Cerere Nouă Cont B2B</h2>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Informații Companie</h3>
            <p><strong>Denumire:</strong> ${application.companyName}</p>
            <p><strong>CUI/CIF:</strong> ${application.vatNumber}</p>
            <p><strong>Adresa:</strong><br>
              ${application.companyAddress.street}<br>
              ${application.companyAddress.city}, ${application.companyAddress.county}<br>
              ${application.companyAddress.postalCode}
            </p>
          </div>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Persoană de Contact</h3>
            <p><strong>Nume:</strong> ${application.contactName}</p>
            <p><strong>Email:</strong> ${application.email}</p>
            <p><strong>Telefon:</strong> ${application.phone}</p>
          </div>

          <div style="margin: 30px 0;">
            <a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:3002'}/admin/#/b2b-applications/${application._id}/show"
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Vezi Cererea în Panoul Admin
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Acest email a fost generat automat de sistemul PilotOn B2B.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('B2B application notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending B2B application notification:', error);
    return { success: false, error: error.message };
  }
};

// Send confirmation email to applicant
const sendB2BApplicationConfirmation = async (application) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"PilotOn" <${process.env.EMAIL_USER}>`,
      to: application.email,
      subject: 'Cererea ta pentru Cont B2B a fost primită',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Bună ziua, ${application.contactName}!</h2>

          <p>Mulțumim pentru interesul acordat contului B2B PilotOn.</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;">
              Am primit cererea dumneavoastră și o vom procesa în cel mai scurt timp posibil.
              Veți fi contactat în curând cu detaliile contului B2B.
            </p>
          </div>

          <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Beneficiile contului B2B:</strong></p>
            <ul style="margin: 10px 0;">
              <li>Reducere 20% la toate produsele</li>
              <li>Prețuri speciale pentru comenzi mari</li>
              <li>Suport prioritar</li>
            </ul>
          </div>

          <p>Dacă aveți întrebări, nu ezitați să ne contactați.</p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Cu stimă,<br>
            Echipa PilotOn
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('B2B application confirmation sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending B2B application confirmation:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendB2BApplicationNotification,
  sendB2BApplicationConfirmation,
};
