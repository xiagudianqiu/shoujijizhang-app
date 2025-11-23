import React from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction, TransactionType, CategoryLabels } from '../types';
import { formatCurrency } from '../utils/format';

interface ChartsProps {
  transactions: Transaction[];
}

const Charts: React.FC<ChartsProps> = ({ transactions }) => {
  // Simple Mock Data for Net Worth Curve (Last 7 Days)
  const data = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      name: d.getDate().toString() + '日',
      value: Math.floor(Math.random() * 200000) + 100000 // Random cents
    };
  });

  const totalExpense = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);
  
  // Calculate top spending categories
  const expensesByCategory = transactions
    .filter(t => t.type === TransactionType.EXPENSE && t.amount > 0)
    .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);
  
  const topCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="pb-32 px-4 pt-4">
      {/* Net Worth Card */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">净资产趋势</p>
            <h2 className="text-2xl font-bold text-slate-800 font-mono tracking-tight tabular-nums">
                {formatCurrency(totalIncome - totalExpense + 1500000)} 
                <span className="text-xs font-sans font-bold text-emerald-500 ml-2 bg-emerald-50 px-2 py-1 rounded-full">+2.4%</span>
            </h2>
          </div>
        </div>

        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3D5A80" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3D5A80" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: '#94a3b8'}} 
                  dy={10}
              />
              <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '净资产']}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '12px', fontFamily: 'JetBrains Mono'}} 
                  cursor={{stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4'}}
              />
              <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3D5A80" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
             <p className="text-xs text-gray-400 mb-1 font-medium">本月收入</p>
             <p className="text-xl font-bold text-sl-income font-mono tabular-nums">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
             <p className="text-xs text-gray-400 mb-1 font-medium">本月支出</p>
             <p className="text-xl font-bold text-sl-expense font-mono tabular-nums">{formatCurrency(totalExpense)}</p>
          </div>
      </div>

      {/* Spending Ranking */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-sl-expense rounded-full"></span>
              支出排行
          </h3>
          <div className="space-y-6">
              {topCategories.length > 0 ? topCategories.map(([cat, amount], idx) => (
                  <div key={cat} className="flex items-center gap-4">
                      <div className="w-6 text-sm font-bold text-gray-300 font-mono">0{idx + 1}</div>
                      <div className="flex-1">
                          <div className="flex justify-between text-sm font-bold mb-2">
                              <span className="text-slate-700">{CategoryLabels[cat] || cat}</span>
                              <span className="font-mono tabular-nums text-slate-900">{formatCurrency(amount)}</span>
                          </div>
                          <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-sl-expense rounded-full" 
                                style={{width: `${(amount / totalExpense) * 100}%`}}
                              />
                          </div>
                      </div>
                  </div>
              )) : (
                  <p className="text-center text-gray-400 py-4 text-sm">暂无数据</p>
              )}
          </div>
      </div>
    </div>
  );
};

export default Charts;