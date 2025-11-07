import bcrypt from 'bcryptjs';
import { getDb } from '../../lib/mongoClient';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const db = await getDb();
    const users = db.collection('users');

    // Check if admin user already exists
    const existingAdmin = await users.findOne({ email: 'admin@navishop.com' });

    if (existingAdmin) {
      return res.status(200).json({ message: 'Admin user already exists', email: 'admin@navishop.com' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create admin user
    const adminUser = {
      name: 'Admin User',
      email: 'admin@navishop.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await users.insertOne(adminUser);

    res.status(201).json({
      message: 'Admin user created successfully',
      userId: result.insertedId,
      credentials: {
        email: 'admin@navishop.com',
        password: 'admin123'
      }
    });

  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
