import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const uri = process.env.MONGODB_URI || 'mongodb+srv://alexandrubalea:rj8BfDvwU8WZAOwB@cluster0.0yh2u.mongodb.net/navishop?retryWrites=true&w=majority&appName=Cluster0';

async function createAdminUser() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('navishop');
    const users = db.collection('users');

    // Check if admin user already exists
    const existingAdmin = await users.findOne({ email: 'admin@navishop.com' });

    if (existingAdmin) {
      console.log('Admin user already exists');
      await client.close();
      return;
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
    console.log('Admin user created successfully:', result.insertedId);
    console.log('Login credentials:');
    console.log('Email: admin@navishop.com');
    console.log('Password: admin123');

    await client.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser();