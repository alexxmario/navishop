const express = require('express');
const ContactMessage = require('../models/ContactMessage');
const auth = require('../middleware/auth');
const { sendContactMessageNotification } = require('../services/emailService');
const router = express.Router();

// Submit a new contact message (public endpoint)
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      carBrand,
      carModel,
      year,
      subject,
      message
    } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: 'Numele, email-ul, subiectul și mesajul sunt obligatorii'
      });
    }

    const contactMessage = new ContactMessage({
      name,
      email: email.toLowerCase(),
      phone,
      carBrand,
      carModel,
      year,
      subject,
      message
    });

    await contactMessage.save();

    // Notify admin by email (non-blocking — email errors shouldn't fail the submission)
    sendContactMessageNotification(contactMessage).catch(err => {
      console.error('Error sending contact message notification:', err);
    });

    res.status(201).json({
      message: 'Mesajul a fost trimis cu succes. Îți vom răspunde în cel mai scurt timp.',
      messageId: contactMessage._id
    });
  } catch (error) {
    console.error('Error creating contact message:', error);
    res.status(500).json({
      message: 'Eroare la trimiterea mesajului',
      error: error.message
    });
  }
});

// Get all contact messages (admin only)
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
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
        { message: new RegExp(search, 'i') }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await ContactMessage.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ContactMessage.countDocuments(query);

    res.json({
      data: messages,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({
      message: 'Error fetching contact messages',
      error: error.message
    });
  }
});

// Get single contact message (admin only)
router.get('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const contactMessage = await ContactMessage.findById(req.params.id);

    if (!contactMessage) {
      return res.status(404).json({ message: 'Mesajul nu a fost găsit' });
    }

    // Auto-mark as read when an admin opens a new message
    if (contactMessage.status === 'new') {
      contactMessage.status = 'read';
      await contactMessage.save();
    }

    res.json(contactMessage);
  } catch (error) {
    console.error('Error fetching contact message:', error);
    res.status(500).json({
      message: 'Error fetching contact message',
      error: error.message
    });
  }
});

// Update a contact message status (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { status } = req.body;

    const contactMessage = await ContactMessage.findById(req.params.id);

    if (!contactMessage) {
      return res.status(404).json({ message: 'Mesajul nu a fost găsit' });
    }

    if (status) contactMessage.status = status;
    await contactMessage.save();

    res.json(contactMessage);
  } catch (error) {
    console.error('Error updating contact message:', error);
    res.status(500).json({
      message: 'Error updating contact message',
      error: error.message
    });
  }
});

// Delete a contact message (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const contactMessage = await ContactMessage.findByIdAndDelete(req.params.id);

    if (!contactMessage) {
      return res.status(404).json({ message: 'Mesajul nu a fost găsit' });
    }

    res.json(contactMessage);
  } catch (error) {
    console.error('Error deleting contact message:', error);
    res.status(500).json({
      message: 'Error deleting contact message',
      error: error.message
    });
  }
});

module.exports = router;
