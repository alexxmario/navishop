const express = require('express');
const crypto = require('crypto');
const B2BApplication = require('../models/B2BApplication');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendB2BApplicationNotification, sendB2BApplicationConfirmation } = require('../services/emailService');
const router = express.Router();

// Generate secure random password
function generateSecurePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  const randomBytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

// Submit new B2B application (public endpoint)
router.post('/', async (req, res) => {
  try {
    const {
      contactName,
      email,
      phone,
      companyName,
      vatNumber,
      companyAddress
    } = req.body;

    // Validate required fields
    if (!contactName || !email || !phone || !companyName || !vatNumber || !companyAddress) {
      return res.status(400).json({
        message: 'Toate campurile obligatorii trebuie completate'
      });
    }

    // Check if email already has a pending application
    const existingPendingApplication = await B2BApplication.findOne({
      email: email.toLowerCase(),
      status: 'pending'
    });

    if (existingPendingApplication) {
      return res.status(400).json({
        message: 'Exista deja o cerere in asteptare pentru acest email'
      });
    }

    // Check if email already has an approved business account
    const existingBusinessUser = await User.findOne({
      email: email.toLowerCase(),
      accountType: 'business'
    });

    if (existingBusinessUser) {
      return res.status(400).json({
        message: 'Exista deja un cont B2B pentru acest email'
      });
    }

    // Create new application
    const application = new B2BApplication({
      contactName,
      email: email.toLowerCase(),
      phone,
      companyName,
      vatNumber,
      companyAddress
    });

    await application.save();

    // Send email notifications (don't wait for completion, don't block response)
    Promise.all([
      sendB2BApplicationNotification(application),
      sendB2BApplicationConfirmation(application)
    ]).catch(err => {
      console.error('Error sending B2B application emails:', err);
      // Email errors shouldn't fail the application submission
    });

    res.status(201).json({
      message: 'Cererea a fost trimisa cu succes. Veti fi contactat in cel mai scurt timp.',
      applicationId: application._id
    });
  } catch (error) {
    console.error('Error creating B2B application:', error);
    res.status(500).json({
      message: 'Eroare la trimiterea cererii',
      error: error.message
    });
  }
});

// Get all B2B applications (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const {
      page = 1,
      limit = 25,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { companyName: new RegExp(search, 'i') },
        { contactName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { vatNumber: new RegExp(search, 'i') }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const applications = await B2BApplication.find(query)
      .populate('reviewedBy', 'name email')
      .populate('createdUserId', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await B2BApplication.countDocuments(query);

    res.json({
      data: applications,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching B2B applications:', error);
    res.status(500).json({
      message: 'Error fetching applications',
      error: error.message
    });
  }
});

// Get single B2B application (admin only)
router.get('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const application = await B2BApplication.findById(req.params.id)
      .populate('reviewedBy', 'name email')
      .populate('createdUserId', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error fetching B2B application:', error);
    res.status(500).json({
      message: 'Error fetching application',
      error: error.message
    });
  }
});

// Approve B2B application (admin only)
router.put('/:id/approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const application = await B2BApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Application has already been processed' });
    }

    // Check if user with this email already exists
    let user = await User.findOne({ email: application.email });

    if (user) {
      // User exists - upgrade to business account
      user.accountType = 'business';
      user.businessDetails = {
        companyName: application.companyName,
        vatNumber: application.vatNumber,
        companyAddress: application.companyAddress
      };
      user.b2bDiscount = 20;
      await user.save();

      // Update application
      application.status = 'approved';
      application.reviewedBy = req.userId;
      application.reviewedAt = new Date();
      application.createdUserId = user._id;
      application.temporaryPassword = null; // No new password needed
      await application.save();

      res.json({
        message: 'Contul existent a fost actualizat la cont B2B',
        application,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          accountType: user.accountType
        },
        existingAccount: true
      });
    } else {
      // Create new user account
      const temporaryPassword = generateSecurePassword();

      user = new User({
        name: application.contactName,
        email: application.email,
        password: temporaryPassword,
        accountType: 'business',
        businessDetails: {
          companyName: application.companyName,
          vatNumber: application.vatNumber,
          companyAddress: application.companyAddress
        },
        b2bDiscount: 20
      });

      await user.save();

      // Update application
      application.status = 'approved';
      application.reviewedBy = req.userId;
      application.reviewedAt = new Date();
      application.createdUserId = user._id;
      application.temporaryPassword = temporaryPassword;
      await application.save();

      res.json({
        message: 'Contul B2B a fost creat cu succes',
        application,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          accountType: user.accountType
        },
        temporaryPassword,
        existingAccount: false
      });
    }
  } catch (error) {
    console.error('Error approving B2B application:', error);
    res.status(500).json({
      message: 'Error approving application',
      error: error.message
    });
  }
});

// Reject B2B application (admin only)
router.put('/:id/reject', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { reviewNotes } = req.body;

    const application = await B2BApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: 'Application has already been processed' });
    }

    application.status = 'rejected';
    application.reviewedBy = req.userId;
    application.reviewedAt = new Date();
    application.reviewNotes = reviewNotes || '';
    await application.save();

    res.json({
      message: 'Cererea a fost respinsa',
      application
    });
  } catch (error) {
    console.error('Error rejecting B2B application:', error);
    res.status(500).json({
      message: 'Error rejecting application',
      error: error.message
    });
  }
});

module.exports = router;
