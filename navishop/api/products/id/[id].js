import { ObjectId } from 'mongodb';
import { getDb } from '../../../lib/mongoClient';

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

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  try {
    const db = await getDb();
    const collection = db.collection('products');

    if (req.method === 'GET') {
      const product = await collection.findOne({ _id: new ObjectId(id) });

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Convert _id to id for admin panel compatibility
      const productWithId = {
        ...product,
        id: product._id.toString()
      };

      res.status(200).json(productWithId);
    } else if (req.method === 'PUT') {
      const { id: bodyId, ...updateData } = req.body;

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const productWithId = {
        ...result.value,
        id: result.value._id.toString()
      };

      res.status(200).json(productWithId);
    } else if (req.method === 'DELETE') {
      const result = await collection.findOneAndDelete({ _id: new ObjectId(id) });

      if (!result.value) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const productWithId = {
        ...result.value,
        id: result.value._id.toString()
      };

      res.status(200).json(productWithId);
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Error processing request', error: error.message });
  }
}
