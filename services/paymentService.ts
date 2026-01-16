export const paymentService = {
  /**
   * Validates a credit card number using the Luhn Algorithm.
   * This ensures the card number is mathematically valid, making the mock feel real.
   */
  validateCard: (number: string): boolean => {
    // Remove all non-digit characters
    const digits = number.replace(/\D/g, '');
    
    // Check for standard lengths (13-19 digits)
    if (digits.length < 13 || digits.length > 19) return false;
    
    // Luhn Algorithm Implementation
    let sum = 0;
    let shouldDouble = false;
    
    // Iterate from right to left
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i));

      if (shouldDouble) {
        if ((digit *= 2) > 9) digit -= 9;
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    return (sum % 10) === 0;
  },

  /**
   * Simulates a payment transaction to an external provider.
   */
  processPayment: async (amount: number, method: 'card' | 'paypal', details: any): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 1. Validation Logic
        if (method === 'card') {
           if (!paymentService.validateCard(details.number)) {
             resolve({ success: false, error: 'invalid_card' });
             return;
           }
        }

        // 2. Simulate Success for Demo purposes
        // In a real app, this would fetch() to a backend endpoint.
        resolve({ success: true });
      }, 2500); // 2.5s delay to simulate network latency and processing time
    });
  }
};