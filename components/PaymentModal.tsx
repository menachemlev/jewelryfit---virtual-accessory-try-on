import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import { translations } from '../constants/translations';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (amount: number) => void;
  lang: Language;
}

// Declare PayPal SDK types
declare global {
  interface Window {
    paypal?: any;
  }
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onPurchase, lang }) => {
  const t = translations[lang];
  const [selectedTier, setSelectedTier] = useState<number>(20);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const paypalRef = useRef<HTMLDivElement>(null);
  const paypalButtonsRendered = useRef(false);

  const tiers = [
    { diamonds: 1, priceUSD: 0.6, priceILS: 2, popular: false },
    { diamonds: 3, priceUSD: 1.5, priceILS: 5, popular: false },
    { diamonds: 7, priceUSD: 3, priceILS: 10, popular: false },
    { diamonds: 20, priceUSD: 6, priceILS: 20, popular: true },
  ];

  const getPrice = (tier: typeof tiers[0]) => {
    return lang === 'he' ? tier.priceILS : tier.priceUSD;
  };

  const getCurrency = () => {
    return lang === 'he' ? 'ILS' : 'USD';
  };

  const getCurrencySymbol = () => {
    return lang === 'he' ? '₪' : '$';
  };

  const selectedTierData = tiers.find(t => t.diamonds === selectedTier);

  // Load PayPal SDK
  useEffect(() => {
    if (!isOpen) return;

    // Check if PayPal SDK is already loaded
    if (window.paypal) {
      renderPayPalButtons();
      return;
    }

    // Load PayPal SDK script
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test'}&currency=${getCurrency()}`;
    script.async = true;
    script.onload = () => {
      renderPayPalButtons();
    };
    script.onerror = () => {
      setErrorMsg('Failed to load PayPal. Please try again.');
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [isOpen, selectedTier, lang]);

  const renderPayPalButtons = () => {
    if (!window.paypal || !paypalRef.current || paypalButtonsRendered.current) return;

    // Clear existing buttons
    paypalRef.current.innerHTML = '';

    if (!selectedTierData) return;

    const price = getPrice(selectedTierData).toFixed(2);

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal'
        },
        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{
              description: `${selectedTier} Diamonds - JewelryFit Credits`,
              amount: {
                currency_code: getCurrency(),
                value: price
              }
            }]
          });
        },
        onApprove: async (data: any, actions: any) => {
          setStatus('processing');
          try {
            const order = await actions.order.capture();
            console.log('Payment successful:', order);
            
            setStatus('success');
            // Wait for success animation before triggering action
            setTimeout(() => {
              onPurchase(selectedTier);
            }, 1500);
          } catch (err) {
            console.error('Payment capture error:', err);
            setStatus('error');
            setErrorMsg('Payment processing failed. Please try again.');
          }
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          setStatus('error');
          setErrorMsg('Payment failed. Please try again.');
        },
        onCancel: () => {
          setStatus('idle');
          setErrorMsg('Payment cancelled.');
        }
      }).render(paypalRef.current);

      paypalButtonsRendered.current = true;
    } catch (err) {
      console.error('Error rendering PayPal buttons:', err);
      setErrorMsg('Failed to initialize PayPal. Please refresh and try again.');
    }
  };

  // Reset state when opening/closing or changing selection
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMsg('');
      paypalButtonsRendered.current = false;
    }
  }, [isOpen, selectedTier]);

  if (!isOpen) return null;

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
                   {getCurrencySymbol()}{getPrice(tier).toFixed(lang === 'he' ? 0 : 2)}
                </div>
              </button>
            ))}
          </div>

          {/* PayPal Payment */}
          <div className="bg-blue-50 dark:bg-[#003087]/20 border border-blue-100 dark:border-blue-900 p-6 rounded-xl flex flex-col items-center justify-center gap-3 text-center animate-fade-in min-h-[200px]">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#003087"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.946 5.438-3.667 7.173-7.214 7.173H10.69c-.19 0-.352.12-.382.306l-1.65 10.12c-.066.392-.407.675-.805.675h-1.996c-.63 0-1.122-.55-1.026-1.166l1.246-7.305h.725l-.726 5.001z"/></svg>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{getCurrencySymbol()}{selectedTierData ? getPrice(selectedTierData).toFixed(lang === 'he' ? 0 : 2) : '0'}</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{lang === 'he' ? 'תשלום מאובטח דרך PayPal' : 'Secure payment via PayPal'}</p>
            <div ref={paypalRef} id="paypal-button-container" className="w-full"></div>
            {errorMsg && <p className="text-red-500 text-xs mt-2">{errorMsg}</p>}
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
            <div className="text-sm text-center text-gray-500 dark:text-gray-400">
               {lang === 'he' ? 'לחץ על כפתור PayPal למעלה להשלמת התשלום' : 'Click the PayPal button above to complete payment'}
            </div>
        </div>
      </div>
    </div>
  );
};
