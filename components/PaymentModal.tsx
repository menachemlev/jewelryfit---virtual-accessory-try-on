import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../constants/translations';
import { paymentService } from '../services/paymentService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (amount: number) => void;
  lang: Language;
}

type PaymentMethod = 'card' | 'paypal';

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onPurchase, lang }) => {
  const t = translations[lang];
  const [selectedTier, setSelectedTier] = useState<number>(5);
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form State
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tiers = [
    { diamonds: 1, priceUSD: 0.6, priceILS: 2, popular: false },
    { diamonds: 3, priceUSD: 1.5, priceILS: 5, popular: true },
    { diamonds: 7, priceUSD: 3, priceILS: 10, popular: false },
    { diamonds: 20, priceUSD: 6, priceILS: 20, popular: false },
  ];

  const getPrice = (tier: typeof tiers[0]) => {
    return lang === 'he' ? tier.priceILS : tier.priceUSD;
  };

  const getCurrency = () => {
    return lang === 'he' ? '₪' : '$';
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    val = val.substring(0, 16);
    val = val.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(val);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 2) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setExpiry(val);
  };

  const handlePay = async () => {
    if (method === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 13) {
        setErrorMsg(t.payment.invalidCard);
        return;
      }
    }
    
    setStatus('processing');
    setErrorMsg('');

    try {
      const selectedTierObj = tiers.find(t => t.diamonds === selectedTier);
      if (!selectedTierObj) return;

      const result = await paymentService.processPayment(
        selectedTier, 
        method, 
        { number: cardNumber },
        getPrice(selectedTierObj),
        getCurrency()
      );
      
      if (result.success) {
        setStatus('success');
        // Wait for success animation before triggering action
        setTimeout(() => {
          onPurchase(selectedTier);
        }, 1500);
      } else {
        setStatus('error');
        if (result.error === 'invalid_card') {
          setErrorMsg(t.payment.invalidCard);
        } else {
          setErrorMsg("Transaction failed.");
        }
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg("Connection error.");
    }
  };

  const selectedTierData = tiers.find(t => t.diamonds === selectedTier);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col animate-fade-in-up relative">
        
        {/* Success Overlay */}
        {status === 'success' && (
          <div className="absolute inset-0 z-20 bg-white dark:bg-gray-800 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg mb-4 animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.payment.success}</h3>
            <p className="text-gray-500 dark:text-gray-400">Adding {selectedTier} diamonds...</p>
          </div>
        )}

        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl">💎</span>
              {t.payment.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.payment.subtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
            
          {/* Packages */}
          <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{t.payment.selectPackage}</h4>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {tiers.map((tier) => (
              <button
                key={tier.diamonds}
                onClick={() => setSelectedTier(tier.diamonds)}
                className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                  selectedTier === tier.diamonds 
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-md' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    {t.payment.popular}
                  </span>
                )}
                <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1">
                  <span>💎</span> {tier.diamonds}
                </div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                   {getCurrency()}{getPrice(tier).toFixed(lang === 'he' ? 0 : 2)}
                </div>
              </button>
            ))}
          </div>

          {/* Payment Method */}
          <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{t.payment.paymentMethod}</h4>
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMethod('card')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 border transition-colors ${
                method === 'card'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              {t.payment.creditCard}
            </button>
            <button
              onClick={() => setMethod('paypal')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 border transition-colors ${
                method === 'paypal'
                   ? 'bg-[#003087] text-white border-transparent'
                   : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.946 5.438-3.667 7.173-7.214 7.173H10.69c-.19 0-.352.12-.382.306l-1.65 10.12c-.066.392-.407.675-.805.675h-1.996c-.63 0-1.122-.55-1.026-1.166l1.246-7.305h.725l-.726 5.001z"/></svg>
              {t.payment.paypal}
            </button>
          </div>

          {/* Forms */}
          {method === 'card' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t.payment.cardNumber}</label>
                <div className="relative">
                   <input 
                      type="text" 
                      value={cardNumber}
                      onChange={handleCardChange}
                      placeholder="0000 0000 0000 0000" 
                      className={`w-full bg-gray-50 dark:bg-gray-700/50 border rounded-lg p-3 pl-10 text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-mono ${errorMsg ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                   />
                   <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
                {errorMsg && <p className="text-red-500 text-xs mt-1">{errorMsg}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t.payment.expiry}</label>
                    <input 
                      type="text" 
                      value={expiry}
                      onChange={handleExpiryChange}
                      maxLength={5}
                      placeholder="MM/YY" 
                      className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-mono" 
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t.payment.cvv}</label>
                    <input 
                      type="password" 
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                      maxLength={3}
                      placeholder="123" 
                      className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500 outline-none transition-all font-mono" 
                    />
                </div>
              </div>
            </div>
          )}

          {method === 'paypal' && (
             <div className="bg-blue-50 dark:bg-[#003087]/20 border border-blue-100 dark:border-blue-900 p-6 rounded-xl flex flex-col items-center justify-center gap-3 text-center animate-fade-in min-h-[160px]">
                <p className="text-sm text-gray-600 dark:text-gray-300">{lang === 'he' ? 'עבור ל-PayPal כדי להשלים את הרכישה בצורה מאובטחת.' : 'Proceed to PayPal to complete your purchase securely.'}</p>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {getCurrency()}{selectedTierData ? getPrice(selectedTierData).toFixed(lang === 'he' ? 0 : 2) : '0'}
                </div>
                {/* Visual PayPal button (Mock) */}
                <button className="bg-[#FFC439] hover:bg-[#F4BB35] text-blue-900 font-bold py-2 px-8 rounded-full shadow-sm transition-colors w-2/3">
                   <span className="italic font-bold">Pay</span><span className="italic text-[#003087]">Pal</span>
                </button>
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
            <div className="text-sm font-medium">
               <span className="text-gray-500 dark:text-gray-400">{t.payment.pay}: </span>
               <span className="text-lg font-bold text-gray-900 dark:text-white">{getCurrency()}{selectedTierData ? getPrice(selectedTierData).toFixed(lang === 'he' ? 0 : 2) : '0'}</span>
            </div>
            <button
               onClick={handlePay}
               disabled={status === 'processing' || status === 'success'}
               className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                 status === 'processing' || status === 'success'
                 ? 'bg-gray-400 cursor-not-allowed' 
                 : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 hover:shadow-yellow-500/30'
               }`}
            >
               {status === 'processing' && (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
               )}
               {status === 'processing' ? t.payment.processing : t.payment.pay}
            </button>
        </div>
      </div>
    </div>
  );
};