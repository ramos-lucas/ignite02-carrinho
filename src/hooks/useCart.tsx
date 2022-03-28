import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const STORAGE_KEY = '@RocketShoes:cart'
const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(STORAGE_KEY);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const alreadyInCart = cart.find(item => item.id === productId);
      if (alreadyInCart) {
        return updateProductAmount({
          productId,
          amount: alreadyInCart.amount + 1,
        });
      }

      const { data: productData } = await api.get(`/products/${productId}`);
      const { data: stockData } = await api.get(`/stock/${productId}`);

      if (!stockData.amount) return;

      setCart(prevCart => {
        const newCart = [...prevCart, { ...productData, amount: 1 }];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newCart));
        return newCart;
      });

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.some(item => item.id === productId);
      if (!productInCart) {
        toast.error('Erro na remoção do produto');
        return;
      }

      setCart(prevCart => {
        const newCart = prevCart.filter(item => item.id !== productId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newCart));
        return newCart;
      })
    } catch {
      // TODO
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return;

      const { data: stockData } = await api.get(`/stock/${productId}`);

      if (stockData.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      setCart(prevCart => {
        const newCart = prevCart.map(item => item.id === productId ? {...item, amount} : item);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newCart));
        return newCart;
      })
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
