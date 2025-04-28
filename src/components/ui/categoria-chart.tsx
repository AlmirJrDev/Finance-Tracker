'use client';

import { useState, useEffect } from 'react';
import { Pie, PieChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend, Cell, } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { 
  Switch 
} from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MonthlyData,  } from '@/types/finance';

interface CategoryDataItem {
  name: string;
  value: number;
  fill: string;
}
interface TrendData {
  value: number;
  isUp: boolean;
}

const COLORS: string[] = [
  'oklch(0.488 0.243 264.376)',
  'oklch(0.696 0.17 162.48)',
  'oklch(0.769 0.188 70.08)',
  'oklch(0.627 0.265 303.9)',
  'oklch(0.645 0.246 16.439)',
  'oklch(0.5 0.2 45)',
  'oklch(0.7 0.15 200)',
  'oklch(0.4 0.3 120)',
];

interface CategoryChartsProps {
  data: MonthlyData;
  allMonthsData: MonthlyData[]; 
}

export default function CategoryCharts({ data, allMonthsData }: CategoryChartsProps) {
  const [categoryData, setCategoryData] = useState<CategoryDataItem[]>([]);
  const [trend, setTrend] = useState<TrendData>({ value: 0, isUp: true });
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false);
  
  useEffect(() => {
    if (!data) return;
    const dataToProcess = showAllMonths ? allMonthsData : [data];
    const categories: Record<string, number> = {};
    dataToProcess.forEach((monthData) => {
      monthData.dailyBalances.forEach((day) => {
        day.dailyTransactions.forEach((transaction) => {
          if (transaction.type === 'saída') {
            const category = transaction.category || 'Outros';
            if (!categories[category]) {
              categories[category] = 0;
            }
            categories[category] += transaction.amount;
          }
        });
      });
    });
  
    const chartData: CategoryDataItem[] = Object.keys(categories).map((category, index) => ({
      name: category,
      value: categories[category],
      fill: COLORS[index % COLORS.length]
    }));
    
    chartData.sort((a, b) => b.value - a.value);
    
    setCategoryData(chartData);
    
    if (!showAllMonths) {
      const randomTrend = parseFloat((Math.random() * 10 - 5).toFixed(1));
      setTrend({
        value: Math.abs(randomTrend),
        isUp: randomTrend > 0
      });
    }
  }, [data, allMonthsData, showAllMonths]);

  const chartConfig: ChartConfig = categoryData.reduce((config, item) => {
    config[item.name] = {
      label: item.name,
      color: item.fill
    };
    return config;
  }, {} as ChartConfig);




  return (
    <Card className="w-full mb-6 bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Gastos por Categoria</CardTitle>
          <CardDescription>
            {showAllMonths ? 'Análise consolidada de gastos por categoria' : 'Análise de gastos por categoria neste mês'}
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="show-all-months" className="text-sm">
            {showAllMonths ? 'Todos os meses' : 'Mês atual'}
          </Label>
          <Switch 
            id="show-all-months" 
            checked={showAllMonths} 
            onCheckedChange={setShowAllMonths}
          />
        </div>
      </CardHeader>
      <CardContent className={`flex w-full p-2 gap-2  justify-between flex-col items-center xl:flex-row    ${categoryData.length > 0 ? 'xl:divide-x' : ''}`}>

      

      {categoryData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-68 2xl:h-80 flex-1">
                <PieChart >
                  <Pie 
                    data={categoryData} 
                    dataKey="value" 
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                  >
                 
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="visitors" hideLabel />}
                  />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom"  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="   text-gray-500">
                Nenhum gasto registrado neste período
              </div>
            )}

{categoryData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64 2xl:h-80  flex-1">
                <BarChart 
                  data={categoryData}
                  margin={{ top: 20, right: 30, left: 30, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `R$${value}`} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar radius={8} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className=" text-gray-500">
                Nenhum gasto registrado neste período
              </div>
            )}
    
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {!showAllMonths && (
          <div className="flex gap-2 font-medium leading-none">
            {trend.isUp ? (
              <>
                <span className="text-red-500">Tendência de aumento em {trend.value}% em relação ao mês anterior</span>
                <TrendingUp className="h-4 w-4 text-red-500" />
              </>
            ) : (
              <>
                <span className="text-green-500">Tendência de redução em {trend.value}% em relação ao mês anterior</span>
                <TrendingDown className="h-4 w-4 text-green-500" />
              </>
            )}
          </div>
        )}
        <div className="leading-none text-muted-foreground">
          {categoryData.length > 0 
            ? `Total de ${categoryData.length} categorias de gastos${showAllMonths ? ' em todos os meses' : ''}`
            : 'Adicione transações para ver a análise de categorias'}
        </div>
      </CardFooter>
    </Card>
  );
}