import { getFlag } from "./flags";

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

interface CheckoutSession {
  items: CartItem[];
  step: number;
  totalSteps: number;
}

export function startCheckout(items: CartItem[]): CheckoutSession {
  if (getFlag("new_checkout_flow")) {
    return { items, step: 1, totalSteps: 2 };
  }
  return { items, step: 1, totalSteps: 4 };
}

export function getCheckoutSteps() {
  if (getFlag("new_checkout_flow")) {
    return ["Review & Pay", "Confirmation"];
  }
  return ["Cart Review", "Shipping", "Payment", "Confirmation"];
}

export function processPayment(session: CheckoutSession, paymentMethod: string) {
  const total = session.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return paymentGateway.charge(paymentMethod, total);
}
