import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  //estado do cart -> será inicializado com os valores armazenados no localStorage. caso não exista nenhum valor armazenado -> inicializa como um array vazio
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      //conceito de imutabilidade do react, utilizando outra constante para não usar cart como referência
      const updatedCart = [...cart];
      //verificar se o produto existe no cart
      const productExists = updatedCart.find(
        product => product.id === productId
      );

      //acesso ao stock para verificar a quantidade de produto
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      //se o produto existir no cart, a quantidade atual será a do carrinho, se o produto não existir a quantidade será zero
      const currentAmount = productExists ? productExists.amount : 0;
      //a quantidade será o valor atual mais um, será necessário para verificar se o produto existe no estoque
      const amount = currentAmount + 1;

      //se a quantidade for maior que a do stock não será possível adicionar mais produtos
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      //se o produto já existe no carrinho -> a quantidade será atualizada
      //se o produto não existe no carrinho -> um novo produto será inserido no cart com a quantidade inicial de 1
      if (productExists) {
        productExists.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1
        };

        updatedCart.push(newProduct);
      }
      //seta o cart para os valores atualizados
      setCart(updatedCart);
      //seta o localStorage para os valores atualizados
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(
        product => product.id === productId
      );

      //se o index do produto existe -> o produto é removido e o cart atualizado
      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      //se a quantidade for menor ou igual a zero o produto não existe no cart e para a função
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      //verifica se a quantidade é maior que a quantidade disponível no stock
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        product => product.id === productId
      );
      //atualiza a quantidade do produto no cart se o mesmo existe
      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
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
