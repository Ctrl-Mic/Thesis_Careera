const questions = [
  {
    category: "Customer and Personal Service",
    question: "How well do you know how to handle customer needs and resolve service problems?",
    anchors: [
      { level: 1, text: "Process a dry-cleaning order" },
      { level: 3, text: "Supervise 10 children at a day care" },
      { level: 5, text: "Plan customer outreach after data privacy breach" },
    ],
  },
  {
    category: "Speaking",
    question: "How well do you convey information when you speak?",
    anchors: [
      { level: 1, text: "Greet customers" },
      { level: 3, text: "Interview applicants to obtain personal and work history" },
      { level: 5, text: "Argue a legal case before the Supreme Court" },
    ],
  },
  {
    category: "Writing",
    question: "How well does your writing effectively communicate to an audience's particular need?",
    anchors: [
      { level: 1, text: "Take a telephone message" },
      { level: 3, text: "Write a memo to staff outlining new directives" },
      { level: 5, text: "Write a technical manual" },
    ],
  },
  {
    category: "Foreign Language",
    question: "How well do you know a foreign language?",
    anchors: [
      { level: 1, text: 'Say "please" and "thank you"' },
      { level: 3, text: "Ask directions in a foreign city" },
      { level: 5, text: "Critique a literary book" },
    ],
  },
  {
    category: "Helping People",
    question: "How good are you at understanding how to help people?",
    anchors: [
      { level: 1, text: "Ask clients if they would like coffee" },
      { level: 3, text: "Make travel arrangements for customers" },
      { level: 5, text: "Direct relief operations in a disaster area" },
    ],
  },
  {
    category: "Sales and Marketing",
    question: "How well can you perform marketing strategies and tactics?",
    anchors: [
      { level: 1, text: "Sell cakes at a bake sale" },
      { level: 3, text: "Call a list of clients to introduce them to a new product line" },
      { level: 5, text: "Develop a marketing plan for a large firm" },
    ],
  },
  {
    category: "Time Management",
    question: "How well do you manage your and others' time?",
    anchors: [
      { level: 1, text: "Keep a monthly appointment calendar" },
      { level: 3, text: "Allocate staff time to projects for the coming week" },
      { level: 5, text: "Allocate scientists' time to multiple, multi-stage projects" },
    ],
  },
  {
    category: "Complex Problem Solving",
    question: "How good are you at figuring out the best way to solve a problem?",
    anchors: [
      { level: 1, text: "Gather tools for a household job" },
      { level: 3, text: "Redesign a floor plan around new equipment" },
      { level: 5, text: "Develop a local disaster response plan" },
    ],
  },
  {
    category: "Monitoring",
    question: "How well can you assess your or others' work?",
    anchors: [
      { level: 1, text: "Proofread a letter" },
      { level: 3, text: "Make adjustments to a meeting to ensure key goals are met" },
      { level: 5, text: "Measure and plan to increase a firm's productivity" },
    ],
  },
  {
    category: "Clerical",
    question: "How much do you know about administrative tasks and processes?",
    anchors: [
      { level: 1, text: "File forms" },
      { level: 3, text: "Type 30 words per minute" },
      { level: 5, text: "Design an online office-wide storage system" },
    ],
  },
  {
    category: "Computers and Electronics",
    question: "How effective are you at using electronic equipment?",
    anchors: [
      { level: 1, text: "Open a program on a computer" },
      { level: 3, text: "Use a word processor" },
      { level: 5, text: "Create a virus-scanning program" },
    ],
  },
  {
    category: "Management of Financial Resources",
    question: "What level of financial decision-maker are you?",
    anchors: [
      { level: 1, text: "Record office supply purchases" },
      { level: 3, text: "Prepare and manage a budget for a short-term project" },
      { level: 5, text: "Oversee yearly budgets for a large firm" },
    ],
  },
  {
    category: "Economics and Accounting",
    question: "How well do you know banking and financial systems?",
    anchors: [
      { level: 1, text: "Answer billing questions" },
      { level: 3, text: "Develop an investment plan for clients" },
      { level: 5, text: "Oversee a large firm's finances" },
    ],
  },
  {
    category: "Sociology and Anthropology",
    question: "How well do you know the theories of group behavior, societal trends and influences, and human culture?",
    anchors: [
      { level: 1, text: "Identify two different cultures" },
      { level: 3, text: "Write an article about cultural differences" },
      { level: 5, text: "Create a new theory of civilization's development" },
    ],
  },
  {
    category: "Public Safety and Security",
    question: "How well do you know the equipment, policies, procedures, and strategies used to promote security operations?",
    anchors: [
      { level: 1, text: "Follow work safety guidelines" },
      { level: 3, text: "Inspect a building site for safety violations" },
      { level: 5, text: "Command a military operation" },
    ],
  },
  {
    category: "Instructing",
    question: "How skilled are you at teaching people how to do something?",
    anchors: [
      { level: 1, text: "Show someone how to bowl" },
      { level: 3, text: "Instruct a coworker in how to operate a software program" },
      { level: 5, text: "Demonstrate surgery to interns" },
    ],
  },
  {
    category: "Operations Analysis",
    question: "How well can you analyze needs and requirements, then make a plan that meets them?",
    anchors: [
      { level: 1, text: "Select a copy machine for the office" },
      { level: 3, text: "Suggest software changes to make a system more user friendly" },
      { level: 5, text: "Identify system needs for a new process production plant" },
    ],
  },
  {
    category: "Negotiation",
    question: "How well can you persuade others to see different points of view or compromise?",
    anchors: [
      { level: 1, text: "Justify a new work schedule to your manager" },
      { level: 3, text: "Contract with a wholesaler to sell items at a given cost" },
      { level: 5, text: "Negotiate a foreign treaty as an ambassador" },
    ],
  },
];

export default questions;
