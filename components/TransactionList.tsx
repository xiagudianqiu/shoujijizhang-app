import React from 'react';
import { Transaction, TransactionType, CategoryLabels } from '../types';
import { formatCurrency, formatDateHeader } from '../utils/format';
import { ShoppingBag, Coffee, Home, Zap, MoreHorizontal, Briefcase, TrendingUp, DollarSign } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
}

const getIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'food': return <Coffee size={18} />;
    case 'shopping': return <ShoppingBag size={18} />;
    case 'housing': return <Home size={18} />;
    case 'transport': return <Zap size={18} />;
    case 'salary': return <DollarSign size={18} />;
    case 'investment': return <TrendingUp size={18} />;
    default: return <MoreHorizontal size={18} />;
  }
};

const TransactionList: React.FC<TransactionListProps> = ({ transactions }) => {
  const grouped = transactions.reduce((acc, tx) => {
    const dateStr = new Date(tx.date).toLocaleDateString();
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-300">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <ShoppingBag className="opacity-20" size={40} />
        </div>
        <p className="font-medium text-gray-400">暂无账单</p>
        <p className="text-xs mt-2 text-gray-300">点击底部 + 号开始你的第一笔记录</p>
      </div>
    );
  }

  return (
    <div className="pb-32">
      {sortedDates.map(date => {
        // Calculate daily total
        const dayExpense = grouped[date]
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const dayIncome = grouped[date]
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + t.amount, 0);

        return (
          <div key={date} className="mb-2">
            <div className="flex justify-between items-end px-5 py-3 sticky top-0 bg-sl-bg/95 backdrop-blur-md z-10">
              <h3 className="text-xs font-bold text-gray-400">
                {formatDateHeader(date)}
              </h3>
              <div className="flex gap-3 text-[10px] font-mono tabular-nums text-gray-400">
                {dayIncome > 0 && <span>收 {formatCurrency(dayIncome)}</span>}
                {dayExpense !== 0 && <span>支 {formatCurrency(Math.abs(dayExpense))}</span>}
              </div>
            </div>
            
            <div className="mx-4 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-gray-100/50 overflow-hidden">
              {grouped[date].map((tx, idx) => (
                <div 
                  key={tx.id} 
                  className={`
                    flex items-center justify-between p-4 active:bg-gray-50 transition-colors
                    ${idx !== grouped[date].length - 1 ? 'border-b border-gray-50' : ''}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm text-lg
                      ${tx.type === TransactionType.EXPENSE ? 'bg-orange-50 text-sl-expense' : 'bg-teal-50 text-sl-income'}
                    `}>
                      {getIcon(tx.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-700 text-sm">
                            {CategoryLabels[tx.category] || tx.category}
                        </p>
                        {tx.tags?.map(tag => (
                            <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-medium border border-slate-200">
                                {tag}
                            </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 truncate max-w-[140px] mt-0.5">
                        {tx.note || (CategoryLabels[tx.category] || tx.category)}
                      </p>
                    </div>
                  </div>

                  <div className={`font-mono text-base font-bold tabular-nums tracking-tight ${
                    tx.amount > 0 ? (tx.type === TransactionType.INCOME ? 'text-sl-income' : 'text-sl-expense') : 'text-slate-400'
                  }`}>
                    {tx.type === TransactionType.EXPENSE && tx.amount > 0 ? '-' : (tx.amount > 0 ? '+' : '')}
                    {formatCurrency(Math.abs(tx.amount)).replace('¥', '')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TransactionList;