export interface BotKnowledgeItem {
  id: string;
  category: string;
  keywords: string[];
  intent: string;
  response: string;
  actionSuggestions?: Array<{
    label: string;
    action: string;
    payload?: any;
  }>;
}

export const LITMUS_KNOWLEDGE_BASE: BotKnowledgeItem[] = [
  {
    id: 'food_testing_overview',
    category: 'Testing Services',
    keywords: ['food test', 'food testing', 'what tests', 'testing capability', 'analysis', 'product test', 'parameters'],
    intent: 'food_testing_capabilities',
    response:
      'Litmus offers comprehensive NABL-accredited & FSSAI-compliant testing across multiple food categories including Dairy, Edible Oils, Spices & Condiments, Honey, Beverages, Meat & Poultry, Packaged Foods, and Water. We test for chemical contaminants, pesticide residues, heavy metals, adulterants, and microbiological safety.',
    actionSuggestions: [
      { label: '🥛 Dairy & Milk Tests', action: 'ask_category', payload: 'dairy' },
      { label: '🛢️ Edible Oils & Ghee', action: 'ask_category', payload: 'oils' },
      { label: '🌶️ Spices & Seasonings', action: 'ask_category', payload: 'spices' },
      { label: '🍯 Honey & Syrups', action: 'ask_category', payload: 'honey' },
      { label: '💧 Drinking & Process Water', action: 'ask_category', payload: 'water' },
      { label: '👨‍🔬 Talk to Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'dairy_testing',
    category: 'Categories',
    keywords: ['dairy', 'milk', 'cheese', 'butter', 'paneer', 'curd', 'yoghurt', 'adulteration'],
    intent: 'dairy_testing',
    response:
      'Our Dairy Testing suite includes adulteration screening (detergent, starch, urea, neutralizers, maltodextrin), fat & SNF testing, antibiotics residue, Aflatoxin M1, and microbiological pathogens (Salmonella, Listeria, Coliforms).',
    actionSuggestions: [
      { label: '📋 View Dairy Packages', action: 'navigate_packages', payload: 'dairy' },
      { label: '⏱️ Check Turnaround Time', action: 'ask_faq', payload: 'tat' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'spices_testing',
    category: 'Categories',
    keywords: ['spice', 'spices', 'turmeric', 'chilli', 'coriander', 'pepper', 'curcumin', 'lead chromate', 'ethlyene oxide', 'eto'],
    intent: 'spices_testing',
    response:
      'For Spices & Condiments, we test for moisture, total ash, volatile oil, curcumin percentage (in turmeric), pesticide residues (500+ screen), ethylene oxide (EtO), Sudan dyes, lead chromate adulteration, and aflatoxins.',
    actionSuggestions: [
      { label: '📋 View Spice Packages', action: 'navigate_packages', payload: 'spices' },
      { label: '📦 How to submit sample?', action: 'ask_faq', payload: 'sample_submission' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'water_testing',
    category: 'Categories',
    keywords: ['water', 'drinking water', 'borewell', 'effluent', 'ro water', 'is 10500', 'is 14543'],
    intent: 'water_testing',
    response:
      'We test Drinking Water as per IS 10500:2012, Packaged Drinking Water (IS 14543), and Process Water. Testing covers physical parameters (pH, TDS, Turbidity), chemical ions, heavy metals (Lead, Arsenic, Cadmium, Mercury), and microbiological counts (E. coli, Coliforms).',
    actionSuggestions: [
      { label: '💧 Water Test Packages', action: 'navigate_packages', payload: 'water' },
      { label: '📦 Sample Quantity Required', action: 'ask_faq', payload: 'sample_quantity' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'fssai_compliance',
    category: 'Compliance',
    keywords: ['fssai', 'compliance', 'regulation', 'nutritional facts', 'label', 'licence', 'license', 'mandatory'],
    intent: 'fssai_compliance',
    response:
      'Litmus generates official NABL & FSSAI compliant test reports with QR verification, valid for regulatory inspections, export clearance, and mandatory annual/biannual testing under FSSAI regulations. We also assist with 100g Nutritional Fact Panel labeling.',
    actionSuggestions: [
      { label: '🏷️ Nutritional Label Testing', action: 'ask_faq', payload: 'nutrition_label' },
      { label: '📄 Report Verification Info', action: 'ask_faq', payload: 'report_verification' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'turnaround_time',
    category: 'Process',
    keywords: ['turnaround', 'tat', 'how long', 'duration', 'time required', 'fast report', 'urgent', 'delivery time'],
    intent: 'tat',
    response:
      'Standard turnaround time is 3 to 5 business days from sample receipt at the lab. We also offer Express Testing (24-48 hours) for critical batches and raw material clearance upon prior scheduling.',
    actionSuggestions: [
      { label: '⚡ Request Express Testing', action: 'request_live_support' },
      { label: '📦 Sample Pickup Process', action: 'ask_faq', payload: 'sample_submission' },
    ],
  },
  {
    id: 'sample_submission',
    category: 'Process',
    keywords: ['sample submission', 'how to send', 'courier', 'pickup', 'collect', 'address', 'shipping', 'packaging'],
    intent: 'sample_submission',
    response:
      'You can submit samples in 2 easy ways:\n1. 🚚 **Doorstep Sample Pickup**: Available in major hub cities directly through our logistics network.\n2. 📦 **Direct Courier**: Dispatch securely packed and labeled samples to our nearest accredited partner laboratory. Once you book online, a Sample Submission Slip with dispatch instructions is automatically generated.',
    actionSuggestions: [
      { label: '📍 View Pickup Coverage', action: 'ask_faq', payload: 'pickup_coverage' },
      { label: '📋 Book a Test Online', action: 'navigate', payload: '/tests' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'sample_quantity',
    category: 'Process',
    keywords: ['sample quantity', 'how much sample', 'grams required', 'litres', 'volume', 'size'],
    intent: 'sample_quantity',
    response:
      'Standard recommended sample quantities:\n• Solid/Powder Food: 250g - 500g in sealed airtight pack\n• Liquids / Oils / Honey: 250ml - 500ml in clean leak-proof container\n• Drinking Water (Chemical + Micro): 2 Litres in sterile / clean PET bottle\n• Microbiological testing alone: Min 100g in sterile condition.',
    actionSuggestions: [
      { label: '📦 How to Pack Samples', action: 'ask_faq', payload: 'sample_submission' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'pricing_payment',
    category: 'Commercial',
    keywords: ['price', 'pricing', 'cost', 'fee', 'charge', 'rate', 'payment', 'discount', 'bulk'],
    intent: 'pricing_payment',
    response:
      'Test pricing is transparently listed on our platform for all individual parameters and bundled packages. We accept all major cards, UPI, Net Banking, and corporate invoices. Volume discounts are available for recurring monthly food manufacturer subscriptions.',
    actionSuggestions: [
      { label: '🏷️ Browse Test Packages', action: 'navigate', payload: '/packages' },
      { label: '💼 Corporate Inquiries', action: 'request_live_support' },
    ],
  },
  {
    id: 'report_tracking',
    category: 'Account',
    keywords: ['report status', 'track report', 'download report', 'where is my report', 'test status', 'pdf'],
    intent: 'report_tracking',
    response:
      'You can view real-time testing progress and download your signed QR-verified NABL PDF reports anytime from the "My Bookings" section of your Litmus account. We also notify you via Email and WhatsApp as soon as your report is ready.',
    actionSuggestions: [
      { label: '📄 Go to My Bookings', action: 'navigate', payload: '/dashboard/bookings' },
      { label: '👨‍🔬 Help with Booking ID', action: 'request_live_support' },
    ],
  },
];

export class BotKnowledgeService {
  /**
   * Process a natural language query and return matching bot response or fallback
   */
  public static matchQuery(query: string): {
    answer: string;
    intent: string;
    actionSuggestions: Array<{ label: string; action: string; payload?: any }>;
    matched: boolean;
  } {
    const cleanQuery = query.toLowerCase().trim();

    if (!cleanQuery) {
      return {
        answer: 'Hello! I am Litmus Pathology & Food Intelligence Assistant. How can I assist you with your diagnostic and laboratory testing needs today?',
        intent: 'welcome',
        actionSuggestions: [
          { label: '🔬 Explore Food Tests', action: 'ask_faq', payload: 'food_testing_overview' },
          { label: '🥛 Dairy & Milk Quality', action: 'ask_category', payload: 'dairy' },
          { label: '📦 How to Send Samples', action: 'ask_faq', payload: 'sample_submission' },
          { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
        ],
        matched: true,
      };
    }

    // Direct match check
    for (const item of LITMUS_KNOWLEDGE_BASE) {
      if (item.intent === cleanQuery || item.id === cleanQuery) {
        return {
          answer: item.response,
          intent: item.intent,
          actionSuggestions: item.actionSuggestions || [],
          matched: true,
        };
      }
    }

    // Keyword scoring
    let bestMatch: BotKnowledgeItem | null = null;
    let highestScore = 0;

    for (const item of LITMUS_KNOWLEDGE_BASE) {
      let score = 0;
      for (const kw of item.keywords) {
        if (cleanQuery.includes(kw.toLowerCase())) {
          score += kw.length; // Higher weight for longer matching phrases
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    if (bestMatch && highestScore >= 3) {
      return {
        answer: bestMatch.response,
        intent: bestMatch.intent,
        actionSuggestions: bestMatch.actionSuggestions || [
          { label: '👨‍🔬 Talk to Specialist', action: 'request_live_support' },
        ],
        matched: true,
      };
    }

    // Fallback response with helpful guided paths
    return {
      answer:
        "I can help you explore our NABL food testing packages, sample submission guidelines, turnaround times, and FSSAI compliance requirements. Would you like to check specific parameters or connect directly with our technical support team?",
      intent: 'fallback',
      actionSuggestions: [
        { label: '🔬 Food Testing Services', action: 'ask_faq', payload: 'food_testing_overview' },
        { label: '📦 Sample Pickup & Courier', action: 'ask_faq', payload: 'sample_submission' },
        { label: '⏱️ Turnaround Times', action: 'ask_faq', payload: 'turnaround_time' },
        { label: '👨‍🔬 Connect to Live Support', action: 'request_live_support' },
      ],
      matched: false,
    };
  }
}
