import { CircleDashed, CreditCard, Landmark, PiggyBank, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import type { Account, AccountType } from '@/types/finance';

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: LucideIcon }[] = [
  { value: 'checking', label: 'Conta corrente', icon: Landmark },
  { value: 'savings', label: 'Poupança', icon: PiggyBank },
  { value: 'credit_card', label: 'Cartão de crédito', icon: CreditCard },
  { value: 'cash', label: 'Dinheiro', icon: Wallet },
  { value: 'investment', label: 'Investimento', icon: TrendingUp },
  { value: 'other', label: 'Outra', icon: CircleDashed },
];

export function accountTypeMeta(type: AccountType) {
  return ACCOUNT_TYPES.find((t) => t.value === type) ?? ACCOUNT_TYPES[ACCOUNT_TYPES.length - 1];
}

export function defaultAccount(accounts: Account[] | undefined): Account | undefined {
  return accounts?.find((a) => a.isDefault) ?? accounts?.find((a) => !a.isArchived);
}
