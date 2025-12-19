// Rule-based calming message engine
// No AI, no external APIs - pure deterministic rules

const MESSAGES_BY_EMOTION = {
  angry: [
    "Pause here. Anger fades faster than words. Read fully before responding.",
    "Anger often masks deeper feelings. Consider what might be beneath this.",
    "Take three deep breaths. Let the initial reaction pass before continuing.",
    "This was shared in a moment of intensity. Receive it with space.",
    "Notice any tension in your body. Relax your shoulders and continue."
  ],
  
  sad: [
    "This was shared with vulnerability. Let it settle before reacting.",
    "Sadness moves through us when given space. Allow it to be present.",
    "You're reading something precious - someone's honest emotion.",
    "Let this sit with you gently. No response needed right now.",
    "Sadness shared is sadness halved. Honor this sharing with patience."
  ],
  
  disappointed: [
    "Disappointment reflects expectations, not intent. Consider both.",
    "This expresses hope for something different. That hope matters.",
    "Disappointment is a bridge - it connects what is to what could be.",
    "Breathe through any defensiveness. This is about feelings, not faults.",
    "This moment asks for understanding, not solutions. Just listen."
  ],
  
  grateful: [
    "Receive this gratitude without questioning it. Let it nourish you.",
    "Gratitude is a gift. Accept it fully before moving on.",
    "This appreciation is a reflection of your impact. Let that sink in.",
    "Sometimes the kindest response is silent acceptance of thanks.",
    "Allow this moment to soften the rest of your reading."
  ],
  
  happy: [
    "Joy shared is joy multiplied. Let yourself feel this happiness.",
    "This positive moment deserves your full attention. Savor it.",
    "Allow this happiness to color the rest of your reading experience.",
    "Shared happiness is a bond. Receive it as the gift it is.",
    "Let this good feeling settle in. It belongs here."
  ]
};

// Default neutral message if emotion not found
const DEFAULT_MESSAGES = [
  "Read with an open heart. React with a calm mind.",
  "This was shared for you. Receive it thoughtfully.",
  "Pause between chits. Let each one have its space.",
  "No immediate response needed. Just receive.",
  "Breathe. Read. Process. Respond later."
];

// Get a calming message for an emotion
export const getCalmingMessage = (emotion) => {
  const normalizedEmotion = emotion?.toLowerCase().trim();
  
  if (!normalizedEmotion || !MESSAGES_BY_EMOTION[normalizedEmotion]) {
    // Return random default message for unknown emotions
    const randomIndex = Math.floor(Math.random() * DEFAULT_MESSAGES.length);
    return DEFAULT_MESSAGES[randomIndex];
  }
  
  const messages = MESSAGES_BY_EMOTION[normalizedEmotion];
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
};

// Get completion message after reading all chits
export const getCompletionMessage = () => {
  const COMPLETION_MESSAGES = [
    "You have read everything with patience. Ups and downs are part of life. You are capable of responding with calm.",
    "All chits read. Take this moment of stillness before any response. Your thoughtfulness honors the sharing.",
    "Reading complete. Let what you've read settle. Your partner's feelings are now part of your understanding.",
    "You've received all messages. Sit with them. The space between reading and responding is where wisdom grows.",
    "Finished reading. Each emotion shared is a bridge. You've crossed them all with care.",
    "All chits received. This moment of completion is itself a gift. Carry it gently.",
    "You have completed the reading. The discipline of patience you've shown is itself a loving response.",
    "All messages read. Remember: feelings shared are not problems to solve, but realities to understand.",
    "Reading done. Allow your first reaction to pass. Your second thought will be wiser.",
    "You've received everything. The chest is empty but your understanding is full."
  ];
  
  const randomIndex = Math.floor(Math.random() * COMPLETION_MESSAGES.length);
  return COMPLETION_MESSAGES[randomIndex];
};

// Check if emotion is valid
export const isValidEmotion = (emotion) => {
  const normalized = emotion?.toLowerCase().trim();
  return Object.keys(MESSAGES_BY_EMOTION).includes(normalized);
};

// Get all valid emotions
export const getAllEmotions = () => {
  return Object.keys(MESSAGES_BY_EMOTION);
};