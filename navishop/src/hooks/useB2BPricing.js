import { useAuth } from '../AuthContext';

export const useB2BPricing = () => {
  const { user } = useAuth();

  const isBusinessAccount = user?.accountType === 'business';
  const discountRate = isBusinessAccount ? (user?.b2bDiscount || 20) / 100 : 0;

  const calculateB2BPrice = (price) => {
    if (!isBusinessAccount || !price) return price;
    const discountedPrice = price * (1 - discountRate);
    return Math.round(discountedPrice * 100) / 100;
  };

  const formatPriceDisplay = (price) => {
    if (!isBusinessAccount) {
      return {
        currentPrice: price,
        originalPrice: null,
        showB2BLabel: false,
        discountPercent: 0
      };
    }
    return {
      currentPrice: calculateB2BPrice(price),
      originalPrice: price,
      showB2BLabel: true,
      discountPercent: Math.round(discountRate * 100)
    };
  };

  const calculateCartTotal = (items) => {
    if (!items || items.length === 0) return 0;

    return items.reduce((total, item) => {
      const price = isBusinessAccount ? calculateB2BPrice(item.price) : item.price;
      return total + (price * item.quantity);
    }, 0);
  };

  const calculateB2BSavings = (items) => {
    if (!isBusinessAccount || !items || items.length === 0) return 0;

    return items.reduce((savings, item) => {
      const originalTotal = item.price * item.quantity;
      const b2bTotal = calculateB2BPrice(item.price) * item.quantity;
      return savings + (originalTotal - b2bTotal);
    }, 0);
  };

  return {
    isBusinessAccount,
    discountRate,
    discountPercent: Math.round(discountRate * 100),
    calculateB2BPrice,
    formatPriceDisplay,
    calculateCartTotal,
    calculateB2BSavings
  };
};

export default useB2BPricing;
