// lib/firestore.ts
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Tipos para o Firestore
export interface FirestoreTransaction {
  id: string;
  date: Timestamp;
  description: string;
  amount: number;
  type: 'entrada' | 'saída' | 'income';
  category?: string;
  note?: string;
  userId: string; // Para multi-usuário futuro
}

export interface FirestoreMonthlyData {
  id: string;
  month: number;
  year: number;
  initialBalance?: number;
  totalIncome: number;
  totalExpense: number;
  performance: number;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreRecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saída';
  category: string;
  note?: string;
  frequency: 'monthly' | 'weekly' | 'daily';
  dayOfMonth?: number;
  dayOfWeek?: number;
  isActive: boolean;
  startDate: Timestamp;
  endDate?: Timestamp;
  userId: string;
  createdAt: Timestamp;
}

// Usuário simples (pode ser expandido para autenticação real)
const getCurrentUserId = (): string => {
  const stored = localStorage.getItem('finance-app-user-id');
  if (stored) return stored;
  
  const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('finance-app-user-id', newUserId);
  return newUserId;
};

// === TRANSAÇÕES ===

export const saveTransaction = async (transaction: any) => {
  const userId = getCurrentUserId();
  const transactionRef = doc(db, 'transactions', transaction.id);
  
  await setDoc(transactionRef, {
    ...transaction,
    date: Timestamp.fromDate(new Date(transaction.date)),
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
};

export const getTransactions = async (month: number, year: number): Promise<any[]> => {
  const userId = getCurrentUserId();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);
  
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    date: doc.data().date.toDate()
  }));
};

export const getAllTransactions = async (): Promise<any[]> => {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('date', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    date: doc.data().date.toDate()
  }));
};

export const deleteTransaction = async (transactionId: string) => {
  await deleteDoc(doc(db, 'transactions', transactionId));
};

// === DADOS MENSAIS ===

export const saveMonthlyData = async (monthlyData: any) => {
  const userId = getCurrentUserId();
  const monthId = `${userId}_${monthlyData.year}_${monthlyData.month}`;
  const monthRef = doc(db, 'monthlyData', monthId);
  
  await setDoc(monthRef, {
    ...monthlyData,
    id: monthId,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
};

export const getMonthlyData = async (month: number, year: number): Promise<any | null> => {
  const userId = getCurrentUserId();
  const monthId = `${userId}_${year}_${month}`;
  
  try {
    const transactions = await getTransactions(month, year);
    return calculateMonthlyDataFromTransactions(transactions, month, year);
  } catch (error) {
    console.error('Erro ao carregar dados mensais:', error);
    return null;
  }
};

export const getAllMonthlyData = async (): Promise<any[]> => {
  try {
    const transactions = await getAllTransactions();
    return calculateAllMonthlyDataFromTransactions(transactions);
  } catch (error) {
    console.error('Erro ao carregar todos os dados mensais:', error);
    return [];
  }
};

// === TRANSAÇÕES RECORRENTES ===

export const saveRecurringTransaction = async (recurringTransaction: any) => {
  const userId = getCurrentUserId();
  const recurringRef = doc(db, 'recurringTransactions', recurringTransaction.id);
  
  await setDoc(recurringRef, {
    ...recurringTransaction,
    startDate: Timestamp.fromDate(new Date(recurringTransaction.startDate)),
    endDate: recurringTransaction.endDate ? Timestamp.fromDate(new Date(recurringTransaction.endDate)) : null,
    userId,
    createdAt: Timestamp.now()
  });
};

export const getRecurringTransactions = async (): Promise<any[]> => {
  const userId = getCurrentUserId();
  const q = query(
    collection(db, 'recurringTransactions'),
    where('userId', '==', userId),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    startDate: doc.data().startDate.toDate(),
    endDate: doc.data().endDate?.toDate() || null
  }));
};

export const deleteRecurringTransaction = async (transactionId: string) => {
  await deleteDoc(doc(db, 'recurringTransactions', transactionId));
};

// === CATEGORIAS ===

export const DEFAULT_CATEGORIES = [
  'Salário',
  'Aluguel',
  'Alimentação',
  'Transporte',
  'Educação',
  'Saúde',
  'Lazer',
  'Outros',
];

export const saveCategories = async (categories: string[]) => {
  const userId = getCurrentUserId();
  const categoriesRef = doc(db, 'categories', userId);
  
  await setDoc(categoriesRef, {
    categories,
    userId,
    updatedAt: Timestamp.now()
  });
};

export const getCategories = async (): Promise<string[]> => {
  const userId = getCurrentUserId();
  
  try {
    const q = query(
      collection(db, 'categories'),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data().categories;
    }
    
    // Se não existe, cria com categorias padrão
    await saveCategories(DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
    return DEFAULT_CATEGORIES;
  }
};

// === LISTENERS EM TEMPO REAL ===

export const subscribeToTransactions = (
  month: number, 
  year: number, 
  callback: (transactions: any[]) => void
) => {
  const userId = getCurrentUserId();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);
  
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate)),
    orderBy('date', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({
      ...doc.data(),
      date: doc.data().date.toDate()
    }));
    callback(transactions);
  });
};

// === FUNÇÕES AUXILIARES ===

const calculateMonthlyDataFromTransactions = (
  transactions: any[],
  month: number,
  year: number
): any => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Inicializa saldos diários
  const dailyBalances = Array.from({ length: daysInMonth }, (_, i) => ({
    date: new Date(year, month, i + 1),
    income: 0,
    expense: 0,
    balance: 0,
    dailyTransactions: []
  }));
  
  let totalIncome = 0;
  let totalExpense = 0;
  
  // Processa transações
  transactions.forEach(transaction => {
    const day = new Date(transaction.date).getDate() - 1;
    if (day >= 0 && day < daysInMonth) {
      dailyBalances[day].dailyTransactions.push(transaction);
      
      if (transaction.type === 'entrada') {
        dailyBalances[day].income += transaction.amount;
        totalIncome += transaction.amount;
      } else {
        dailyBalances[day].expense += transaction.amount;
        totalExpense += transaction.amount;
      }
    }
  });
  
  // Calcula saldos cumulativos
  let runningBalance = 0;
  dailyBalances.forEach(day => {
    const dailyNet = day.income - day.expense;
    runningBalance += dailyNet;
    day.balance = runningBalance;
  });
  
  return {
    month,
    year,
    totalIncome,
    totalExpense,
    performance: totalIncome - totalExpense,
    dailyBalances
  };
};

const calculateAllMonthlyDataFromTransactions = (transactions: any[]): any[] => {
  const monthsMap = new Map<string, any[]>();
  
  // Agrupa transações por mês
  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    
    if (!monthsMap.has(key)) {
      monthsMap.set(key, []);
    }
    monthsMap.get(key)!.push(transaction);
  });
  
  // Calcula dados para cada mês
  const monthlyDataArray: any[] = [];
  monthsMap.forEach((monthTransactions, key) => {
    const [year, month] = key.split('-').map(Number);
    const monthlyData = calculateMonthlyDataFromTransactions(monthTransactions, month, year);
    monthlyDataArray.push(monthlyData);
  });
  
  return monthlyDataArray.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
};

// === LIMPEZA DE DADOS ===

export const clearAllUserData = async () => {
  const userId = getCurrentUserId();
  const batch = writeBatch(db);
  
  try {
    // Buscar e deletar todas as transações
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', userId)
    );
    const transactionsSnapshot = await getDocs(transactionsQuery);
    transactionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Buscar e deletar transações recorrentes
    const recurringQuery = query(
      collection(db, 'recurringTransactions'),
      where('userId', '==', userId)
    );
    const recurringSnapshot = await getDocs(recurringQuery);
    recurringSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Deletar dados mensais
    const monthlyQuery = query(
      collection(db, 'monthlyData'),
      where('userId', '==', userId)
    );
    const monthlySnapshot = await getDocs(monthlyQuery);
    monthlySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Deletar categorias
    batch.delete(doc(db, 'categories', userId));
    
    await batch.commit();
    console.log('Todos os dados do usuário foram removidos');
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    throw error;
  }
};