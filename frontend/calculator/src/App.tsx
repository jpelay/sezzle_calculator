import { useEffect, useState } from 'react';
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? '/calculate';

type CalculatorButton = {
  label: string;
  onClick: () => void;
  testId: string;
  button_type: 'number' | 'operator';
};

type OperationResponse = {
  result?: string;
  error?: string;
}

function App() {
  return (
    <>
      <div className='min-h-screen min-w-full bg-blue-100 flex flex-col items-center justify-center' data-cy='app-shell'>
        <Calculator />
      </div>
    </>
  )
}

// A small pop-up that simply shows error messages on top of the calculator. It auto-closes after a few seconds, 
// but can also be closed manually by the user
function PopUp({ message, onClose, autoCloseMs = 1500 }: { message: string; onClose: () => void; autoCloseMs?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClosing(true);
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [autoCloseMs]);

  useEffect(() => {
    if (!isClosing) {
      return;
    }

    const closeTimer = setTimeout(() => {
      onClose();
    }, 140);

    return () => clearTimeout(closeTimer);
  }, [isClosing, onClose]);

  const handleClose = () => {
    setIsClosing(true);
  };

  return (
    <div
      className={`absolute bottom-4 left-4 right-4 z-20 rounded-lg border border-red-200 bg-red-300/55 p-3 text-sm text-red-900 shadow-lg backdrop-blur-sm transform-gpu transition-all duration-300 ease-out ${isVisible && !isClosing
        ? 'translate-y-0 scale-100 opacity-100'
        : 'translate-y-2 scale-95 opacity-0 pointer-events-none'
        }`}
    >
      <div className='flex items-start justify-between gap-3'>
        <p className='leading-5'>{message}</p>
        <button
          type='button'
          onClick={handleClose}
          className='rounded-md bg-red-200/80 px-2 py-1 text-xs font-semibold text-red-900 hover:bg-red-200'
        >
          Close
        </button>
      </div>
    </div>
  );
}

// The main component, it manages the logic around the calculator, including the display value, pending calculations,
//  and interactions with the API
function Calculator() {
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [pendingCalculation, setPendingCalculation] = useState<string>('');
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const callCalculateAPI = async (firstOperand: string, operator: string, secondOperand?: string) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operand1: firstOperand,
          operator,
          operand2: secondOperand
        })
      });
      const data: OperationResponse = await response.json();

      if (!response.ok || data.error) {
        const message = data.error || 'Failed to calculate';
        setErrorMessage(message);
        return null;
      }

      return data.result ?? null;
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Unable to reach server. Please try again.');
      return null;
    }
  }

  const inputDigit = (digit: string) => {
    setDisplayValue(displayValue === '0' ? digit : displayValue + digit);
  }

  const inputDecimal = (dot: string) => {
    if (!displayValue.includes(dot)) {
      setDisplayValue(displayValue + dot);
    }
  }

  const deleteCharacter = () => {
    const newValue = displayValue.slice(0, -1);
    setDisplayValue(newValue === '' || newValue === '-' ? '0' : newValue);
  }

  const clearAllScreens = () => {
    setDisplayValue('0');
    setPendingCalculation('');
    setWaitingForSecondOperand(false);
  }

  const handleBinaryOperator = async (operator: string) => {
    // If we are dealing with equals, we don't want it to be seen in the
    // working display calculation
    if (!waitingForSecondOperand && operator === '=') {
      return;
    }

    if (!waitingForSecondOperand) {
      setPendingCalculation(displayValue + ' ' + operator);
      setWaitingForSecondOperand(true);
      setDisplayValue('0');
      return;
    }

    const [firstOperand, prevOperator] = pendingCalculation.split(' ');
    const result = await callCalculateAPI(firstOperand, prevOperator, displayValue);
    if (result === null) {
      return;
    }

    if (operator === '=') {
      setDisplayValue(result);
      setPendingCalculation('');
      setWaitingForSecondOperand(false);
      return;
    }

    setPendingCalculation(result + ' ' + operator);
    setWaitingForSecondOperand(true);
    setDisplayValue('0');
  }

  const handleUnaryOperator = async (operator: string) => {
    const result = await callCalculateAPI(displayValue, operator);
    if (result === null) {
      return;
    }

    setDisplayValue(result);
  }

  const handleSwitchSign = () => {
    if (displayValue !== '0') {
      if (displayValue.startsWith('-')) {
        setDisplayValue(displayValue.substring(1));
      } else {
        setDisplayValue('-' + displayValue);
      }
    }
  }

  const buttons: CalculatorButton[] = [
    { label: '^', onClick: () => handleBinaryOperator('^'), testId: 'button-power', button_type: 'operator' },
    { label: '%', onClick: () => handleUnaryOperator('%'), testId: 'button-percent', button_type: 'operator' },
    { label: 'DEL', onClick: deleteCharacter, testId: 'button-del', button_type: 'operator' },
    { label: 'AC', onClick: clearAllScreens, testId: 'button-all-clear', button_type: 'operator' },
    { label: '√', onClick: () => handleUnaryOperator('sqrt'), testId: 'button-sqrt', button_type: 'operator' },
    { label: '+/-', onClick: handleSwitchSign, testId: 'button-sign', button_type: 'operator' },
    { label: '/', onClick: () => handleBinaryOperator('/'), testId: 'button-divide', button_type: 'operator' },
    { label: '*', onClick: () => handleBinaryOperator('*'), testId: 'button-multiply', button_type: 'operator' },
    { label: '7', onClick: () => inputDigit('7'), testId: 'button-7', button_type: 'number' },
    { label: '8', onClick: () => inputDigit('8'), testId: 'button-8', button_type: 'number' },
    { label: '9', onClick: () => inputDigit('9'), testId: 'button-9', button_type: 'number' },
    { label: '-', onClick: () => handleBinaryOperator('-'), testId: 'button-subtract', button_type: 'operator' },
    { label: '4', onClick: () => inputDigit('4'), testId: 'button-4', button_type: 'number' },
    { label: '5', onClick: () => inputDigit('5'), testId: 'button-5', button_type: 'number' },
    { label: '6', onClick: () => inputDigit('6'), testId: 'button-6', button_type: 'number' },
    { label: '+', onClick: () => handleBinaryOperator('+'), testId: 'button-add', button_type: 'operator' },
    { label: '1', onClick: () => inputDigit('1'), testId: 'button-1', button_type: 'number' },
    { label: '2', onClick: () => inputDigit('2'), testId: 'button-2', button_type: 'number' },
    { label: '3', onClick: () => inputDigit('3'), testId: 'button-3', button_type: 'number' },
    { label: '=', onClick: () => handleBinaryOperator('='), testId: 'button-equals', button_type: 'operator' },
    { label: '0', onClick: () => inputDigit('0'), testId: 'button-0', button_type: 'number' },
    { label: '.', onClick: () => inputDecimal('.'), testId: 'button-decimal', button_type: 'number' },
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        inputDigit(key);
        return;
      }

      if (key === '.') {
        event.preventDefault();
        inputDecimal('.');
        return;
      }

      if (key === '+' || key === '-' || key === '*' || key === '/' || key === '^') {
        event.preventDefault();
        void handleBinaryOperator(key);
        return;
      }

      if (key === 'Enter' || key === '=') {
        event.preventDefault();
        void handleBinaryOperator('=');
        return;
      }

      if (key === '%') {
        event.preventDefault();
        void handleUnaryOperator('%');
        return;
      }

      if (key === 'Backspace') {
        event.preventDefault();
        deleteCharacter();
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        clearAllScreens();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayValue, pendingCalculation, waitingForSecondOperand]);

  return (
    <div className='relative w-full max-w-sm' data-cy='calculator'>
      <div className='bg-slate-800 p-6 rounded-3xl shadow-2xl w-full border border-slate-700'>
        <div className='flex flex-col bg-slate-700 p-4 rounded-lg text-right text-2xl text-white mb-4'>
          <div className='text-sm text-white h-5 leading-5 overflow-hidden' data-cy='pending-calculation'>
            {pendingCalculation || '\u00a0'}
          </div>
          <div className='truncate' data-cy='display-value'>
            {displayValue}
          </div>
        </div>
        <div className='grid grid-cols-4 gap-4'>
          {buttons.map(({ label, onClick, testId, button_type }) => (
            <Button
              key={label}
              label={label}
              onClick={onClick}
              testId={testId}
              button_type={button_type}
            />
          ))}
        </div>
      </div>
      {errorMessage && <PopUp message={errorMessage} onClose={() => setErrorMessage('')} />}
    </div>
  )
}

// The different buttons for the calculator, there are two kinds right now, but could be easily extended to include more 
// (like functions) if needed. The styling is mostly the same between them, with some small differences to make them easier to identify
function Button({ label, onClick, testId, button_type }: CalculatorButton) {
  return (
    <button
      className={`button_${button_type} rounded-lg p-4 text-xl w-full cursor-pointer hover:bg-slate-500 hover:scale-105 transition-transform hover:shadow-lg hover:brightness-110 active:scale-95`}
      data-cy={testId}
      onClick={onClick}
      type='button'
    >
      {label}
    </button>
  )
}
export default App
