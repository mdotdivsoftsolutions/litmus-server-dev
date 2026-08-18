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
    id: 'greeting',
    category: 'General',
    keywords: ['hi', 'hello', 'helo', 'hey', 'namaste', 'good morning', 'good evening', 'good afternoon', 'start', 'help', 'hai', 'hlo', 'howdy', 'welcome', 'greetings'],
    intent: 'greeting',
    response:
      'Hello! Welcome to Litmus Diagnostic & Food Testing Assistance. I can help you check test parameters, turnaround times, sample dispatch guidelines, or connect with our laboratory team. What would you like to explore today?',
    actionSuggestions: [
      { label: '🔬 Food Testing Services', action: 'ask_faq', payload: 'food_testing_overview' },
      { label: '🥛 Dairy & Milk Quality', action: 'ask_category', payload: 'dairy' },
      { label: '📦 How to Send Samples', action: 'ask_faq', payload: 'sample_submission' },
      { label: '⏱️ Turnaround Times', action: 'ask_faq', payload: 'turnaround_time' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'food_testing_overview',
    category: 'Testing Services',
    keywords: ['food test', 'food testing', 'what tests', 'testing capability', 'analysis', 'product test', 'parameters', 'categories', 'services'],
    intent: 'food_testing_capabilities',
    response:
      'Litmus provides comprehensive NABL-accredited (ISO/IEC 17025) & FSSAI-compliant laboratory testing across:\n• Dairy, Ghee & Milk Products\n• Edible Oils & Fats\n• Spices, Herbs & Seasonings\n• Honey & Sweeteners\n• Drinking & Process Water\n• Packaged Foods & Nutritional Labeling\n• Microbiological & Pathogen Screening\n• Pesticide & Heavy Metal Residues',
    actionSuggestions: [
      { label: '🥛 Dairy & Milk Tests', action: 'ask_category', payload: 'dairy' },
      { label: '🛢️ Edible Oils & Ghee', action: 'ask_category', payload: 'oils' },
      { label: '🌶️ Spices & Seasonings', action: 'ask_category', payload: 'spices' },
      { label: '💧 Water Test Packages', action: 'ask_category', payload: 'water' },
      { label: '👨‍🔬 Talk to Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'dairy_testing',
    category: 'Categories',
    keywords: ['dairy', 'milk', 'cheese', 'butter', 'paneer', 'curd', 'yoghurt', 'adulteration', 'snf', 'urea', 'detergent'],
    intent: 'dairy_testing',
    response:
      'Our Dairy Testing suite includes:\n• Adulteration screening (detergent, starch, urea, neutralizers, maltodextrin, ammonium sulfate)\n• Fat & SNF percentage\n• Antibiotic residues & Aflatoxin M1\n• Pathogen checks (Salmonella, Listeria, E. coli, Coliforms)\n• Shelf-life validation.',
    actionSuggestions: [
      { label: '📋 View Dairy Packages', action: 'navigate_packages', payload: 'dairy' },
      { label: '⏱️ Turnaround Time', action: 'ask_faq', payload: 'turnaround_time' },
      { label: '📦 How to submit sample?', action: 'ask_faq', payload: 'sample_submission' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'oil_testing',
    category: 'Categories',
    keywords: ['oil', 'oils', 'edible oil', 'mustard', 'ghee', 'sunflower', 'olive', 'palm oil', 'fatty acid', 'ffa', 'peroxide', 'argemone', 'rancidity'],
    intent: 'oil_testing',
    response:
      'Our Edible Oils & Fats Testing parameters cover:\n• Free Fatty Acids (FFA) & Acid Value\n• Peroxide Value & Rancidity testing\n• Argemone oil, Mineral oil & Castor oil adulteration\n• Fatty Acid Profile (SFA, MUFA, PUFA, Trans Fat)\n• Heavy metals (Lead, Cadmium, Arsenic).',
    actionSuggestions: [
      { label: '🏷️ Browse Oil Packages', action: 'navigate_packages', payload: 'oils' },
      { label: '📦 Sample Quantity Required', action: 'ask_faq', payload: 'sample_quantity' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'spices_testing',
    category: 'Categories',
    keywords: ['spice', 'spices', 'turmeric', 'chilli', 'coriander', 'pepper', 'curcumin', 'lead chromate', 'ethlyene oxide', 'eto', 'sudan'],
    intent: 'spices_testing',
    response:
      'For Spices & Condiments, we test for:\n• Moisture, Total Ash & Volatile Oil\n• Curcumin percentage in turmeric\n• Pesticide residues (500+ compounds screen)\n• Ethylene Oxide (EtO) & 2-Chloroethanol\n• Sudan dyes I-IV & Lead Chromate adulteration\n• Aflatoxins (B1, B2, G1, G2) & Ochratoxin A.',
    actionSuggestions: [
      { label: '📋 View Spice Packages', action: 'navigate_packages', payload: 'spices' },
      { label: '📦 Sample Packaging Guide', action: 'ask_faq', payload: 'sample_submission' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'honey_testing',
    category: 'Categories',
    keywords: ['honey', 'syrup', 'c3', 'c4', 'smr', 'tmr', 'nmr', 'sugar', 'adulteration', 'pollen', 'hmf'],
    intent: 'honey_testing',
    response:
      'Our Honey Quality & Purity Analysis includes:\n• C3 & C4 Sugar Adulteration (Isotope Ratio MS)\n• Specific Marker for Rice Syrup (SMR) & Trace Marker (TMR)\n• HMF (Hydroxymethylfurfural) & Diastase activity\n• Moisture, Fructose, Glucose & Sucrose ratio\n• Antibiotics & Heavy metals.',
    actionSuggestions: [
      { label: '🍯 Browse Honey Packages', action: 'navigate_packages', payload: 'honey' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'water_testing',
    category: 'Categories',
    keywords: ['water', 'drinking water', 'borewell', 'effluent', 'ro water', 'is 10500', 'is 14543', 'water testing'],
    intent: 'water_testing',
    response:
      'We test Water as per official national standards:\n• Drinking Water (IS 10500:2012)\n• Packaged Drinking Water (IS 14543)\n• Process & Borewell Water\nTesting covers pH, TDS, Hardness, Nitrates, Fluoride, Heavy Metals (Lead, Arsenic, Mercury), and microbiological counts (E. coli, Coliforms).',
    actionSuggestions: [
      { label: '💧 Water Test Packages', action: 'navigate_packages', payload: 'water' },
      { label: '📦 Sample Quantity Required', action: 'ask_faq', payload: 'sample_quantity' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'fssai_compliance',
    category: 'Compliance',
    keywords: ['fssai', 'compliance', 'regulation', 'nutritional facts', 'label', 'licence', 'license', 'mandatory', 'regulatory'],
    intent: 'fssai_compliance',
    response:
      'Litmus provides verified NABL & FSSAI compliant test reports with QR authenticity, suitable for regulatory inspections, import/export clearance, and statutory half-yearly compliance. We also calculate 100g Nutritional Fact Panels for food packaging.',
    actionSuggestions: [
      { label: '🏷️ Nutritional Label Testing', action: 'ask_faq', payload: 'nutrition_label' },
      { label: '📋 Book a Test Online', action: 'navigate', payload: '/tests' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'turnaround_time',
    category: 'Process',
    keywords: ['turnaround', 'tat', 'how long', 'duration', 'time required', 'fast report', 'urgent', 'delivery time', 'days'],
    intent: 'turnaround_time',
    response:
      'Standard Turnaround Time is **3 to 5 business days** from sample receipt at the lab. For emergency clearance and raw material audits, **Express Testing (24-48 hours)** is available upon prior request.',
    actionSuggestions: [
      { label: '⚡ Request Express Testing', action: 'request_live_support' },
      { label: '📦 Sample Pickup Process', action: 'ask_faq', payload: 'sample_submission' },
    ],
  },
  {
    id: 'sample_submission',
    category: 'Process',
    keywords: ['sample submission', 'how to send', 'courier', 'pickup', 'collect', 'address', 'shipping', 'packaging', 'dispatch'],
    intent: 'sample_submission',
    response:
      'You can submit samples in 2 simple ways:\n1. 🚚 **Doorstep Sample Pickup**: Available across major industrial and city hubs through our courier network.\n2. 📦 **Direct Courier Dispatch**: Dispatch labeled samples to our partner accredited hub. Once you book online, an automated Sample Submission Slip with packing instructions is generated.',
    actionSuggestions: [
      { label: '📦 Sample Quantity Needed', action: 'ask_faq', payload: 'sample_quantity' },
      { label: '📋 Browse All Tests', action: 'navigate', payload: '/tests' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'sample_quantity',
    category: 'Process',
    keywords: ['sample quantity', 'how much sample', 'grams required', 'litres', 'volume', 'size', 'quantity'],
    intent: 'sample_quantity',
    response:
      'Recommended minimum sample quantities:\n• Solid/Powder Food: 250g – 500g in sealed airtight pouch\n• Oils / Honey / Liquids: 250ml – 500ml in leakproof bottle\n• Water (Chemical + Micro): 2 Litres in sterile PET bottle\n• Spices & Seasonings: 200g – 300g\n• Microbiological testing alone: Min 100g in sterile condition.',
    actionSuggestions: [
      { label: '📦 Packaging Guidelines', action: 'ask_faq', payload: 'sample_submission' },
      { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
    ],
  },
  {
    id: 'pricing_payment',
    category: 'Commercial',
    keywords: ['price', 'pricing', 'cost', 'fee', 'charge', 'rate', 'payment', 'discount', 'bulk', 'invoice', 'gst'],
    intent: 'pricing_payment',
    response:
      'All test prices are transparently displayed with parameter breakdowns. We support UPI, Credit/Debit Cards, Net Banking, and GST Invoicing. Custom enterprise rates and volume discounts are available for recurring monthly food manufacturers.',
    actionSuggestions: [
      { label: '🏷️ Browse Test Packages', action: 'navigate', payload: '/packages' },
      { label: '💼 Enterprise Consultation', action: 'request_live_support' },
    ],
  },
  {
    id: 'report_tracking',
    category: 'Account',
    keywords: ['report status', 'track report', 'download report', 'where is my report', 'test status', 'pdf', 'certificate'],
    intent: 'report_tracking',
    response:
      'You can track live analysis progress and download signed, QR-code verified NABL PDF reports anytime from the "My Bookings" section. Instant notifications are sent via Email and WhatsApp once testing is completed.',
    actionSuggestions: [
      { label: '📄 Go to My Bookings', action: 'navigate', payload: '/dashboard/bookings' },
      { label: '👨‍🔬 Help with Booking ID', action: 'request_live_support' },
    ],
  },
];

export class BotKnowledgeService {
  /**
   * Process a natural language query and return matching bot response in a fixed structured format
   */
  public static matchQuery(query: string): {
    answer: string;
    intent: string;
    actionSuggestions: Array<{ label: string; action: string; payload?: any }>;
    matched: boolean;
  } {
    const cleanQuery = (query || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .trim();

    if (!cleanQuery) {
      return {
        answer:
          'Hello! Welcome to Litmus Diagnostic & Food Testing Assistance. How can I assist you with your laboratory testing needs today?',
        intent: 'welcome',
        actionSuggestions: [
          { label: '🔬 Explore Food Tests', action: 'ask_faq', payload: 'food_testing_overview' },
          { label: '🥛 Dairy & Milk Quality', action: 'ask_category', payload: 'dairy' },
          { label: '📦 How to Send Samples', action: 'ask_faq', payload: 'sample_submission' },
          { label: '⏱️ Turnaround Times', action: 'ask_faq', payload: 'turnaround_time' },
          { label: '👨‍🔬 Talk to Live Specialist', action: 'request_live_support' },
        ],
        matched: true,
      };
    }

    const queryWords = cleanQuery.split(/\s+/).filter(Boolean);

    // 1. Direct intent/id/action suggestion match
    for (const item of LITMUS_KNOWLEDGE_BASE) {
      if (item.intent === cleanQuery || item.id === cleanQuery) {
        return {
          answer: item.response,
          intent: item.intent,
          actionSuggestions: item.actionSuggestions || [],
          matched: true,
        };
      }

      // Check if user clicked or sent an action suggestion payload/label
      const hasMatchingSuggestion = item.actionSuggestions?.some((s) => {
        const cleanLabel = (s.label || '').toLowerCase().replace(/[^\w\s]/g, ' ').trim();
        return s.payload === cleanQuery || cleanLabel === cleanQuery || (cleanLabel.length > 5 && cleanQuery.includes(cleanLabel));
      });

      if (hasMatchingSuggestion) {
        return {
          answer: item.response,
          intent: item.intent,
          actionSuggestions: item.actionSuggestions || [],
          matched: true,
        };
      }
    }

    // 2. Keyword score matching
    let bestMatch: BotKnowledgeItem | null = null;
    let highestScore = 0;

    for (const item of LITMUS_KNOWLEDGE_BASE) {
      let score = 0;
      for (const kw of item.keywords) {
        const cleanKw = kw.toLowerCase().trim();
        // Exact full phrase match
        if (cleanQuery === cleanKw) {
          score += 15;
        } else if (cleanQuery.includes(cleanKw)) {
          score += cleanKw.length >= 4 ? 8 : 4;
        } else {
          // Check word overlap
          for (const word of queryWords) {
            if (cleanKw === word || (cleanKw.length > 3 && word.startsWith(cleanKw))) {
              score += 3;
            }
          }
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

    // 3. Fallback response with guided options
    return {
      answer:
        'I can assist you with our NABL-accredited food testing packages, sample submission guidelines, turnaround times, and FSSAI compliance requirements. Please select a topic below or connect with our support team.',
      intent: 'fallback',
      actionSuggestions: [
        { label: '🔬 Food Testing Services', action: 'ask_faq', payload: 'food_testing_overview' },
        { label: '🥛 Dairy & Milk Tests', action: 'ask_category', payload: 'dairy' },
        { label: '📦 How to Send Samples', action: 'ask_faq', payload: 'sample_submission' },
        { label: '⏱️ Turnaround Times', action: 'ask_faq', payload: 'turnaround_time' },
        { label: '👨‍🔬 Connect to Live Specialist', action: 'request_live_support' },
      ],
      matched: false,
    };
  }
}
