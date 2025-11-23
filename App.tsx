
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Mic, BarChart2, Home, Settings, Wand2, CheckSquare, RefreshCw, Camera, X, Edit3, Trash2, Check, Circle, CheckCircle2, Calendar, Clock, Download, Upload, Search, Volume2, VolumeX } from 'lucide-react';
import NumericKeypad from './components/NumericKeypad';
import TransactionList from './components/TransactionList';
import Charts from './components/Charts';
import { Transaction, TransactionType, Category, ViewState, CategoryLabels, AppSettings } from './types';
import { saveTransactions, loadTransactions, saveSettings, loadSettings } from './services/storageService';
import { parseNaturalLanguageTransaction, parseImageTransaction, NLPResult } from './services/geminiService';
import { formatCurrency, formatDate } from './utils/format';

const App = () => {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ monthlyBudget: 500000, soundEnabled: true, hapticsEnabled: true });
  const [toast, setToast] = useState<{message: string, visible: boolean}>({message: '', visible: false});
  
  // Transaction Input State
  const [newTxType, setNewTxType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [newTxCategory, setNewTxCategory] = useState<Category>(Category.FOOD);
  const [newTxNote, setNewTxNote] = useState<string>('');
  const [newTxDate, setNewTxDate] = useState<number>(Date.now());
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [isRefund, setIsRefund] = useState(false);
  const [initialKeypadValue, setInitialKeypadValue] = useState<number>(0);
  const [editingTxId, setEditingTxId] = useState<string | null>(null); // For editing existing transactions

  // Dashboard State
  const [searchTerm, setSearchTerm] = useState('');
  const [showBudget, setShowBudget] = useState(false); // Toggle between Net Worth and Budget on header
  
  // AI / OCR State
  const [aiInput, setAiInput] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState('');
  
  // Multi-item OCR State
  const [ocrCandidates, setOcrCandidates] = useState<NLPResult[]>([]);
  const [selectedOcrIndices, setSelectedOcrIndices] = useState<Set<number>>(new Set());
  const [showOcrFail, setShowOcrFail] = useState(false);
  const [editingOcrIndex, setEditingOcrIndex] = useState<number | null>(null);
  const [isAddingToOcr, setIsAddingToOcr] = useState(false);
  
  // Settings State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Initial Load
  useEffect(() => {
    const loaded = loadTransactions();
    setTransactions(loaded);
    
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    setBudgetInput((loadedSettings.monthlyBudget / 100).toString());
    
    // Load stored API key
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKeyInput(storedKey);
  }, []);

  // Save on Change
  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (ocrCandidates.length > 0) {
        const allIndices = new Set(ocrCandidates.map((_, i) => i));
        setSelectedOcrIndices(allIndices);
    } else {
        setSelectedOcrIndices(new Set());
    }
  }, [ocrCandidates.length]);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const saveApiKey = () => {
      localStorage.setItem('gemini_api_key', apiKeyInput.trim());
      showToast('API Key 已保存');
  };
  
  const saveBudget = () => {
      const amount = parseFloat(budgetInput);
      if (!isNaN(amount)) {
          setSettings(prev => ({ ...prev, monthlyBudget: amount * 100 }));
          showToast('月度预算已更新');
      }
  };

  const toggleSound = () => {
      setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smartledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('备份文件已生成');
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          setTransactions(parsed);
          saveTransactions(parsed);
          showToast('数据恢复成功');
        } else {
          showToast('文件格式错误');
        }
      } catch (err) {
        showToast('导入失败');
      }
    };
    reader.readAsText(file);
    if (backupInputRef.current) backupInputRef.current.value = '';
  };

  const handleAddTransaction = (amountCents: number) => {
    // 1. Handle OCR Editing
    if (editingOcrIndex !== null) {
        const updatedCandidates = [...ocrCandidates];
        const current = updatedCandidates[editingOcrIndex];
        
        updatedCandidates[editingOcrIndex] = {
            ...current,
            amount: amountCents, 
            type: newTxType,
            category: newTxCategory,
            note: newTxNote || current.note,
            date: new Date(newTxDate).toISOString(),
            tags: [
                ...(isReimbursable ? ['报销'] : []),
                ...(isRefund ? ['退款'] : [])
            ],
        };

        setOcrCandidates(updatedCandidates);
        setEditingOcrIndex(null);
        setView('DASHBOARD');
        showToast('已修改该笔交易');
        return;
    }

    // 2. Handle Adding TO OCR
    if (isAddingToOcr) {
        const tags = [];
        if (isReimbursable) tags.push('报销');
        if (isRefund) tags.push('退款');

        const newCandidate: NLPResult = {
            amount: isRefund && newTxType === TransactionType.EXPENSE ? -Math.abs(amountCents) : amountCents,
            type: newTxType,
            category: newTxCategory,
            note: newTxNote || (isReimbursable ? '报销款' : (isRefund ? '退款' : '手动添加')),
            tags: tags,
            date: new Date(newTxDate).toISOString(),
            confidence: 1
        };

        setOcrCandidates(prev => [...prev, newCandidate]);
        setSelectedOcrIndices(prev => {
            const next = new Set(prev);
            next.add(ocrCandidates.length); 
            return next;
        });

        setIsAddingToOcr(false);
        resetForm();
        setView('DASHBOARD');
        showToast('已添加到列表');
        return;
    }

    // 3. Handle Normal Add or Edit Existing
    let finalAmount = amountCents;
    if (newTxType === TransactionType.EXPENSE && isRefund) {
        finalAmount = -amountCents;
    }

    const tags = [];
    if (isReimbursable) tags.push('报销');
    if (isRefund) tags.push('退款');
    
    if (editingTxId) {
        // Update Existing Transaction
        setTransactions(prev => prev.map(tx => {
            if (tx.id === editingTxId) {
                return {
                    ...tx,
                    amount: finalAmount,
                    type: newTxType,
                    category: newTxCategory,
                    note: newTxNote || (isReimbursable ? '报销款' : (isRefund ? '退款' : '')),
                    date: newTxDate,
                    tags: tags
                };
            }
            return tx;
        }));
        showToast('交易已更新');
    } else {
        // Create New Transaction
        const newTx: Transaction = {
          id: Date.now().toString(),
          amount: finalAmount,
          type: newTxType,
          category: newTxCategory,
          note: newTxNote || (isReimbursable ? '报销款' : (isRefund ? '退款' : '')),
          date: newTxDate,
          createdAt: Date.now(),
          tags: tags
        };
        
        setTransactions(prev => [newTx, ...prev]);
        
        // Show budget toast if expense
        if (newTxType === TransactionType.EXPENSE && finalAmount > 0) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyExpense = transactions
                .filter(t => t.type === TransactionType.EXPENSE)
                .filter(t => {
                    const d = new Date(t.date);
                    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                })
                .reduce((a, b) => a + b.amount, 0) + finalAmount;
            
            const remaining = settings.monthlyBudget - monthlyExpense;
            showToast(`记好了！本月预算还剩 ${formatCurrency(remaining)}`);
        } else {
            showToast('记账成功');
        }
    }

    resetForm();
    setView('DASHBOARD');
  };

  const resetForm = () => {
    setIsReimbursable(false);
    setIsRefund(false);
    setNewTxType(TransactionType.EXPENSE);
    setNewTxCategory(Category.FOOD);
    setNewTxNote('');
    setNewTxDate(Date.now());
    setInitialKeypadValue(0);
    setEditingOcrIndex(null);
    setEditingTxId(null);
  };

  const startEditTransaction = (tx: Transaction) => {
      setEditingTxId(tx.id);
      setNewTxType(tx.type);
      setNewTxCategory(tx.category as Category);
      setNewTxNote(tx.note);
      setInitialKeypadValue(Math.abs(tx.amount));
      setNewTxDate(tx.date);
      
      const tags = tx.tags || [];
      setIsReimbursable(tags.includes('报销'));
      setIsRefund(tags.includes('退款'));
      
      setView('ADD_TRANSACTION');
  };

  const handleDeleteTransaction = () => {
      if (editingTxId) {
          setTransactions(prev => prev.filter(tx => tx.id !== editingTxId));
          resetForm();
          setView('DASHBOARD');
          showToast('交易已删除');
      }
  };

  const startEditOcrCandidate = (index: number) => {
    const candidate = ocrCandidates[index];
    setEditingOcrIndex(index);
    setIsAddingToOcr(false); 
    setNewTxType(candidate.type as TransactionType);
    setNewTxCategory(candidate.category as Category || Category.OTHER);
    setNewTxNote(candidate.note);
    setInitialKeypadValue(Math.abs(candidate.amount));
    
    if (candidate.date) {
        const parsed = Date.parse(candidate.date);
        if (!isNaN(parsed)) setNewTxDate(parsed);
    } else {
        setNewTxDate(Date.now());
    }

    const tags = candidate.tags || [];
    setIsReimbursable(tags.includes('报销'));
    setIsRefund(tags.includes('退款') || (candidate.amount < 0 && candidate.type === TransactionType.EXPENSE));

    setView('ADD_TRANSACTION');
  };

  const startAddToOcr = () => {
      resetForm();
      setIsAddingToOcr(true);
      setView('ADD_TRANSACTION');
  };

  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;
    setIsAiProcessing(true);
    setAiError('');

    try {
        const result = await parseNaturalLanguageTransaction(aiInput);

        if (result) {
            addTransactionFromAI(result);
            setAiInput('');
            setView('DASHBOARD');
            showToast('AI 识别成功并入账');
        } else {
            setAiError('无法识别，请尝试: "午餐 25元"');
        }
    } catch (e: any) {
        setAiError('AI 服务请求失败，请检查设置中的 Key');
    }
    setIsAiProcessing(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsAiProcessing(true);
      setShowOcrFail(false);
      setOcrCandidates([]); 
      setIsAddingToOcr(false);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
            const results = await parseImageTransaction(base64String);
            setIsAiProcessing(false);
            
            if (results && results.length > 0) {
                setOcrCandidates(results);
            } else {
                setShowOcrFail(true);
            }
        } catch (e: any) {
            setIsAiProcessing(false);
            setShowOcrFail(true);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleOcrSelection = (index: number) => {
      setSelectedOcrIndices(prev => {
          const next = new Set(prev);
          if (next.has(index)) {
              next.delete(index);
          } else {
              next.add(index);
          }
          return next;
      });
  };

  const handleBatchConfirm = () => {
      const candidatesToConfirm = ocrCandidates.filter((_, i) => selectedOcrIndices.has(i));
      const remainingCandidates = ocrCandidates.filter((_, i) => !selectedOcrIndices.has(i));
      
      if (candidatesToConfirm.length === 0) return;

      candidatesToConfirm.forEach(result => {
        addTransactionFromAI(result);
      });

      setOcrCandidates(remainingCandidates);
      setSelectedOcrIndices(new Set()); 
      setIsAddingToOcr(false);
      showToast(`已批量入账 ${candidatesToConfirm.length} 笔交易`);
  };

  const handleBatchDelete = () => {
      const remainingCandidates = ocrCandidates.filter((_, i) => !selectedOcrIndices.has(i));
      setOcrCandidates(remainingCandidates);
      setSelectedOcrIndices(new Set());
      showToast('已删除选中项目');
  };

  const addTransactionFromAI = (result: NLPResult) => {
    let txDate = Date.now();
    if (result.date) {
        const parsed = Date.parse(result.date);
        if (!isNaN(parsed)) txDate = parsed;
    }

    let finalAmount = Math.abs(result.amount);
    if (result.tags?.includes('退款') && result.type === TransactionType.EXPENSE) {
        finalAmount = -finalAmount;
    } else if (result.amount < 0 && result.type === TransactionType.EXPENSE) {
        finalAmount = result.amount; 
    }

    const newTx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        amount: finalAmount,
        type: result.type,
        category: result.category,
        note: result.note || '智能录入',
        date: txDate,
        createdAt: Date.now(),
        tags: result.tags || []
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  const switchToManualInput = () => {
    setShowOcrFail(false);
    setOcrCandidates([]); 
    setIsAddingToOcr(false);
    resetForm();
    setView('ADD_TRANSACTION');
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
          setNewTxDate(new Date(e.target.value).getTime());
      }
  };

  const triggerDatePicker = () => {
      if (dateInputRef.current) {
          dateInputRef.current.showPicker();
      }
  };

  // Calculations for Dashboard
  const totalBalance = transactions.reduce((acc, t) => {
    if (t.type === TransactionType.EXPENSE) return acc - t.amount;
    return acc + t.amount;
  }, 0);

  const currentMonthExpense = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .filter(t => {
        const d = new Date(t.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((a, b) => a + b.amount, 0);

  const remainingBudget = settings.monthlyBudget - currentMonthExpense;

  const filteredTransactions = transactions.filter(tx => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
          tx.note.toLowerCase().includes(term) || 
          (CategoryLabels[tx.category] || tx.category).toLowerCase().includes(term) ||
          (tx.amount / 100).toString().includes(term)
      );
  });

  const renderContent = () => {
    if (view === 'ADD_TRANSACTION') {
        const categories = newTxType === TransactionType.EXPENSE 
        ? [Category.FOOD, Category.TRANSPORT, Category.SHOPPING, Category.HOUSING, Category.OTHER]
        : [Category.SALARY, Category.INVESTMENT, Category.OTHER];

      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col justify-end">
          {/* Removed h-full to allow shrink-wrap, kept max-h for scroll protection */}
          <div className="bg-white rounded-t-[2rem] max-h-[90dvh] flex flex-col overflow-hidden animate-slide-up shadow-2xl">
            <div className="pt-4 px-5 pb-2">
              <div className="flex justify-center mb-2">
                  {editingTxId ? (
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <Edit3 size={10} /> 编辑交易
                      </span>
                  ) : editingOcrIndex !== null ? (
                      <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold">
                          修改 AI 识别结果
                      </span>
                  ) : isAddingToOcr ? (
                      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold">
                          添加到识别列表
                      </span>
                  ) : null}
              </div>
              
              <div className="flex bg-gray-100 p-1 rounded-2xl mb-4">
                <button 
                  onClick={() => {
                      setNewTxType(TransactionType.EXPENSE);
                      if(newTxType !== TransactionType.EXPENSE) setNewTxCategory(Category.FOOD);
                      setIsRefund(false);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${newTxType === TransactionType.EXPENSE ? 'bg-white text-sl-expense shadow-sm scale-[0.98]' : 'text-gray-400'}`}
                >
                  支出
                </button>
                <button 
                  onClick={() => {
                      setNewTxType(TransactionType.INCOME);
                      if(newTxType !== TransactionType.INCOME) setNewTxCategory(Category.SALARY);
                      setIsRefund(false);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${newTxType === TransactionType.INCOME ? 'bg-white text-sl-income shadow-sm scale-[0.98]' : 'text-gray-400'}`}
                >
                  收入
                </button>
              </div>

              <div className="grid grid-cols-5 gap-y-3 gap-x-1 mb-3">
                  {categories.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setNewTxCategory(cat)}
                        className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${newTxCategory === cat ? 'opacity-100' : 'opacity-40 grayscale'}`}
                      >
                          <div className={`
                            w-11 h-11 rounded-[16px] flex items-center justify-center text-lg transition-transform
                            ${newTxCategory === cat ? (newTxType === TransactionType.EXPENSE ? 'bg-sl-expense text-white scale-110 shadow-lg shadow-sl-expense/30' : 'bg-sl-income text-white scale-110 shadow-lg shadow-sl-income/30') : 'bg-gray-100 border border-gray-100'}
                          `}>
                              {CategoryLabels[cat][0]} 
                          </div>
                          <span className={`text-[10px] font-medium tracking-wide ${newTxCategory === cat ? 'text-slate-800' : 'text-gray-400'}`}>
                              {CategoryLabels[cat]}
                          </span>
                      </button>
                  ))}
              </div>
              
              <div className="mb-2 px-1">
                   <input 
                      type="text" 
                      value={newTxNote}
                      onChange={(e) => setNewTxNote(e.target.value)}
                      placeholder="添加备注..."
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 text-slate-700"
                   />
              </div>

              <div className="mb-1 px-1 flex items-center gap-2">
                 <input 
                    type="datetime-local" 
                    ref={dateInputRef}
                    className="hidden"
                    onChange={handleDateChange}
                    value={new Date(newTxDate - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                 />
              </div>

            </div>

            {newTxType === TransactionType.EXPENSE && (
                <div className="px-6 mb-2 flex items-center gap-2">
                    <button 
                        onClick={() => setIsReimbursable(!isReimbursable)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95
                            ${isReimbursable ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-gray-100 bg-gray-50 text-gray-400'}
                        `}
                    >
                        <CheckSquare size={12} strokeWidth={3} />
                        报销/垫付
                    </button>
                    <button 
                        onClick={() => setIsRefund(!isRefund)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95
                            ${isRefund ? 'bg-red-50 border-red-200 text-red-600' : 'border-gray-100 bg-gray-50 text-gray-400'}
                        `}
                    >
                        <RefreshCw size={12} strokeWidth={3} />
                        退款
                    </button>
                </div>
            )}

            {/* Removed flex-1 to allow keypad to determine its own height */}
            <div className="bg-white relative">
               <NumericKeypad 
                  key={editingOcrIndex !== null ? `edit-${editingOcrIndex}` : (editingTxId ? `edit-tx-${editingTxId}` : 'new')} 
                  initialValue={initialKeypadValue}
                  onChange={() => {}}
                  onDateClick={triggerDatePicker}
                  selectedDate={newTxDate}
                  soundEnabled={settings.soundEnabled}
                  onCancel={() => {
                      setEditingOcrIndex(null);
                      setEditingTxId(null);
                      setIsAddingToOcr(false);
                      setView('DASHBOARD');
                  }}
                  onComplete={handleAddTransaction}
               />
               
               {editingTxId && (
                   <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-4">
                       <button 
                           onClick={handleDeleteTransaction}
                           className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100 shadow-sm active:scale-90 transition-transform"
                       >
                           <Trash2 size={18} />
                       </button>
                   </div>
               )}
            </div>

            <button 
              onClick={() => {
                  setEditingOcrIndex(null);
                  setEditingTxId(null);
                  setIsAddingToOcr(false);
                  setView('DASHBOARD');
              }} 
              className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-400 hover:bg-gray-200 active:scale-90 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      );
    }

    if (view === 'AI_INPUT') {
        return (
            <div className="fixed inset-0 bg-white z-50 flex flex-col">
                <div className="p-6 pt-12">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">AI 智能记账</h2>
                    <p className="text-gray-400 mb-6 text-sm">像聊天一样输入，例如：“晚上打车35元报销”</p>
                    
                    <div className="relative">
                        <textarea 
                            className="w-full h-40 p-5 bg-gray-50 rounded-[24px] text-lg resize-none focus:outline-none focus:ring-2 focus:ring-sl-income/20 border-0"
                            placeholder="输入交易详情..."
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            autoFocus
                        />
                        <div className="absolute bottom-4 right-4 text-gray-400 pointer-events-none">
                            <Mic size={20} className="opacity-20" />
                        </div>
                    </div>
                    
                    {aiError && <p className="text-red-500 mt-3 text-sm flex items-center gap-1 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"/> {aiError}</p>}
                    
                    <button 
                        onClick={handleAiSubmit}
                        disabled={isAiProcessing}
                        className="w-full mt-8 bg-slate-900 text-white h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl shadow-slate-900/20"
                    >
                        {isAiProcessing ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Wand2 size={20} />
                                识别并入账
                            </>
                        )}
                    </button>
                    
                    <button 
                        onClick={() => setView('DASHBOARD')}
                        className="w-full mt-4 text-gray-400 font-bold py-4 text-sm"
                    >
                        取消
                    </button>
                </div>
            </div>
        );
    }

    return (
      <main className="max-w-md mx-auto min-h-screen relative flex flex-col bg-sl-bg">
        {/* Loading Overlay for OCR */}
        {isAiProcessing && (
            <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center flex-col text-white">
                <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-sm tracking-wide">AI 正在分析...</p>
            </div>
        )}

        {/* OCR Failed Modal */}
        {showOcrFail && (
             <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-scale-in p-6 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">无法识别</h3>
                    <p className="text-gray-400 text-sm mb-8">未能提取到信息或服务暂时不可用。</p>
                    
                    <button 
                        onClick={switchToManualInput}
                        className="w-full py-3.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 mb-3"
                    >
                        手动输入
                    </button>
                    <button 
                        onClick={() => setShowOcrFail(false)}
                        className="w-full py-3.5 rounded-xl font-bold text-slate-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        取消
                    </button>
                </div>
            </div>
        )}

        {/* OCR Result Modal (List View) */}
        {ocrCandidates.length > 0 && (
            <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[85vh]">
                    <div className="bg-slate-900 px-6 py-6 text-white relative shrink-0 z-10">
                         <div className="flex items-center gap-2 mb-2 opacity-80">
                             <Wand2 size={16} />
                             <span className="text-xs font-bold tracking-wide uppercase">AI 识别结果</span>
                         </div>
                         <h3 className="text-xl font-bold">发现 {ocrCandidates.length} 笔交易</h3>
                         <p className="text-slate-400 text-xs mt-1">请勾选需要入账的交易，或手动添加补充。</p>
                         <button onClick={() => setOcrCandidates([])} className="absolute top-6 right-6 p-1 bg-white/10 rounded-full hover:bg-white/20">
                             <X size={18} />
                         </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 no-scrollbar relative z-0">
                        {ocrCandidates.map((candidate, idx) => {
                            const isSelected = selectedOcrIndices.has(idx);
                            return (
                                <div key={idx} className={`bg-white p-3 rounded-2xl shadow-sm border transition-all flex items-center gap-3 ${isSelected ? 'border-indigo-500/30 bg-indigo-50/10' : 'border-gray-100'}`}>
                                    <button 
                                        onClick={() => toggleOcrSelection(idx)}
                                        className={`shrink-0 transition-colors ${isSelected ? 'text-indigo-600' : 'text-gray-300'}`}
                                    >
                                        {isSelected ? <CheckCircle2 size={22} fill="currentColor" className="text-white bg-indigo-600 rounded-full" /> : <Circle size={22} />}
                                    </button>

                                    <div className="flex-1" onClick={() => startEditOcrCandidate(idx)}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm line-clamp-1">{candidate.note || '未命名交易'}</p>
                                                <div className="flex flex-wrap gap-2 mt-1 items-center">
                                                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 border border-gray-200">
                                                        {CategoryLabels[candidate.category] || candidate.category}
                                                    </span>
                                                    {candidate.tags?.map(tag => (
                                                        <span key={tag} className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded border border-indigo-100">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {candidate.date && (
                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-1 font-mono">
                                                             <Calendar size={10} />
                                                             {candidate.date.replace('T', ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`font-mono font-bold text-base tabular-nums ${candidate.type === TransactionType.EXPENSE ? 'text-sl-expense' : 'text-sl-income'}`}>
                                                {formatCurrency(Math.abs(candidate.amount))}
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => startEditOcrCandidate(idx)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-4 bg-white border-t border-gray-100 shrink-0 flex flex-col gap-3 relative z-10">
                        <div className="flex gap-3">
                             {selectedOcrIndices.size > 0 ? (
                                <>
                                    <button 
                                        onClick={handleBatchConfirm}
                                        className="flex-1 py-3.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} />
                                        确认 ({selectedOcrIndices.size})
                                    </button>
                                    <button 
                                        onClick={handleBatchDelete}
                                        className="w-14 py-3.5 rounded-xl font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </>
                             ) : (
                                <button 
                                    onClick={() => setSelectedOcrIndices(new Set(ocrCandidates.map((_, i) => i)))}
                                    className="flex-1 py-3.5 rounded-xl font-bold text-slate-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    全选
                                </button>
                             )}
                        </div>
                        
                        <button 
                            onClick={startAddToOcr}
                            className="w-full py-3.5 rounded-xl font-bold text-slate-500 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={18} />
                            添加新交易
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Settings Modal (Updated) */}
        {view === 'SETTINGS' && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Settings size={24} /> 设置
                    </h2>

                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-slate-800 mb-3">财务配置</h3>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-3">
                             <label className="block text-xs text-gray-500 mb-2 font-medium">月度预算 (元)</label>
                             <div className="flex gap-2">
                                 <input 
                                    type="number"
                                    value={budgetInput}
                                    onChange={(e) => setBudgetInput(e.target.value)}
                                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-mono"
                                 />
                                 <button 
                                    onClick={saveBudget}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
                                 >
                                    更新
                                 </button>
                             </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">按键音效</span>
                            <button 
                                onClick={toggleSound}
                                className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${settings.soundEnabled ? 'bg-indigo-500' : 'bg-gray-300'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>
                    
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-slate-800 mb-3">AI 配置</h3>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                             <label className="block text-xs text-gray-500 mb-2 font-medium">Gemini API Key</label>
                             <input 
                                type="password"
                                value={apiKeyInput}
                                onChange={(e) => setApiKeyInput(e.target.value)}
                                placeholder="sk-..."
                                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 mb-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                             />
                             <button 
                                onClick={saveApiKey}
                                className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
                             >
                                保存 Key
                             </button>
                             <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                                用于支持 OCR 和语音记账。Key 仅保存在本地。
                             </p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-slate-800 mb-3">数据安全</h3>
                        <div className="space-y-3">
                            <button 
                                onClick={handleExportData}
                                className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-gray-100 transition-colors"
                            >
                                <Download size={16} /> 导出账本数据
                            </button>
                            
                            <div className="relative">
                                <input 
                                    type="file" 
                                    ref={backupInputRef}
                                    accept=".json"
                                    className="hidden"
                                    onChange={handleImportData}
                                />
                                <button 
                                    onClick={() => backupInputRef.current?.click()}
                                    className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-slate-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-gray-100 transition-colors"
                                >
                                    <Upload size={16} /> 导入恢复数据
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 text-center">
                         <p className="text-sm text-gray-500 font-medium">SmartLedger Pro</p>
                         <p className="text-xs text-gray-300 mt-1">Version 2.3.0</p>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setView('DASHBOARD')}
                            className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Toast */}
        <div className={`
            fixed top-4 left-4 right-4 z-[80] bg-slate-900/90 text-white px-4 py-3 rounded-2xl shadow-xl backdrop-blur text-sm font-medium flex items-center gap-3 transition-all duration-500 transform
            ${toast.visible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}
        `}>
            <div className="bg-emerald-500 text-white rounded-full p-0.5"><CheckSquare size={12} fill="currentColor" /></div>
            {toast.message}
        </div>

        {/* Header */}
        <header className="px-6 pt-12 pb-4 bg-sl-bg sticky top-0 z-40 transition-all">
           <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-slate-900 rounded-[14px] flex items-center justify-center text-white font-bold shadow-lg shadow-slate-900/20">
                   S
               </div>
               <div>
                   <h1 className="font-bold text-slate-900 text-lg leading-tight tracking-tight">SmartLedger</h1>
                   <div className="flex items-center gap-2">
                       <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase font-bold">PRO VERSION</p>
                       <span className="text-[10px] bg-red-500 text-white px-1.5 rounded-sm font-bold font-mono">v2.3</span>
                   </div>
               </div>
             </div>
             <div className="flex gap-3">
                 <button onClick={() => setView('SETTINGS')} className="p-2 bg-white rounded-full shadow-sm active:scale-90 transition-transform">
                     <Settings size={20} className="text-gray-400" />
                 </button>
             </div>
           </div>
           
           {/* Net Worth / Budget Card */}
           <div 
             onClick={() => setShowBudget(!showBudget)}
             className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden transform transition-all active:scale-[0.98] cursor-pointer mb-6"
           >
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
               <div className="absolute top-10 -left-10 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
               
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                          {showBudget ? '本月剩余预算 (Budget Left)' : '净资产 (Net Worth)'}
                          <RefreshCw size={10} className="opacity-50" />
                      </p>
                      <h1 className="text-4xl font-mono font-bold tracking-tight tabular-nums">
                        {formatCurrency(showBudget ? remainingBudget : totalBalance)}
                      </h1>
                  </div>
              </div>
              
              <div className="mt-5 flex gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">本月支出</span>
                    <span className="text-sm font-mono font-medium">{formatCurrency(currentMonthExpense)}</span>
                  </div>
              </div>
           </div>

           {/* Search Bar */}
           {view === 'DASHBOARD' && (
               <div className="relative mb-2">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                   <input 
                      type="text" 
                      placeholder="搜索账单、金额或分类..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white h-12 rounded-2xl pl-11 pr-4 text-sm font-medium shadow-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-gray-300"
                   />
                   {searchTerm && (
                       <button 
                         onClick={() => setSearchTerm('')}
                         className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                       >
                           <X size={14} />
                       </button>
                   )}
               </div>
           )}
        </header>

        {view === 'STATS' ? (
             <div className="flex-1 overflow-auto animate-fade-in no-scrollbar relative z-0">
                 <Charts transactions={transactions} />
             </div>
        ) : view === 'DASHBOARD' || view === 'SETTINGS' ? (
            <div className="flex-1 overflow-auto no-scrollbar animate-fade-in relative z-0">
                <TransactionList 
                    transactions={filteredTransactions} 
                    onTransactionClick={startEditTransaction}
                />
            </div>
        ) : null}

        {/* FABs */}
        <div className="fixed bottom-28 right-6 z-20 flex flex-col gap-4 items-end">
            <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
            />
            <button 
                onClick={() => {
                    fileInputRef.current?.click();
                }}
                className="w-12 h-12 bg-white text-slate-700 rounded-full shadow-lg shadow-slate-900/10 flex items-center justify-center border border-slate-100 active:scale-90 transition-transform"
            >
                <Camera size={22} />
            </button>
            <button 
                onClick={() => {
                    setView('AI_INPUT');
                }}
                className="w-12 h-12 bg-white text-sl-income rounded-full shadow-lg shadow-sl-income/20 flex items-center justify-center border border-sl-income/10 active:scale-90 transition-transform"
            >
                <Mic size={22} />
            </button>
            <button 
                onClick={() => {
                    resetForm();
                    setView('ADD_TRANSACTION');
                }}
                className="w-16 h-16 bg-slate-900 text-white rounded-[24px] shadow-2xl shadow-slate-900/40 flex items-center justify-center active:scale-90 transition-transform"
            >
                <Plus size={32} />
            </button>
        </div>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 h-24 bg-white/90 backdrop-blur-xl border-t border-gray-100 flex justify-around items-start pt-4 px-6 z-30 max-w-md mx-auto pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            <button 
                onClick={() => setView('DASHBOARD')}
                className={`flex flex-col items-center gap-1.5 transition-colors w-16 ${view === 'DASHBOARD' || view === 'SETTINGS' ? 'text-slate-900' : 'text-gray-300'}`}
            >
                <Home size={24} strokeWidth={view === 'DASHBOARD' ? 2.5 : 2} />
                <span className="text-[10px] font-bold tracking-wide">账本</span>
            </button>
            <button 
                onClick={() => setView('STATS')}
                className={`flex flex-col items-center gap-1.5 transition-colors w-16 ${view === 'STATS' ? 'text-slate-900' : 'text-gray-300'}`}
            >
                <BarChart2 size={24} strokeWidth={view === 'STATS' ? 2.5 : 2} />
                <span className="text-[10px] font-bold tracking-wide">报表</span>
            </button>
        </nav>
      </main>
    );
  };

  return (
    <div className="bg-sl-bg min-h-screen text-slate-800 font-sans selection:bg-indigo-100">
      {renderContent()}
    </div>
  );
};

export default App;
