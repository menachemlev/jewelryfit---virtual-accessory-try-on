import React from 'react';
import { PricingTier } from '../types';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTier: (tier: PricingTier) => void;
  lang: 'en' | 'he' | 'ar';
  currentCredits: number;
  showFreeTrialInfo?: boolean;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSelectTier,
  lang,
  currentCredits,
  showFreeTrialInfo = false
}) => {
  if (!isOpen) return null;

  const translations = {
    en: {
      title: "Unlock Premium Results",
      subtitle: "Remove watermarks and unlock AI styling advice",
      freeTrial: "Free Trial",
      freeTrialDesc: "2 watermarked images to test our tech",
      currentCredits: "Current Credits",
      perImage: "per image",
      features: "Features",
      removeWatermark: "Remove watermark",
      aiStylist: "AI Stylist analysis",
      popularChoice: "Most Popular",
      bestValue: "Best Value",
      forVendors: "Perfect for vendors",
      selectPlan: "Select Plan",
      noThanks: "Continue with watermark"
    },
    he: {
      title: "שדרג לתוצאות פרימיום",
      subtitle: "הסר סימני מים וקבל ייעוץ סטייל מ-AI",
      freeTrial: "ניסיון חינם",
      freeTrialDesc: "2 תמונות עם סימן מים לבדיקה",
      currentCredits: "קרדיטים נוכחיים",
      perImage: "לתמונה",
      features: "תכונות",
      removeWatermark: "הסרת סימן מים",
      aiStylist: "ניתוח מעצב AI",
      popularChoice: "הכי פופולרי",
      bestValue: "הכי משתלם",
      forVendors: "מושלם לספקים",
      selectPlan: "בחר תוכנית",
      noThanks: "המשך עם סימן מים"
    },
    ar: {
      title: "فتح النتائج المميزة",
      subtitle: "إزالة العلامات المائية وفتح نصائح تصميم الذكاء الاصطناعي",
      freeTrial: "تجربة مجانية",
      freeTrialDesc: "صورتان مع علامة مائية لاختبار التقنية",
      currentCredits: "الاعتمادات الحالية",
      perImage: "لكل صورة",
      features: "المميزات",
      removeWatermark: "إزالة العلامة المائية",
      aiStylist: "تحليل مصمم الذكاء الاصطناعي",
      popularChoice: "الأكثر شعبية",
      bestValue: "أفضل قيمة",
      forVendors: "مثالي للبائعين",
      selectPlan: "اختر الخطة",
      noThanks: "تابع مع العلامة المائية"
    }
  };

  const t = translations[lang];

  const pricingTiers: PricingTier[] = [
    {
      id: 'single',
      name: lang === 'en' ? 'Single Unlock' : lang === 'he' ? 'פתיחה יחידה' : 'فتح واحد',
      price: 5,
      credits: 1,
      description: lang === 'en' ? 'Perfect for one-time use' : lang === 'he' ? 'מושלם לשימוש חד פעמי' : 'مثالي للاستخدام مرة واحدة'
    },
    {
      id: 'starter',
      name: lang === 'en' ? 'Starter' : lang === 'he' ? 'מתחילים' : 'مبتدئ',
      price: 10,
      credits: 3,
      description: lang === 'en' ? 'Try multiple styles' : lang === 'he' ? 'נסה כמה סגנונות' : 'جرب أنماط متعددة',
      popular: true
    },
    {
      id: 'pro',
      name: lang === 'en' ? 'Pro' : lang === 'he' ? 'מקצועי' : 'محترف',
      price: 20,
      credits: 10,
      description: lang === 'en' ? 'Best value for enthusiasts' : lang === 'he' ? 'הכי משתלם לחובבים' : 'أفضل قيمة للهواة'
    },
    {
      id: 'business',
      name: lang === 'en' ? 'Business' : lang === 'he' ? 'עסקי' : 'عمل',
      price: 50,
      credits: 50,
      description: lang === 'en' ? 'For jewelry vendors & stores' : lang === 'he' ? 'לספקי תכשיטים וחנויות' : 'لبائعي المجوهرات والمتاجر'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-3xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">{t.title}</h2>
              <p className="text-purple-100">{t.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Credits */}
          {currentCredits > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 w-fit">
              <span className="text-lg">💎</span>
              <span className="font-semibold">{t.currentCredits}: {currentCredits}</span>
            </div>
          )}
        </div>

        {/* Free Trial Info */}
        {showFreeTrialInfo && (
          <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-bold text-yellow-900 dark:text-yellow-100">{t.freeTrial}</h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">{t.freeTrialDesc}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-6 border-2 transition-all hover:shadow-xl hover:scale-105 cursor-pointer ${
                tier.popular
                  ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              }`}
              onClick={() => onSelectTier(tier)}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  ⭐ {t.popularChoice}
                </div>
              )}

              {/* Price */}
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tier.price} ₪
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {tier.credits} {tier.credits === 1 ? 'credit' : 'credits'}
                </div>
              </div>

              {/* Name & Description */}
              <div className="text-center mb-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                  {tier.name}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {tier.description}
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t.removeWatermark}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t.aiStylist}</span>
                </div>
              </div>

              {/* Select Button */}
              <button
                onClick={() => onSelectTier(tier)}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  tier.popular
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                {t.selectPlan}
              </button>

              {/* Per image cost */}
              <div className="text-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                {(tier.price / tier.credits).toFixed(2)} ₪ {t.perImage}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-center">
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline text-sm"
          >
            {t.noThanks}
          </button>
        </div>
      </div>
    </div>
  );
};
