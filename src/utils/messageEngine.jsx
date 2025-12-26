// Enhanced Rule-based Calming Message Engine
// No AI, no external APIs - pure deterministic, thoughtful rules

const MESSAGES_BY_EMOTION = {
  angry: [
    "Pause here. Anger fades faster than words. Read fully before responding.",
    "Anger often masks deeper feelings. Consider what might be beneath this.",
    "Take three deep breaths. Let the initial reaction pass before continuing.",
    "This was shared in a moment of intensity. Receive it with space.",
    "Notice any tension in your body. Relax your shoulders and continue.",
    "Anger is energy in motion. Channel it into understanding, not reacting.",
    "This emotion is a signal, not a sentence. Listen to what it's telling you.",
    "The heat of anger cools with patience. Give it that time now.",
    "Behind anger lies hurt. Read this with compassionate curiosity.",
    "This moment asks for a pause. Let your heartbeat steady before continuing."
  ],
  
  sad: [
    "This was shared with vulnerability. Let it settle before reacting.",
    "Sadness moves through us when given space. Allow it to be present.",
    "You're reading something precious - someone's honest emotion.",
    "Let this sit with you gently. No response needed right now.",
    "Sadness shared is sadness halved. Honor this sharing with patience.",
    "Tears are words the heart can't speak. Read between the lines gently.",
    "This sadness is a visitor, not a resident. Let it pass through you.",
    "The weight of this feeling is real. Sit with it without trying to fix.",
    "Shared sorrow creates connection. You're building a bridge right now.",
    "Some feelings just need to be witnessed. You're doing that now."
  ],
  
  disappointed: [
    "Disappointment reflects expectations, not intent. Consider both.",
    "This expresses hope for something different. That hope matters.",
    "Disappointment is a bridge - it connects what is to what could be.",
    "Breathe through any defensiveness. This is about feelings, not faults.",
    "This moment asks for understanding, not solutions. Just listen.",
    "Disappointment shows care. Someone cared enough to want more.",
    "This feeling points toward possibility. What was hoped for matters.",
    "Let this disappointment teach you about what truly matters to you both.",
    "Not getting what we want makes room for what we need. Stay open.",
    "This is about unmet expectations, not about you as a person."
  ],
  
  grateful: [
    "Receive this gratitude without questioning it. Let it nourish you.",
    "Gratitude is a gift. Accept it fully before moving on.",
    "This appreciation is a reflection of your impact. Let that sink in.",
    "Sometimes the kindest response is silent acceptance of thanks.",
    "Allow this moment to soften the rest of your reading.",
    "Gratitude grows when shared. You're cultivating it right now.",
    "This thankfulness is a mirror showing your positive impact.",
    "Let this appreciation land in your heart before moving forward.",
    "Shared gratitude strengthens bonds. This is a building block.",
    "Moments of thanks are anchors in relationships. Treasure this one."
  ],
  
  happy: [
    "Joy shared is joy multiplied. Let yourself feel this happiness.",
    "This positive moment deserves your full attention. Savor it.",
    "Allow this happiness to color the rest of your reading experience.",
    "Shared happiness is a bond. Receive it as the gift it is.",
    "Let this good feeling settle in. It belongs here.",
    "Happiness expands when witnessed. You're helping it grow.",
    "This joy is contagious. Let it spread through you.",
    "Celebrate this moment fully. Good feelings deserve to be noticed.",
    "Shared delight creates memories. This is one being made now.",
    "This happiness is a testament to what's working. Appreciate it deeply."
  ],
  
  anxious: [
    "Anxiety is about what might be. This moment is about what is.",
    "Breathe into your belly. Let tension release with each exhale.",
    "This worry was shared to lighten its load. Help carry it gently.",
    "Anxiety often magnifies. Return to the actual words on the screen.",
    "Ground yourself here. This moment, this breath, is real.",
    "Worry shared is worry halved. You're helping by receiving it.",
    "This anxiety is a cloud passing through, not the sky itself.",
    "Place a hand on your heart. Feel its steady rhythm.",
    "One thought at a time. One breath at a time.",
    "This feeling will change. All feelings do. Just breathe with it."
  ],
  
  confused: [
    "Clarity comes with patience. Don't rush to understand.",
    "It's okay not to know. Curiosity is better than certainty here.",
    "Some things need time to make sense. Give this that time.",
    "Confusion often precedes understanding. You're in the in-between.",
    "Rather than solving, try just receiving. Understanding may follow.",
    "Not everything needs immediate clarity. Some answers unfold slowly.",
    "This confusion is asking you to listen more deeply.",
    "Let go of the need to figure it out. Just be with what is.",
    "In the space between confusion and clarity lies growth.",
    "Sometimes the most honest response is 'I don't understand yet.'"
  ]
};

// Enhanced default messages for unknown emotions or neutral states
const DEFAULT_MESSAGES = [
  "Read with an open heart. React with a calm mind.",
  "This was shared for you. Receive it thoughtfully.",
  "Pause between chits. Let each one have its space.",
  "No immediate response needed. Just receive.",
  "Breathe. Read. Process. Respond later.",
  "Each word was chosen for you. Honor that choice with attention.",
  "The space between receiving and responding is sacred.",
  "Let this message find its place within you before moving on.",
  "Presence is the greatest gift you can give this moment.",
  "Listen not just to the words, but to what lives between them."
];

// Enhanced completion messages
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
  "You've received everything. The chest is empty but your understanding is full.",
  "The reading journey is complete. Carry these feelings with tenderness as you decide how to respond.",
  "All chits read. Like finishing a letter from someone dear, sit with what you've received.",
  "Complete. The act of reading slowly, without rushing to reply, is an act of love.",
  "You've reached the end. The most thoughtful responses come from quiet reflection after reading.",
  "Reading finished. Each emotion shared is a thread in your shared tapestry."
];

// Add new category: Opening messages for when reading begins
const OPENING_MESSAGES = [
  "Beginning to read. Approach each chit with curiosity, not judgment.",
  "Opening the chest. Let your first breath be deep and steady.",
  "Starting the reading. Your full attention is the greatest gift you can give.",
  "The reading begins. Leave your assumptions aside and simply receive.",
  "First chit. Remember: you're reading feelings, not solving problems.",
  "Beginning now. Your calm presence makes space for understanding.",
  "Opening messages. Breathe in patience, breathe out preconceptions.",
  "The journey starts. Each chit is a piece of someone's heart.",
  "Starting to read. Let your mind be quiet, your heart be open.",
  "First message. The way you receive matters as much as what's sent."
];

// Cache for ensuring variety (prevents repeating messages too soon)
const messageCache = new Map();

// Enhanced getCalmingMessage with variety enforcement
export const getCalmingMessage = (emotion, context = {}) => {
  const normalizedEmotion = emotion?.toLowerCase().trim();
  let messages;
  
  if (!normalizedEmotion || !MESSAGES_BY_EMOTION[normalizedEmotion]) {
    messages = DEFAULT_MESSAGES;
  } else {
    messages = MESSAGES_BY_EMOTION[normalizedEmotion];
  }
  
  // Get cache for this emotion
  const cacheKey = normalizedEmotion || 'default';
  const usedIndices = messageCache.get(cacheKey) || [];
  
  // If we've used many messages, clear some history
  if (usedIndices.length > messages.length * 0.7) {
    usedIndices.splice(0, Math.floor(messages.length / 2));
  }
  
  // Find an unused message index
  let randomIndex;
  let attempts = 0;
  do {
    randomIndex = Math.floor(Math.random() * messages.length);
    attempts++;
    // If too many attempts, just use any message
    if (attempts > 20) break;
  } while (usedIndices.includes(randomIndex));
  
  // Store used index
  usedIndices.push(randomIndex);
  messageCache.set(cacheKey, usedIndices);
  
  return messages[randomIndex];
};

// Get completion message after reading all chits
export const getCompletionMessage = () => {
  const randomIndex = Math.floor(Math.random() * COMPLETION_MESSAGES.length);
  return COMPLETION_MESSAGES[randomIndex];
};

// Get opening message for when reading begins
export const getOpeningMessage = () => {
  const randomIndex = Math.floor(Math.random() * OPENING_MESSAGES.length);
  return OPENING_MESSAGES[randomIndex];
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

// Get message count for statistics
export const getMessageCounts = () => {
  const counts = {};
  Object.keys(MESSAGES_BY_EMOTION).forEach(emotion => {
    counts[emotion] = MESSAGES_BY_EMOTION[emotion].length;
  });
  counts['default'] = DEFAULT_MESSAGES.length;
  counts['completion'] = COMPLETION_MESSAGES.length;
  counts['opening'] = OPENING_MESSAGES.length;
  return counts;
};

// Reset cache (useful for testing or new sessions)
export const resetMessageCache = () => {
  messageCache.clear();
};

// Get a calming message based on intensity (optional enhancement)
export const getCalmingMessageWithIntensity = (emotion, intensity = 'medium') => {
  const baseMessage = getCalmingMessage(emotion);
  
  // Add intensity-specific prefixes
  const intensityPrefixes = {
    high: ["Deep breath. ", "Center yourself. ", "Stay grounded. "],
    medium: ["Notice this. ", "Be present. ", "Awareness helps. "],
    low: ["Gently. ", "Softly. ", "With care. "]
  };
  
  const prefix = intensityPrefixes[intensity]?.[Math.floor(Math.random() * intensityPrefixes[intensity].length)] || "";
  return prefix + baseMessage;
};