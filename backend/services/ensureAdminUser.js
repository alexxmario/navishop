const User = require('../models/User');

/**
 * Ensures there is at least one admin account available using the
 * ADMIN_EMAIL / ADMIN_PASSWORD env vars. This runs on startup so Vercel and
 * local builds share the same credentials without manual seeding.
 */
const ensureAdminUser = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Admin User';
  const forceReset = process.env.ADMIN_FORCE_RESET === 'true';

  if (!adminEmail || !adminPassword) {
    console.warn('Default admin seed skipped: ADMIN_EMAIL or ADMIN_PASSWORD missing.');
    return;
  }

  const normalizedEmail = adminEmail.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (!existingUser) {
    const user = new User({
      name: adminName,
      email: normalizedEmail,
      password: adminPassword,
      role: 'admin'
    });
    await user.save();
    console.log(`Default admin user created for ${normalizedEmail}`);
    return;
  }

  if (forceReset) {
    existingUser.name = adminName;
    existingUser.role = 'admin';
    existingUser.password = adminPassword; // will be hashed by pre-save hook
    await existingUser.save();
    console.log(`Default admin user credentials refreshed for ${normalizedEmail}`);
    return;
  }

  console.log(`Admin user ${normalizedEmail} already exists. Skipping seed.`);
};

module.exports = ensureAdminUser;
