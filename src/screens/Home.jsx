import React, { useState, useEffect, useRef } from 'react';
import { useNavigate,useLocation  } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getActiveChest, checkChestUnlockable, createChest, canStartNewChest, getChestHistory } from '../services/chest';
import { getPartnerInfo } from '../services/pairing';
import { getUserSettings } from '../services/settings';
import { getChitsHistory } from '../services/chits';
import Header from '../components/shared/Header';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import './Home.css';


const isDev = true;

// Timeline visualization component
const TimelineVisualization = ({ chests, currentChest }) => {
  const timelineRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!chests || chests.length === 0) return null;

  return (
    <div className="timeline-container">
      <div className="timeline-line"></div>
      
      {chests.map((chest, index) => {
        const isActive = currentChest?.id === chest.id;
        const isCompleted = chest.status === 'completed' || chest.status === 'opened';
        const isFuture = new Date(chest.unlockDate) > new Date();
        const position = (index / (chests.length - 1 || 1)) * 100;

        return (
          <div
            key={chest.id}
            className={`timeline-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isFuture ? 'future' : ''}`}
            style={{ left: `${position}%` }}
            onClick={() => setActiveIndex(index)}
          >
            <div className="node-indicator">
              {isActive && <div className="node-pulse"></div>}
              <div className="node-core"></div>
            </div>
            
            <div className="node-date">
              {chest.startDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            
            <div className="node-status">
              {isActive ? 'Active' : isCompleted ? 'Read' : 'Locked'}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Emotional Weather Component
// Advanced Emotional Health Card with Multi-Dimensional Analysis
const EmotionalWeather = ({ chits }) => {
  // 1. Advanced Emotion Analysis with Weighted Time Decay
  const analyzeEmotionalHealth = (chitsData) => {
    if (!chitsData || chitsData.length === 0) {
      return {
        healthScore: 0,
        dominantEmotion: null,
        emotionalStability: 0,
        sentimentTrend: 'neutral',
        emotionFrequency: {},
        timeDistribution: {},
        emotionalDiversity: 0,
        positivityRatio: 0,
        emotionalIntensity: 0,
        recentEmotionalShift: null
      };
    }

    const now = new Date();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    
    // Weight emotions by recency (exponential decay)
    const weightedEmotions = chitsData.reduce((acc, chit) => {
      const chitDate = chit.createdAt ? new Date(chit.createdAt) : now;
      const daysOld = (now - chitDate) / ONE_DAY_MS;
      const recencyWeight = Math.exp(-daysOld / 7); // Half-life of 7 days
      
      const emotionWeight = {
        happy: 1.2,      // Positive emotions slightly amplified
        grateful: 1.3,   // Gratitude strongest positive
        disappointed: 0.8, // Negative but mild
        sad: 0.7,        // Strong negative
        angry: 0.6       // Most intense negative
      };
      
      const baseWeight = emotionWeight[chit.emotion] || 1;
      const totalWeight = baseWeight * recencyWeight;
      
      if (!acc[chit.emotion]) {
        acc[chit.emotion] = { count: 0, weightedSum: 0, recent: [] };
      }
      
      acc[chit.emotion].count++;
      acc[chit.emotion].weightedSum += totalWeight;
      
      // Track recency for trend analysis
      if (daysOld < 3) {
        acc[chit.emotion].recent.push({ weight: totalWeight, daysOld });
      }
      
      return acc;
    }, {});

    // 2. Calculate Health Metrics
    const emotionValues = {
      happy: 100,
      grateful: 110,     // Highest positive value
      disappointed: 30,
      sad: 20,
      angry: 10
    };

    // Calculate weighted health score (0-100)
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let emotionFrequency = {};
    
    Object.entries(weightedEmotions).forEach(([emotion, data]) => {
      const baseValue = emotionValues[emotion] || 50;
      const weightedValue = baseValue * (data.weightedSum / data.count);
      
      totalWeightedScore += weightedValue * data.weightedSum;
      totalWeight += data.weightedSum;
      emotionFrequency[emotion] = {
        count: data.count,
        percentage: (data.count / chitsData.length) * 100,
        weightedStrength: data.weightedSum / data.count
      };
    });
    
    const healthScore = totalWeight > 0 
      ? Math.min(100, Math.round(totalWeightedScore / totalWeight))
      : 0;

    // 3. Determine Dominant Emotion with Confidence
    let dominantEmotion = null;
    let confidence = 0;
    
    if (Object.keys(weightedEmotions).length > 0) {
      const sorted = Object.entries(weightedEmotions)
        .map(([emotion, data]) => ({
          emotion,
          strength: data.weightedSum,
          frequency: data.count
        }))
        .sort((a, b) => b.strength - a.strength);
      
      dominantEmotion = sorted[0];
      const totalStrength = sorted.reduce((sum, item) => sum + item.strength, 0);
      confidence = totalStrength > 0 
        ? Math.round((dominantEmotion.strength / totalStrength) * 100)
        : 0;
    }

    // 4. Calculate Emotional Stability (variance analysis)
    const emotionSequence = chitsData.map(chit => chit.emotion);
    let stabilityScore = 0;
    
    if (emotionSequence.length > 1) {
      let transitions = 0;
      let extremeTransitions = 0;
      const extremePairs = [['angry', 'grateful'], ['sad', 'happy']];
      
      for (let i = 1; i < emotionSequence.length; i++) {
        if (emotionSequence[i] !== emotionSequence[i-1]) {
          transitions++;
          
          // Check for extreme emotional swings
          if (extremePairs.some(pair => 
            (pair[0] === emotionSequence[i-1] && pair[1] === emotionSequence[i]) ||
            (pair[1] === emotionSequence[i-1] && pair[0] === emotionSequence[i])
          )) {
            extremeTransitions++;
          }
        }
      }
      
      const maxTransitions = emotionSequence.length - 1;
      const transitionRatio = transitions / maxTransitions;
      const extremeRatio = extremeTransitions / Math.max(1, transitions);
      
      // Stability is high when transitions are moderate and extreme swings are low
      stabilityScore = Math.round(100 * (1 - Math.abs(transitionRatio - 0.5) * 2) * (1 - extremeRatio));
    }

    // 5. Sentiment Trend Analysis
    const recentChits = chitsData
      .filter(chit => {
        const chitDate = chit.createdAt ? new Date(chit.createdAt) : new Date(0);
        return (now - chitDate) < 3 * ONE_DAY_MS;
      })
      .slice(-5); // Last 5 recent chits
    
    let sentimentTrend = 'stable';
    
    if (recentChits.length >= 2) {
      const sentimentValues = recentChits.map(chit => 
        ['happy', 'grateful'].includes(chit.emotion) ? 1 : 
        ['disappointed', 'sad', 'angry'].includes(chit.emotion) ? -1 : 0
      );
      
      // Simple linear regression for trend
      const n = sentimentValues.length;
      const xMean = (n - 1) / 2;
      const yMean = sentimentValues.reduce((a, b) => a + b, 0) / n;
      
      let numerator = 0;
      let denominator = 0;
      
      sentimentValues.forEach((y, x) => {
        numerator += (x - xMean) * (y - yMean);
        denominator += Math.pow(x - xMean, 2);
      });
      
      const slope = denominator !== 0 ? numerator / denominator : 0;
      
      if (slope > 0.1) sentimentTrend = 'improving';
      else if (slope < -0.1) sentimentTrend = 'declining';
    }

    // 6. Emotional Diversity Index (Shannon entropy)
    let emotionalDiversity = 0;
    const totalChits = chitsData.length;
    
    if (totalChits > 0) {
      Object.values(emotionFrequency).forEach(freq => {
        const p = freq.count / totalChits;
        if (p > 0) {
          emotionalDiversity -= p * Math.log2(p);
        }
      });
      
      // Normalize to 0-100 scale
      const maxDiversity = Math.log2(Object.keys(emotionFrequency).length || 1);
      emotionalDiversity = maxDiversity > 0 
        ? Math.round((emotionalDiversity / maxDiversity) * 100)
        : 0;
    }

    // 7. Positivity Ratio
    const positiveCount = chitsData.filter(chit => 
      ['happy', 'grateful'].includes(chit.emotion)
    ).length;
    
    const negativityCount = chitsData.filter(chit => 
      ['disappointed', 'sad', 'angry'].includes(chit.emotion)
    ).length;
    
    const positivityRatio = totalChits > 0 
      ? Math.round((positiveCount / totalChits) * 100)
      : 0;

    // 8. Emotional Intensity (variance from neutral)
    const intensityScores = chitsData.map(chit => {
      const intensities = {
        angry: 90,
        sad: 70,
        disappointed: 40,
        happy: 60,
        grateful: 80
      };
      return intensities[chit.emotion] || 50;
    });
    
    const meanIntensity = intensityScores.reduce((a, b) => a + b, 0) / intensityScores.length;
    const variance = intensityScores.reduce((sum, score) => 
      sum + Math.pow(score - meanIntensity, 2), 0) / intensityScores.length;
    
    const emotionalIntensity = Math.round(Math.min(100, Math.sqrt(variance) * 2));

    // 9. Recent Emotional Shift Detection
    let recentEmotionalShift = null;
    if (chitsData.length >= 4) {
      const recentHalf = chitsData.slice(-Math.floor(chitsData.length / 2));
      const olderHalf = chitsData.slice(0, Math.floor(chitsData.length / 2));
      
      const recentAvg = recentHalf.reduce((sum, chit) => {
        const value = emotionValues[chit.emotion] || 50;
        return sum + value;
      }, 0) / recentHalf.length;
      
      const olderAvg = olderHalf.reduce((sum, chit) => {
        const value = emotionValues[chit.emotion] || 50;
        return sum + value;
      }, 0) / olderHalf.length;
      
      const shift = recentAvg - olderAvg;
      if (Math.abs(shift) > 15) {
        recentEmotionalShift = shift > 0 ? 'positive' : 'negative';
      }
    }

    return {
      healthScore,
      dominantEmotion: dominantEmotion ? {
        name: dominantEmotion.emotion,
        confidence,
        strength: dominantEmotion.strength,
        frequency: dominantEmotion.frequency
      } : null,
      emotionalStability: stabilityScore,
      sentimentTrend,
      emotionFrequency,
      emotionalDiversity,
      positivityRatio,
      emotionalIntensity,
      recentEmotionalShift,
      metrics: {
        totalChits: chitsData.length,
        timeSpan: chitsData.length > 0 ? {
          start: new Date(Math.min(...chitsData.map(c => c.createdAt || now))),
          end: new Date(Math.max(...chitsData.map(c => c.createdAt || now)))
        } : null
      }
    };
  };

  // 10. Generate Health Insights from Analysis
  const generateHealthInsights = (analysis) => {
    const insights = [];
    
    if (analysis.healthScore >= 80) {
      insights.push({
        type: 'positive',
        message: 'Strong emotional well-being maintained',
        icon: '🌟'
      });
    } else if (analysis.healthScore <= 40) {
      insights.push({
        type: 'concern',
        message: 'Emotional health needs attention',
        icon: '💭'
      });
    }
    
    if (analysis.emotionalStability >= 80) {
      insights.push({
        type: 'positive',
        message: 'High emotional consistency',
        icon: '⚖️'
      });
    } else if (analysis.emotionalStability <= 40) {
      insights.push({
        type: 'concern',
        message: 'Frequent emotional fluctuations detected',
        icon: '🌊'
      });
    }
    
    if (analysis.positivityRatio >= 70) {
      insights.push({
        type: 'positive',
        message: 'Predominantly positive outlook',
        icon: '🌈'
      });
    } else if (analysis.positivityRatio <= 30) {
      insights.push({
        type: 'concern',
        message: 'Higher focus on challenging emotions',
        icon: '⛈️'
      });
    }
    
    if (analysis.recentEmotionalShift === 'positive') {
      insights.push({
        type: 'trend',
        message: 'Recent improvement in emotional state',
        icon: '📈'
      });
    } else if (analysis.recentEmotionalShift === 'negative') {
      insights.push({
        type: 'trend',
        message: 'Recent emotional decline detected',
        icon: '📉'
      });
    }
    
    if (analysis.emotionalDiversity >= 70) {
      insights.push({
        type: 'neutral',
        message: 'Diverse emotional expression',
        icon: '🎨'
      });
    } else if (analysis.emotionalDiversity <= 30) {
      insights.push({
        type: 'neutral',
        message: 'Focused emotional expression',
        icon: '🎯'
      });
    }
    
    // If no specific insights, provide general one
    if (insights.length === 0 && analysis.totalChits > 0) {
      insights.push({
        type: 'neutral',
        message: 'Emotional patterns developing',
        icon: '🌀'
      });
    }
    
    return insights;
  };

  // 11. Generate Visual Representation
  const generateHealthVisualization = (analysis) => {
    if (!analysis.dominantEmotion) {
      return {
        icon: '🌤️',
        color: '#4A90E2',
        gradient: 'linear-gradient(135deg, #89CFF0 0%, #B5E8FF 100%)',
        intensity: 0
      };
    }
    
    const visualMap = {
      happy: { icon: '☀️', color: '#FFD700', gradient: 'linear-gradient(135deg, #FFD700 0%, #FFEC8B 100%)' },
      grateful: { icon: '🌈', color: '#9B59B6', gradient: 'linear-gradient(135deg, #9B59B6 0%, #D2B4DE 100%)' },
      disappointed: { icon: '🌫️', color: '#95A5A6', gradient: 'linear-gradient(135deg, #95A5A6 0%, #BDC3C7 100%)' },
      sad: { icon: '🌧️', color: '#3498DB', gradient: 'linear-gradient(135deg, #3498DB 0%, #85C1E9 100%)' },
      angry: { icon: '⛈️', color: '#E74C3C', gradient: 'linear-gradient(135deg, #E74C3C 0%, #F1948A 100%)' }
    };
    
    const baseVisual = visualMap[analysis.dominantEmotion.name] || visualMap.happy;
    const intensity = analysis.emotionalIntensity / 100;
    
    return {
      ...baseVisual,
      intensity,
      pulseStrength: intensity > 0.7 ? 'strong' : intensity > 0.4 ? 'medium' : 'light'
    };
  };

  // 12. Main Component Logic
  const analysis = analyzeEmotionalHealth(chits);
  const insights = generateHealthInsights(analysis);
  const visualization = generateHealthVisualization(analysis);
  
  const getHealthLevel = (score) => {
    if (score >= 80) return { label: 'Excellent', color: '#2ECC71' };
    if (score >= 60) return { label: 'Good', color: '#3498DB' };
    if (score >= 40) return { label: 'Moderate', color: '#F39C12' };
    return { label: 'Needs Attention', color: '#E74C3C' };
  };

  const healthLevel = getHealthLevel(analysis.healthScore);

  return (
    <div className="emotional-health-card">
      {/* Health Score Gauge */}
      <div className="health-gauge">
        <div className="gauge-background">
          <div 
            className="gauge-fill"
            style={{
              width: `${analysis.healthScore}%`,
              background: healthLevel.color
            }}
          ></div>
        </div>
        <div className="gauge-info">
          <div className="health-score">
            <span className="score-value">{analysis.healthScore}</span>
            <span className="score-label">/100</span>
          </div>
          <div className="health-level" style={{ color: healthLevel.color }}>
            {healthLevel.label}
          </div>
        </div>
      </div>
      
      {/* Dominant Emotion Visualization */}
      <div className="dominant-emotion">
        <div 
          className="emotion-visual"
          style={{ 
            background: visualization.gradient,
            transform: `scale(${1 + visualization.intensity * 0.2})`
          }}
        >
          <span className="emotion-icon">{visualization.icon}</span>
          {analysis.dominantEmotion && (
            <div className="confidence-badge">
              {analysis.dominantEmotion.confidence}%
            </div>
          )}
        </div>
        
        {analysis.dominantEmotion ? (
          <div className="emotion-details">
            <h4 className="emotion-name">{analysis.dominantEmotion.name}</h4>
            <div className="emotion-stats">
              <span className="stat-item">
                <span className="stat-label">Strength:</span>
                <span className="stat-value">
                  {Math.round(analysis.dominantEmotion.strength)}
                </span>
              </span>
              <span className="stat-item">
                <span className="stat-label">Frequency:</span>
                <span className="stat-value">
                  {analysis.dominantEmotion.frequency}
                </span>
              </span>
            </div>
          </div>
        ) : (
          <div className="emotion-details">
            <h4 className="emotion-name">No Data</h4>
            <p className="emotion-subtitle">Awaiting emotional input</p>
          </div>
        )}
      </div>
      
      {/* Health Metrics Grid */}
      <div className="health-metrics">
        <div className="metric-item">
          <div className="metric-icon">⚖️</div>
          <div className="metric-content">
            <div className="metric-value">{analysis.emotionalStability}%</div>
            <div className="metric-label">Stability</div>
          </div>
        </div>
        
        <div className="metric-item">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-value">{analysis.positivityRatio}%</div>
            <div className="metric-label">Positivity</div>
          </div>
        </div>
        
        <div className="metric-item">
          <div className="metric-icon">🌀</div>
          <div className="metric-content">
            <div className="metric-value">{analysis.emotionalDiversity}%</div>
            <div className="metric-label">Diversity</div>
          </div>
        </div>
        
        <div className="metric-item">
          <div className="metric-icon">💥</div>
          <div className="metric-content">
            <div className="metric-value">{analysis.emotionalIntensity}%</div>
            <div className="metric-label">Intensity</div>
          </div>
        </div>
      </div>
      
      {/* Health Insights */}
      {insights.length > 0 && (
        <div className="health-insights">
          <h5 className="insights-title">Insights</h5>
          <div className="insights-list">
            {insights.map((insight, index) => (
              <div key={index} className={`insight-item ${insight.type}`}>
                <span className="insight-icon">{insight.icon}</span>
                <span className="insight-text">{insight.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Trend Indicator */}
      {analysis.sentimentTrend !== 'stable' && (
        <div className="trend-indicator">
          <span className="trend-icon">
            {analysis.sentimentTrend === 'improving' ? '📈' : '📉'}
          </span>
          <span className="trend-text">
            {analysis.sentimentTrend === 'improving' ? 'Trending Up' : 'Trending Down'}
          </span>
        </div>
      )}
    </div>
  );
};

// Connection Visualization
const ConnectionVisualization = ({ partnerInfo, connectionStrength }) => {
  const connectionLevel = connectionStrength || 1;
  
  return (
    <div className="connection-viz">
      <div className="connection-line">
        <div 
          className="connection-energy" 
          style={{ 
            width: `${connectionLevel * 20}%`,
            opacity: 0.5 + (connectionLevel * 0.1)
          }}
        ></div>
      </div>
      
      <div className="connection-nodes">
        <div className="connection-node you">
          <div className="node-avatar">Y</div>
          <div className="node-label">You</div>
        </div>
        
        <div className="connection-node partner">
          <div className="node-avatar">
            {partnerInfo?.username?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div className="node-label">{partnerInfo?.username || 'Partner'}</div>
        </div>
      </div>
    </div>
  );
};

// Floating Chit Particles Background
const FloatingChitsBackground = ({ count = 15 }) => {
  return (
    <div className="floating-chits">
      {Array.from({ length: count }).map((_, i) => {
        const emotions = ['happy', 'grateful', 'disappointed', 'sad', 'angry'];
        const emotion = emotions[Math.floor(Math.random() * emotions.length)];
        
        const getEmotionIcon = (em) => {
          const icons = {
            happy: '✨',
            grateful: '💫',
            disappointed: '🫧',
            sad: '💧',
            angry: '🔥'
          };
          return icons[em] || '📝';
        };

        return (
          <div
            key={i}
            className="floating-chit"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          >
            <span className="chit-icon">{getEmotionIcon(emotion)}</span>
          </div>
        );
      })}
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [screenState, setScreenState] = useState('loading');
  const [chestData, setChestData] = useState(null);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [settings, setSettings] = useState(null);
  const [unlockInfo, setUnlockInfo] = useState(null);
  const [isCreatingChest, setIsCreatingChest] = useState(false);
  const [chestHistory, setChestHistory] = useState([]);
  const [chitsHistory, setChitsHistory] = useState([]);
  const [connectionStrength, setConnectionStrength] = useState(1);
  const [showTutorial, setShowTutorial] = useState(false);

  // Load all data
  useEffect(() => {
    loadHomeData();
    
    // Check if first visit
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, [user, profile]);

  // Add this useEffect to handle location state
  useEffect(() => {
    const handleLocationState = async () => {
      // Check if we came from ReadChest with a chestCompleted message
      if (location.state?.chestCompleted || location.state?.message?.includes('empty')) {
        console.log('Returned from reading chest, refreshing data...');
        // Force reload data to update state
        await loadHomeData();
        
        // Clear location state to prevent infinite loops
        navigate(location.pathname, { replace: true, state: {} });
      }
    };
    
    if (!loading) {
      handleLocationState();
    }
  }, [location.state, loading]);

// In Home.jsx, update the loadHomeData function:

const loadHomeData = async () => {
  if (!user || !profile) return;

  try {
    setLoading(true);
    setError('');

    // Load partner info
    if (profile.pairedUserId) {
      const partner = await getPartnerInfo(profile.pairedUserId);
      setPartnerInfo(partner);
    }

    // Load user settings
    const userSettings = await getUserSettings(user.uid);
    setSettings(userSettings);

    // Load chest history
    const history = await getChestHistory(user.uid);
    setChestHistory(history);

    // Load chits history
    const chits = await getChitsHistory(user.uid);
    setChitsHistory(chits);

    // Calculate connection strength based on history
    if (chits.length > 0) {
      const totalChits = chits.reduce((sum, chest) => sum + chest.chits.length, 0);
      const recentChits = chits.slice(0, 3).reduce((sum, chest) => sum + chest.chits.length, 0);
      setConnectionStrength(Math.min(Math.max(totalChits / 10 + recentChits / 5, 1), 5));
    }

    // Check for active chest
    if (profile.pairedUserId) {
      const activeChest = await getActiveChest(user.uid, profile.pairedUserId);
      
      if (activeChest) {
        setChestData(activeChest);
        
        // Check if chest is unlockable
        const unlockCheck = await checkChestUnlockable(activeChest.id);
        setUnlockInfo(unlockCheck);
        
        // Determine screen state based ONLY on chest status
        if (activeChest.status === 'active') {
          setScreenState('C'); // Active chest, locked
        } else if (activeChest.status === 'unlockable' || unlockCheck.isUnlockable) {
          setScreenState('D'); // Chest unlockable
        } else if (activeChest.status === 'completed') {
          setScreenState('B'); // Chest completed, can start new one
        } else if (activeChest.status === 'opened') {
          // For opened chests, check if we need to mark as completed
          const partnerChits = await getChitsForChest(activeChest.id, profile.pairedUserId);
          const unreadChits = partnerChits.filter(chit => !chit.isRead);
          
          if (unreadChits.length === 0) {
            // All chits read, mark as completed
            await updateChestStatus(activeChest.id, 'completed');
            setScreenState('B');
          } else {
            // Still has unread chits
            setScreenState('D');
          }
        } else {
          setScreenState('B'); // Fallback
        }
      } else {
        // No active chest
        setScreenState('B');
      }
    } else {
      // Not paired
      setScreenState('A');
    }

  } catch (err) {
    console.error('Error loading home data:', err);
    setError('Failed to load data. Please try again.');
    setScreenState('error');
  } finally {
    setLoading(false);
  }
};

  const handleStartNewChest = async () => {
    if (!profile?.pairedUserId || !settings) return;

    try {
      setIsCreatingChest(true);
      setError('');

      const canStart = await canStartNewChest(user.uid, profile.pairedUserId);
      if (!canStart.canStart) {
        throw new Error('Cannot start new chest while another is active');
      }

      // Create new chest with dev mode duration
      const durationInMinutes = isDev ? 1 : (settings.chestDuration * 1440);
      console.log('Creating chest with duration:', durationInMinutes, 'minutes');
      
      const newChest = await createChest(user.uid, profile.pairedUserId, durationInMinutes);
      console.log('Chest created:', newChest);
      
      // Reload data to update UI
      await loadHomeData();
      
      // Show success message
      setError(''); // Clear any previous errors

    } catch (err) {
      console.error('Error starting new chest:', err);
      setError(err.message || 'Failed to start new chest');
    } finally {
      setIsCreatingChest(false);
    }
  };

  const handleOpenChest = () => {
    if (chestData) {
      navigate('/read-chest', { state: { chestId: chestData.id } });
    }
  };

  const handleAddChit = () => {
    if (chestData) {
      navigate('/add-chit', { state: { chestId: chestData.id } });
    }
  };

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  const handleGoToPairing = () => {
    navigate('/pairing');
  };

  const handleGoToHistory = () => {
    navigate('/history');
  };

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };



  const getTimeUntilUnlock = () => {
    if (!chestData?.unlockDate) return '';
    
    const now = new Date();
    const unlock = new Date(chestData.unlockDate);
    const diff = unlock - now;
    
    if (diff <= 0) return 'Ready to open!';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="home-container">
        <Header title="The Chest" />
        <div className="home-loading">
          <LoadingSpinner size="large" text="Loading your journey..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <Header title="The Chest" />
        <div className="home-error">
          <div className="error-message">
            {error}
            {error.includes('Cannot start new chest') && (
              <div className="error-hint">
                You may need to complete or wait for the current chest to unlock.
              </div>
            )}
          </div>
          <div className="error-actions">
            <button className="retry-button" onClick={loadHomeData}>
              Refresh
            </button>
            <button className="secondary-button" onClick={() => setError('')}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Floating Background Elements */}
      <FloatingChitsBackground />
      
      {/* Tutorial Overlay */}
      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-content">
            <h2>Welcome to The Chest</h2>
            <p>A space for thoughtful sharing with your partner</p>
            
            <div className="tutorial-steps">
              <div className="tutorial-step">
                <div className="step-icon">💌</div>
                <h3>1. Add Chits</h3>
                <p>Share your thoughts and feelings throughout the week</p>
              </div>
              
              <div className="tutorial-step">
                <div className="step-icon">🔒</div>
                <h3>2. Chest Locks</h3>
                <p>Your chits are safely stored until unlock time</p>
              </div>
              
              <div className="tutorial-step">
                <div className="step-icon">🔓</div>
                <h3>3. Unlock & Read</h3>
                <p>Read your partner's chits thoughtfully, one by one</p>
              </div>
            </div>
            
            <button className="tutorial-close" onClick={handleCloseTutorial}>
              Begin Your Journey
            </button>
          </div>
        </div>
      )}
      
      <Header title="The Chest" />
      
      {isDev && (
        <div className="dev-badge">
          <span className="dev-icon">⚡</span>
          <span className="dev-text">Dev Mode Active</span>
        </div>
      )}
      
      <main className="home-content">
        {/* Connection Header */}
        {screenState !== 'A' && (
          <div className="connection-header">
            <ConnectionVisualization 
              partnerInfo={partnerInfo} 
              connectionStrength={connectionStrength} 
            />
          </div>
        )}
        
        {/* Main Dashboard */}
        <div className="dashboard-grid">
          {/* Left Column - Current Chest Status */}
          <div className="dashboard-column main">
            <div className="dashboard-card chest-status">
              <h2 className="card-title">
                {screenState === 'A' ? 'Welcome' : 
                 screenState === 'B' ? 'Create New Chest' : 
                 screenState === 'C' ? 'Active Chest' : 'Chest Ready!'}
              </h2>
              
              {screenState === 'A' && (
                <div className="welcome-message">
                  <div className="welcome-icon">💝</div>
                  <h3>Begin Your Journey</h3>
                  <p>Create thoughtful connections through time-locked sharing</p>
                  <button 
                    className="welcome-button"
                    onClick={handleGoToPairing}
                  >
                    Pair with Partner
                  </button>
                </div>
              )}
              
              {screenState === 'B' && (
                <div className="new-chest-interface">
                  <div className="chest-visualization">
                    <div className="chest-silhouette">
                      <div className="chest-lid"></div>
                      <div className="chest-body"></div>
                      <div className="chest-lock"></div>
                    </div>
                    
                    <div className="chest-sparkles">
                      {[...Array(5)].map((_, i) => (
                        <div 
                          key={i}
                          className="sparkle"
                          style={{
                            animationDelay: `${i * 0.5}s`,
                            left: `${20 + i * 15}%`
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="duration-selector">
                    <label>Duration: <strong>{settings?.chestDuration || 7} days</strong></label>
                    <div className="duration-hint">
                      Your emotional time capsule
                    </div>
                  </div>
                  
                  <button 
                    className="start-chest-button"
                    onClick={handleStartNewChest}
                    disabled={isCreatingChest}
                  >
                    <span className="button-icon"></span>
                    {isCreatingChest ? 'Creating Time Capsule...' : 'Start New Chest'}
                  </button>
                </div>
              )}
              
              {(screenState === 'C' || screenState === 'D') && chestData && (
                <div className="active-chest-display">
                  <div className="chest-metaphor">
                    <div className={`metaphor-icon ${screenState === 'D' ? 'unlocked' : 'locked'}`}>
                      {screenState === 'D' ? '🔓' : '🔒'}
                    </div>
                    
                    <div className="metaphor-text">
                      <h3>
                        {screenState === 'D' ? 'Emotional Time Capsule Ready' : 'Growing Emotional Garden'}
                      </h3>
                      <p>
                        {screenState === 'D' 
                          ? 'Your partner\'s thoughts are waiting to be discovered'
                          : 'Seeds of emotion are growing. They\'ll bloom soon.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="time-display">
                    <div className="time-circle">
                      <div className="time-progress"></div>
                      <div className="time-text">{getTimeUntilUnlock()}</div>
                    </div>
                    
                    <div className="time-details">
                      <div className="time-detail">
                        <span className="detail-label">Started</span>
                        <span className="detail-value">
                          {chestData.startDate?.toLocaleDateString([], { 
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <div className="time-detail">
                        <span className="detail-label">Unlocks</span>
                        <span className="detail-value highlight">
                          {chestData.unlockDate?.toLocaleDateString([], { 
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="chest-actions">
                    {screenState === 'C' && (
                      <button 
                        className="chest-action-button primary"
                        onClick={handleAddChit}
                      >
                        <span className="action-icon">✍️</span>
                        Add Chit to Garden
                      </button>
                    )}
                    
                    {screenState === 'D' && (
                      <button 
                        className="chest-action-button unlock"
                        onClick={handleOpenChest}
                      >
                        <span className="action-icon">🔓</span>
                        Open Time Capsule
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="dashboard-card weather-card">
              <EmotionalWeather chits={chitsHistory[0]?.chits} />
            </div>
          </div>
          
          {/* Right Column - Stats & History */}
          <div className="dashboard-column side">
            {/* Emotional Weather */}
            
            
            {/* Journey Timeline */}
            {chestHistory.length > 0 && (
              <div className="dashboard-card timeline-card">
                <h3 className="card-title">Your Journey</h3>
                <TimelineVisualization 
                  chests={chestHistory.slice(0, 5)} 
                  currentChest={chestData} 
                />
                
                {chestHistory.length > 0 && (
                  <div className="journey-stats">
                    <div className="journey-stat">
                      <span className="stat-value">{chestHistory.length}</span>
                      <span className="stat-label">Chests</span>
                    </div>
                    
                    <div className="journey-stat">
                      <span className="stat-value">
                        {chitsHistory.reduce((sum, chest) => sum + chest.chits.length, 0)}
                      </span>
                      <span className="stat-label">Chits</span>
                    </div>
                    
                    <div className="journey-stat">
                      <span className="stat-value">
                        {Math.round(connectionStrength * 20)}%
                      </span>
                      <span className="stat-label">Connection</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Quick Actions */}
            <div className="dashboard-card actions-card">
              <h3 className="card-title">Quick Actions</h3>
              <div className="action-buttons-grid">
                <button 
                  className="action-button-icon"
                  onClick={handleGoToHistory}
                >
                  <span className="button-icon">📜</span>
                  <span className="button-label">History</span>
                </button>
                
                <button 
                  className="action-button-icon"
                  onClick={handleGoToSettings}
                  disabled={screenState === 'C'}
                >
                  <span className="button-icon">⚙️</span>
                  <span className="button-label">Settings</span>
                </button>
                
                {isDev && screenState === 'C' && chestData && (
                  <button 
                    className="action-button-icon danger"
                    onClick={() => {
                      if (window.confirm('Delete current chest? This is for development only.')) {
                        // Add delete logic here
                      }
                    }}
                  >
                    <span className="button-icon">🗑️</span>
                    <span className="button-label">Reset (Dev)</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Daily Reflection */}
            <div className="dashboard-card reflection-card">
              <h3 className="card-title">Today's Reflection</h3>
              <p className="reflection-text">
                {screenState === 'C' 
                  ? "What emotion do you want to share with your partner today?"
                  : screenState === 'D'
                  ? "Prepare to receive your partner's thoughts with an open heart."
                  : "Every shared emotion is a step closer in your journey."}
              </p>
              <div className="reflection-prompt">
                {screenState === 'C' && (
                  <button 
                    className="reflection-button"
                    onClick={handleAddChit}
                  >
                    Start Reflection
                  </button>
                )}
              </div>
            </div>
            {screenState !== 'A' && (
          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-icon">💌</div>
              <div className="stat-content">
                <div className="stat-number">
                  {chitsHistory.reduce((sum, chest) => sum + chest.chits.length, 0)}
                </div>
                <div className="stat-label">Total Chits</div>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <div className="stat-number">{chestHistory.length}</div>
                <div className="stat-label">Time Capsules</div>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-number">
                  {chestData ? getTimeUntilUnlock() : '--'}
                </div>
                <div className="stat-label">Until Unlock</div>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">❤️</div>
              <div className="stat-content">
                <div className="stat-number">
                  {Math.round(connectionStrength * 20)}%
                </div>
                <div className="stat-label">Connection</div>
              </div>
            </div>
          </div>
        )}
          </div>
          
        </div>
        
          
      </main>
    </div>
  );
};

export default Home;