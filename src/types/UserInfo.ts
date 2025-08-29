export type UserInfo = {
  firstName: string;
  lastName: string;
  email: string;
} | null;

export type CreateOrderData = {
  itemId: string;
  itemName: string;
  quantity: number;
  price: number;
  creditCardInfo: string;
};
