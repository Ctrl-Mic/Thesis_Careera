// tourismAssessment.js


const questions = [
  {
    category: "Customer Service",
    question:
      "How effectively can you understand visitor needs and deliver a positive tourism experience?",
    anchors: [
      {
        level: 1,
        text: "Provide basic information to visitors with guidance.",
      },
      {
        level: 2,
        text: "Answer routine visitor questions and respond to common requests independently.",
      },
      {
        level: 3,
        text: "Manage different visitor needs, resolve complaints, and maintain service quality.",
      },
      {
        level: 4,
        text: "Develop customer service procedures and coach staff in handling complex guest concerns.",
      },
      {
        level: 5,
        text: "Design organization-wide guest experience strategies and establish service excellence standards.",
      },
    ],
  },

  {
    category: "Communication",
    question:
      "How effectively can you communicate information to tourists, colleagues, and tourism stakeholders?",
    anchors: [
      {
        level: 1,
        text: "Share simple information with visitors using prepared instructions.",
      },
      {
        level: 2,
        text: "Explain directions, schedules, and tourism services clearly in familiar situations.",
      },
      {
        level: 3,
        text: "Adapt communication to different audiences and manage visitor questions independently.",
      },
      {
        level: 4,
        text: "Lead complex stakeholder discussions and coach others in professional communication.",
      },
      {
        level: 5,
        text: "Develop communication strategies for tourism organizations and represent them in high-level engagements.",
      },
    ],
  },

  {
    category: "Planning and Organization",
    question:
      "How effectively can you organize tourism activities, schedules, bookings, and resources?",
    anchors: [
      {
        level: 1,
        text: "Follow an itinerary or checklist prepared by someone else.",
      },
      {
        level: 2,
        text: "Organize routine bookings, schedules, and travel arrangements.",
      },
      {
        level: 3,
        text: "Coordinate multi-stop itineraries, suppliers, and changing schedules independently.",
      },
      {
        level: 4,
        text: "Design operational plans, allocate resources, and coordinate complex tourism projects.",
      },
      {
        level: 5,
        text: "Establish strategic planning systems for large-scale tourism operations.",
      },
    ],
  },

  {
    category: "Problem Solving",
    question:
      "How effectively can you analyze and resolve unexpected problems during tourism activities?",
    anchors: [
      {
        level: 1,
        text: "Recognize a problem and ask a supervisor for assistance.",
      },
      {
        level: 2,
        text: "Resolve common booking, scheduling, or visitor service problems using established procedures.",
      },
      {
        level: 3,
        text: "Analyze unfamiliar problems, compare solutions, and implement an appropriate response independently.",
      },
      {
        level: 4,
        text: "Lead teams in resolving complex operational problems and develop preventive procedures.",
      },
      {
        level: 5,
        text: "Design organization-wide problem-solving frameworks for complex and uncertain tourism situations.",
      },
    ],
  },

  {
    category: "Adaptability and Resilience",
    question:
      "How effectively can you respond to changing conditions, unexpected disruptions, and demanding situations?",
    anchors: [
      {
        level: 1,
        text: "Continue tasks with guidance when plans change.",
      },
      {
        level: 2,
        text: "Adjust to routine changes in schedules, assignments, or visitor requests.",
      },
      {
        level: 3,
        text: "Manage disruptions independently while maintaining service quality and professional composure.",
      },
      {
        level: 4,
        text: "Guide a team through major operational changes and prepare alternative plans.",
      },
      {
        level: 5,
        text: "Develop organizational strategies for resilience and adaptation to major tourism industry changes.",
      },
    ],
  },

  {
    category: "Cultural Awareness",
    question:
      "How effectively can you work with tourists and colleagues from different cultural backgrounds?",
    anchors: [
      {
        level: 1,
        text: "Recognize that visitors may have different cultural practices and expectations.",
      },
      {
        level: 2,
        text: "Show respect for cultural differences when providing routine tourism services.",
      },
      {
        level: 3,
        text: "Adapt service and communication approaches to diverse cultural expectations.",
      },
      {
        level: 4,
        text: "Develop culturally inclusive visitor experiences and guide teams in cross-cultural situations.",
      },
      {
        level: 5,
        text: "Establish cross-cultural tourism strategies and organizational standards for inclusive service.",
      },
    ],
  },

  {
    category: "Teamwork",
    question:
      "How effectively can you collaborate with colleagues, suppliers, and tourism partners?",
    anchors: [
      {
        level: 1,
        text: "Complete assigned tasks and share basic information with teammates.",
      },
      {
        level: 2,
        text: "Coordinate routine tasks and support colleagues in meeting shared objectives.",
      },
      {
        level: 3,
        text: "Coordinate work across different teams and resolve routine collaboration problems independently.",
      },
      {
        level: 4,
        text: "Lead cross-functional teams and resolve complex disagreements between stakeholders.",
      },
      {
        level: 5,
        text: "Design collaborative operating models and build strategic partnerships across the tourism sector.",
      },
    ],
  },

  {
    category: "Leadership",
    question:
      "How effectively can you guide people, coordinate responsibilities, and support team performance?",
    anchors: [
      {
        level: 1,
        text: "Take responsibility for assigned tasks and offer help when requested.",
      },
      {
        level: 2,
        text: "Coordinate a small group during familiar activities with clear objectives.",
      },
      {
        level: 3,
        text: "Lead a team through routine operations, delegate tasks, and address performance issues.",
      },
      {
        level: 4,
        text: "Manage complex tourism operations, develop staff, and improve team performance.",
      },
      {
        level: 5,
        text: "Set organizational direction, develop future leaders, and establish leadership practices across an organization.",
      },
    ],
  },

  {
    category: "Digital Tools",
    question:
      "How effectively can you use digital tools to support tourism operations and visitor services?",
    anchors: [
      {
        level: 1,
        text: "Use basic digital tools with guidance to retrieve tourism information.",
      },
      {
        level: 2,
        text: "Use booking systems, email, spreadsheets, or customer service platforms for routine tasks.",
      },
      {
        level: 3,
        text: "Use multiple tourism platforms independently and improve everyday operational workflows.",
      },
      {
        level: 4,
        text: "Evaluate digital systems, coordinate technology implementation, and train colleagues.",
      },
      {
        level: 5,
        text: "Design digital transformation strategies for tourism services and integrated operating systems.",
      },
    ],
  },

  {
    category: "Sales and Marketing",
    question:
      "How effectively can you promote destinations, tourism products, travel packages, or visitor experiences?",
    anchors: [
      {
        level: 1,
        text: "Share basic information about a destination or tourism product.",
      },
      {
        level: 2,
        text: "Explain package features and assist customers with routine purchasing decisions.",
      },
      {
        level: 3,
        text: "Develop promotional content, identify target audiences, and support tourism sales campaigns.",
      },
      {
        level: 4,
        text: "Lead marketing campaigns, analyze results, and coordinate promotional strategies.",
      },
      {
        level: 5,
        text: "Develop long-term destination or tourism brand strategies and oversee their organizational impact.",
      },
    ],
  },

  {
    category: "Risk Management and Safety",
    question:
      "How effectively can you identify tourism-related risks and prepare appropriate responses?",
    anchors: [
      {
        level: 1,
        text: "Follow safety instructions and report hazards to a supervisor.",
      },
      {
        level: 2,
        text: "Identify common hazards and follow established emergency procedures.",
      },
      {
        level: 3,
        text: "Assess operational risks, prepare contingency plans, and respond appropriately within your responsibilities.",
      },
      {
        level: 4,
        text: "Develop risk management procedures and coordinate safety planning across tourism activities.",
      },
      {
        level: 5,
        text: "Establish organization-wide risk governance and lead strategic preparedness for major disruptions.",
      },
    ],
  },

  {
    category: "Sustainability",
    question:
      "How effectively can you support responsible tourism practices that benefit destinations, communities, and the environment?",
    anchors: [
      {
        level: 1,
        text: "Follow basic environmental and community-respect guidelines during tourism activities.",
      },
      {
        level: 2,
        text: "Apply responsible tourism practices in routine visitor services and activities.",
      },
      {
        level: 3,
        text: "Evaluate tourism activities for sustainability concerns and recommend practical improvements.",
      },
      {
        level: 4,
        text: "Coordinate sustainable tourism initiatives with local communities and tourism stakeholders.",
      },
      {
        level: 5,
        text: "Develop destination-wide sustainability strategies and evaluate their long-term effects.",
      },
    ],
  },
];

export default questions;