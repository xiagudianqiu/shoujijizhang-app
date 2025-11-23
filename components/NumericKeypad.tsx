
import React, { useState, useEffect } from 'react';
import { Delete, Check, Calendar, Plus, Minus, X, Divide, RotateCcw } from 'lucide-react';
import { centsToDecimal } from '../utils/format';

interface NumericKeypadProps {
  onComplete: (value: number) => void; // Returns cents
  onCancel: () => void;
  onChange: (value: number) => void;
  onDateClick?: () => void;
  initialValue?: number;
}

const NumericKeypad: React.FC<NumericKeypadProps> = ({ onComplete, onCancel, onChange, onDateClick, initialValue = 0 }) => {
  const [display, setDisplay] = useState(initialValue !== 0 ? (initialValue / 100).toString() : '');
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Sync with prop changes (essential for editing workflows)
  useEffect(() => {
    setDisplay(initialValue !== 0 ? (initialValue / 100).toString() : '');
  }, [initialValue]);
  
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (navigator.vibrate) {
      if (style === 'light') navigator.vibrate(10);
      if (style === 'medium') navigator.vibrate(20);
      if (style === 'heavy') navigator.vibrate(40);
    }
  };

  const playSound = (type: 'click' | 'complete' = 'click') => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'click') {
        // Mechanical switch sound simulation
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);
    } else {
        // Success "Ding"
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.4);
    }
  };

  const handlePress = (key: string) => {
    triggerHaptic('light');
    playSound('click');
    
    if (key === 'AC') {
      setDisplay('');
      onChange(0);
      return;
    }
    
    const lastChar = display.slice(-1);
    const isOperator = ['+', '-', '*', '/'].includes(key);
    const isLastOperator = ['+', '-', '*', '/'].includes(lastChar);
    
    if (isOperator && isLastOperator) {
      setDisplay(prev => prev.slice(0, -1) + key);
      return;
    }

    if (key === '.' && display.includes('.') && !['+', '-', '*', '/'].some(op => display.includes(op))) {
        return; // Basic dot prevention
    }

    const newDisplay = display + key;
    setDisplay(newDisplay);
    
    if (!isOperator) {
        onChange(evaluate(newDisplay));
    }
  };

  const handleDelete = () => {
    triggerHaptic('medium');
    playSound('click');
    const newDisplay = display.slice(0, -1);
    setDisplay(newDisplay);
    onChange(evaluate(newDisplay));
  };

  const evaluate = (expr: string): number => {
      try {
        // Allow negative numbers at the start
        const sanitized = expr.replace(/[^0-9+\-*/.]/g, '');
        if (!sanitized) return 0;
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitized})`)();
        if (!isFinite(result)) return 0;
        return Math.round(parseFloat(result) * 100);
      } catch (e) {
        return 0;
      }
  };

  const handleComplete = () => {
    triggerHaptic('heavy');
    playSound('complete');
    setIsCompleted(true);
    
    const cents = evaluate(display);
    
    // Delay slightly to show animation
    setTimeout(() => {
        onComplete(cents);
        setIsCompleted(false);
    }, 600);
  };

  const buttons = [
    { label: 'AC', action: () => handlePress('AC'), style: 'text-sl-expense font-bold' },
    { label: '÷', action: () => handlePress('/'), style: 'text-sl-income font-bold text-2xl' },
    { label: '×', action: () => handlePress('*'), style: 'text-sl-income font-bold text-2xl' },
    { label: <Delete size={24} />, action: handleDelete, style: 'text-slate-600' },
    
    { label: '7', action: () => handlePress('7') },
    { label: '8', action: () => handlePress('8') },
    { label: '9', action: () => handlePress('9') },
    { label: '−', action: () => handlePress('-'), style: 'text-sl-income font-bold text-2xl' },
    
    { label: '4', action: () => handlePress('4') },
    { label: '5', action: () => handlePress('5') },
    { label: '6', action: () => handlePress('6') },
    { label: '+', action: () => handlePress('+'), style: 'text-sl-income font-bold text-2xl' },
    
    { label: '1', action: () => handlePress('1') },
    { label: '2', action: () => handlePress('2') },
    { label: '3', action: () => handlePress('3') },
    { label: <Calendar size={22} />, action: () => onDateClick && onDateClick(), style: 'text-slate-400 active:text-sl-income' }, 
    
    { label: '0', action: () => handlePress('0') },
    { label: '.', action: () => handlePress('.') },
    { label: '00', action: () => handlePress('00'), style: 'text-sm font-semibold' },
    { 
        label: isCompleted ? <Check size={32} className="animate-scale-in" /> : 'OK', 
        action: handleComplete, 
        style: `
            ${isCompleted ? 'bg-emerald-500' : 'bg-slate-900'} 
            text-white !rounded-2xl mx-1 shadow-lg active:scale-95 transition-all duration-300
        ` 
    },
  ];

  const currentResult = evaluate(display);
  const hasOperator = ['+', '-', '*', '/'].some(op => display.includes(op));

  return (
    <div className="flex flex-col h-full bg-white rounded-t-3xl shadow-[0_-4px_30px_rgba(0,0,0,0.08)] pb-[calc(env(safe-area-inset-bottom)+3.5rem)]">
      {/* Display Area */}
      <div className="flex-1 flex flex-col justify-end items-end px-8 pb-3 pt-3 border-b border-gray-50 bg-white rounded-t-3xl">
        <div className="text-gray-400 text-sm font-mono h-5 mb-1 opacity-70">
           {hasOperator ? `= ${centsToDecimal(currentResult)}` : ''}
        </div>
        <div className="flex items-baseline w-full justify-end gap-2 overflow-hidden">
             <span className="text-2xl text-gray-300 font-light select-none">¥</span>
             <input 
                readOnly
                value={display || '0'}
                className="text-5xl font-mono font-medium tracking-tight text-slate-900 tabular-nums bg-transparent text-right w-full border-none focus:outline-none p-0"
             />
        </div>
      </div>

      {/* Keypad Grid - Reduced gap and button height for better mobile fit */}
      <div className="grid grid-cols-4 gap-1.5 px-3 pt-3 bg-gray-50/50">
        {buttons.map((btn, idx) => (
          <button
            key={idx}
            onClick={btn.action}
            className={`
              h-12 rounded-2xl flex items-center justify-center text-xl font-medium transition-all active:bg-gray-200 active:shadow-inner select-none
              ${btn.style || 'bg-white text-slate-800 shadow-sm border border-gray-100/50'}
            `}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NumericKeypad;
