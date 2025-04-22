import { MonthlyData, Transaction } from "@/types/finance";

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const INITIAL_DATA: MonthlyData[] = [
  // Janeiro
  {
    month: 0,
    year: 2025,
    totalIncome: 0,
    totalExpense: 0,
    performance: 0,
    dailyBalances: Array.from({ length: 31 }, (_, i) => ({
      date: new Date(2025, 0, i + 1),
      income: 0,
      expense: 0,
      balance: 0,
      dailyTransactions: []
    }))
  },
  // Abril - Exemplo com alguns dados
  {
    month: 3,
    year: 2025,
    totalIncome: 715.00,
    totalExpense: 314.20,
    performance: 191.80,
    dailyBalances: Array.from({ length: 30 }, (_, i) => {
      const day = i + 1;
      if (day === 17) {
        return {
          date: new Date(2025, 3, day),
          income: 715.00,
          expense: 314.20,
          balance: 398.80,
          dailyTransactions: [
            {
              id: 'apr-17-1',
              date: new Date(2025, 3, 17),
              description: 'Entrada',
              amount: 715.00,
              type: 'entrada'
            },
            {
              id: 'apr-17-2',
              date: new Date(2025, 3, 17),
              description: 'Saída',
              amount: 314.20,
              type: 'saída'
            }
          ]
        };
      }
      
      // Dias com apenas saída de R$ 23,00
      if (day >= 18 && day <= 25) {
        return {
          date: new Date(2025, 3, day),
          income: 0,
          expense: 23.00,
          balance: 398.80 - (23 * (day - 17)),
          dailyTransactions: [
            {
              id: `apr-${day}-1`,
              date: new Date(2025, 3, day),
              description: 'Despesa diária',
              amount: 23.00,
              type: 'saída'
            }
          ]
        };
      }
      
      return {
        date: new Date(2025, 3, day),
        income: 0,
        expense: 0,
        balance: day > 25 ? 191.80 : 0,
        dailyTransactions: []
      };
    })
  },
  // Maio - Com dados simplificados
  {
    month: 4,
    year: 2025,
    totalIncome: 3128.00,
    totalExpense: 2390.01,
    performance: 24.99,
    dailyBalances: Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      
      if (day === 5) {
        return {
          date: new Date(2025, 4, day),
          income: 1786.00,
          expense: 1677.72,
          balance: 76.80,
          dailyTransactions: [
            {
              id: 'may-5-1',
              date: new Date(2025, 4, 5),
              description: 'Primeiro Salário do mês',
              amount: 1786.00,
              type: 'entrada',
              note: '[1]'
            },
            {
              id: 'may-5-2',
              date: new Date(2025, 4, 5),
              description: 'Aluguel + Dízimo + Tim + Faculdade',
              amount: 1677.72,
              type: 'saída',
              note: '[2]'
            }
          ]
        };
      }
      
      // Outros dias com saída de R$ 23,00
      return {
        date: new Date(2025, 4, day),
        income: 0,
        expense: day > 5 ? 23.00 : 0,
        balance: day > 5 ? 76.80 - (23 * (day - 5)) : 0,
        dailyTransactions: day > 5 ? [
          {
            id: `may-${day}-1`,
            date: new Date(2025, 4, day),
            description: 'Despesa diária',
            amount: 23.00,
            type: 'saída'
          }
        ] : []
      };
    })
  } 
];

export function getMonthlyData(month: number, year: number): MonthlyData | undefined {
  return INITIAL_DATA.find(data => data.month === month && data.year === year);
}

export function getAllMonths(): { month: number, year: number }[] {
  return INITIAL_DATA.map(data => ({ month: data.month, year: data.year }));
}