import EmergencyContact from '../models/EmergencyContact.js';

// @desc    Get all emergency contacts for current user
// @route   GET /api/contacts
export const getContacts = async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({ userId: req.user._id }).sort({ isPrimary: -1, createdAt: 1 });
    res.status(200).json({ success: true, count: contacts.length, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new emergency contact
// @route   POST /api/contacts
export const createContact = async (req, res) => {
  try {
    const { name, phone, relationship, email, isPrimary } = req.body;

    if (!name || !phone || !relationship) {
      return res.status(400).json({
        success: false,
        message: 'Please provide contact name, phone number, and relationship.',
      });
    }

    // If marked as primary, reset other contacts for this user
    if (isPrimary) {
      await EmergencyContact.updateMany({ userId: req.user._id }, { isPrimary: false });
    }

    // Check if this is the first contact added; if so, make it primary automatically
    const count = await EmergencyContact.countDocuments({ userId: req.user._id });
    const shouldBePrimary = isPrimary || count === 0;

    const contact = await EmergencyContact.create({
      userId: req.user._id,
      name,
      phone,
      relationship,
      email: email || '',
      isPrimary: shouldBePrimary,
    });

    res.status(201).json({ success: true, data: contact, message: 'Emergency contact added successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update emergency contact
// @route   PUT /api/contacts/:id
export const updateContact = async (req, res) => {
  try {
    const { name, phone, relationship, email, isPrimary } = req.body;
    let contact = await EmergencyContact.findOne({ _id: req.params.id, userId: req.user._id });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Emergency contact not found.' });
    }

    if (isPrimary) {
      await EmergencyContact.updateMany({ userId: req.user._id }, { isPrimary: false });
    }

    contact.name = name || contact.name;
    contact.phone = phone || contact.phone;
    contact.relationship = relationship || contact.relationship;
    if (email !== undefined) contact.email = email;
    if (isPrimary !== undefined) contact.isPrimary = isPrimary;

    await contact.save();

    res.status(200).json({ success: true, data: contact, message: 'Contact updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete emergency contact
// @route   DELETE /api/contacts/:id
export const deleteContact = async (req, res) => {
  try {
    const contact = await EmergencyContact.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Emergency contact not found.' });
    }

    // If deleted contact was primary, promote another contact if available
    if (contact.isPrimary) {
      const remainingContact = await EmergencyContact.findOne({ userId: req.user._id });
      if (remainingContact) {
        remainingContact.isPrimary = true;
        await remainingContact.save();
      }
    }

    res.status(200).json({ success: true, message: 'Emergency contact removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
