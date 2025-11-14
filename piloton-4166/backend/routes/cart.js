const express = require('express');
const Cart = require('../models/Cart');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.userId });
    
    if (!cart) {
      cart = new Cart({
        userId: req.userId,
        items: [],
        totalAmount: 0
      });
      await cart.save();
    }
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart', error: error.message });
  }
});

router.post('/add', auth, async (req, res) => {
  try {
    console.log('Cart add request received:', {
      userId: req.userId,
      body: req.body
    });
    
    const { productId, name, price, quantity = 1, image } = req.body;
    
    if (!productId || !name || !price) {
      console.log('Missing required fields:', { productId, name, price });
      return res.status(400).json({ message: 'Product ID, name, and price are required' });
    }
    
    let cart = await Cart.findOne({ userId: req.userId });
    
    if (!cart) {
      cart = new Cart({
        userId: req.userId,
        items: [],
        totalAmount: 0
      });
    }
    
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );
    
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        name,
        price,
        quantity,
        image
      });
    }
    
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error adding item to cart', error: error.message });
  }
});

router.put('/update/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Valid quantity is required' });
    }
    
    const cart = await Cart.findOne({ userId: req.userId });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }
    
    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error updating cart item', error: error.message });
  }
});

router.delete('/remove/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const cart = await Cart.findOne({ userId: req.userId });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    cart.items = cart.items.filter(
      item => item.productId.toString() !== productId
    );
    
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error removing item from cart', error: error.message });
  }
});

router.delete('/clear', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.userId });
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: 'Error clearing cart', error: error.message });
  }
});

module.exports = router;