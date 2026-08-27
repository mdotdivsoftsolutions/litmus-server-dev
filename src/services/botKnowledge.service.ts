import defaultSupportQA from '../data/defaultSupportQA.json';

export interface BotKnowledgeItem {
  id: string;
  question?: string;
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

export const DEFAULT_FAQ_PROMPTS = [
  { label: '📋 How do I book a test?', action: 'ask_faq', payload: 'book_test' },
  { label: '🔬 What can I test?', action: 'ask_faq', payload: 'what_can_i_test' },
  { label: '⚖️ How much sample is required?', action: 'ask_faq', payload: 'sample_quantity' },
  { label: '📍 Track my sample', action: 'ask_faq', payload: 'track_sample' },
  { label: '⏱️ When will I get my report?', action: 'ask_faq', payload: 'report_timeline' },
  { label: '💬 Talk to Support', action: 'ask_faq', payload: 'talk_to_support' },
];

// Convert imported JSON dataset into primary knowledge items
const jsonKnowledgeItems: BotKnowledgeItem[] = defaultSupportQA.map((item: any) => ({
  id: item.id,
  question: item.question,
  category: 'Core FAQ',
  keywords: item.keywords || [],
  intent: item.intent || item.id,
  response: item.answer,
  actionSuggestions: item.actionSuggestions || DEFAULT_FAQ_PROMPTS,
}));

export const LITMUS_KNOWLEDGE_BASE: BotKnowledgeItem[] = [
  ...jsonKnowledgeItems,
  {
    id: 'greeting',
    category: 'General',
    keywords: [
      'hi', 'hello', 'helo', 'hey', 'namaste', 'good morning', 'good evening', 
      'good afternoon', 'start', 'help', 'hai', 'hlo', 'howdy', 'welcome', 'greetings'
    ],
    intent: 'greeting',
    response:
      'Hello! Welcome to Litmus Diagnostic & Food Testing Assistance. How can we assist you with your laboratory testing needs today?',
    actionSuggestions: DEFAULT_FAQ_PROMPTS,
  },
  {
    id: 'food_testing_overview',
    category: 'Testing Services',
    keywords: ['food test', 'food testing', 'what tests', 'testing capability', 'analysis', 'product test', 'parameters', 'categories', 'services'],
    intent: 'food_testing_capabilities',
    response:
      'Litmus provides comprehensive NABL-accredited (ISO/IEC 17025) & FSSAI-compliant laboratory testing across:\n• Dairy, Ghee & Milk Products\n• Edible Oils & Fats\n• Spices, Herbs & Seasonings\n• Honey & Sweeteners\n• Drinking & Process Water\n• Packaged Foods & Nutritional Labeling\n• Microbiological & Pathogen Screening\n• Pesticide & Heavy Metal Residues',
    actionSuggestions: [
      { label: '🥛 Dairy & Milk Tests', action: 'navigate', payload: '/categories/dairy' },
      { label: '🛢️ Edible Oils & Ghee', action: 'navigate', payload: '/categories/oils' },
      { label: '💧 Water Test Packages', action: 'navigate', payload: '/categories/water' },
      { label: '⚖️ How much sample is required?', action: 'ask_faq', payload: 'sample_quantity' },
      { label: '💬 Talk to Support', action: 'ask_faq', payload: 'talk_to_support' },
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
      { label: '📋 How do I book a test?', action: 'ask_faq', payload: 'book_test' },
      { label: '⚖️ How much sample is required?', action: 'ask_faq', payload: 'sample_quantity' },
      { label: '⏱️ When will I get my report?', action: 'ask_faq', payload: 'report_timeline' },
      { label: '💬 Talk to Support', action: 'ask_faq', payload: 'talk_to_support' },
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
      { label: '📋 How do I book a test?', action: 'ask_faq', payload: 'book_test' },
      { label: '⚖️ How much sample is required?', action: 'ask_faq', payload: 'sample_quantity' },
      { label: '💬 Talk to Support', action: 'ask_faq', payload: 'talk_to_support' },
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
      { label: '📋 How do I book a test?', action: 'ask_faq', payload: 'book_test' },
      { label: '⚖️ How much sample is required?', action: 'ask_faq', payload: 'sample_quantity' },
      { label: '💬 Talk to Support', action: 'ask_faq', payload: 'talk_to_support' },
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
    const rawClean = (query || '').toLowerCase().trim();
    const cleanQuery = rawClean
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanQuery) {
      return {
        answer:
          'Hello! Welcome to Litmus Diagnostic & Food Testing Assistance. How can we assist you with your laboratory testing needs today?',
        intent: 'welcome',
        actionSuggestions: DEFAULT_FAQ_PROMPTS,
        matched: true,
      };
    }

    // 1. Direct ID, Question, or Intent Match
    for (const item of LITMUS_KNOWLEDGE_BASE) {
      const cleanId = (item.id || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const cleanQuestion = (item.question || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const cleanIntent = (item.intent || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

      if (
        cleanQuery === cleanId ||
        cleanQuery === cleanIntent ||
        (cleanQuestion && (cleanQuery === cleanQuestion || cleanQuery.includes(cleanQuestion) || cleanQuestion.includes(cleanQuery)))
      ) {
        return {
          answer: item.response,
          intent: item.intent,
          actionSuggestions: item.actionSuggestions || DEFAULT_FAQ_PROMPTS,
          matched: true,
        };
      }
    }

    // 2. Exact keyword / phrase match
    for (const item of LITMUS_KNOWLEDGE_BASE) {
      for (const kw of item.keywords) {
        const cleanKw = kw.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanQuery === cleanKw || (cleanKw.length >= 6 && cleanQuery.includes(cleanKw))) {
          return {
            answer: item.response,
            intent: item.intent,
            actionSuggestions: item.actionSuggestions || DEFAULT_FAQ_PROMPTS,
            matched: true,
          };
        }
      }
    }

    // 3. Keyword score matching
    const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
    let bestMatch: BotKnowledgeItem | null = null;
    let highestScore = 0;

    for (const item of LITMUS_KNOWLEDGE_BASE) {
      let score = 0;
      for (const kw of item.keywords) {
        const cleanKw = kw.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanQuery.includes(cleanKw)) {
          score += cleanKw.length >= 4 ? 12 : 6;
        } else {
          for (const word of queryWords) {
            if (word.length > 2 && (cleanKw === word || cleanKw.includes(word))) {
              score += 3;
            }
          }
        }
      }

      // If item is 'greeting', only match if no other specific content is queried
      if (item.id === 'greeting' && score > 0) {
        const hasSpecificKeyword = queryWords.some((w) =>
          ['book', 'sample', 'test', 'report', 'track', 'support', 'quantity', 'cost', 'price', 'water', 'milk', 'dairy', 'oil'].includes(w)
        );
        if (hasSpecificKeyword) {
          score = 0;
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
        actionSuggestions: bestMatch.actionSuggestions || DEFAULT_FAQ_PROMPTS,
        matched: true,
      };
    }

    // 4. Fallback response with guided options
    return {
      answer:
        'I can assist you with our laboratory testing packages, sample submission guidelines, turnaround times, and reporting. Please select a topic below or connect with our support team.',
      intent: 'fallback',
      actionSuggestions: DEFAULT_FAQ_PROMPTS,
      matched: false,
    };
  }
}
