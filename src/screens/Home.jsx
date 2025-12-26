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


const isDev = false;

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
  // 10. Generate Health Insights from Analysis
  const generateHealthInsights = (analysis) => {
    const insights = [];
    
    // Health Score Insights - More nuanced tiers
    if (analysis.healthScore >= 85) {
      insights.push({
        type: 'excellent',
        message: 'Your emotional landscape shows remarkable resilience and balance—a testament to your self-awareness journey.',
        icon: '🌄',
        subtext: 'This consistency suggests well-developed emotional regulation strategies.'
      });
    } else if (analysis.healthScore >= 70) {
      insights.push({
        type: 'positive',
        message: 'Your emotional foundation is solid, with healthy patterns supporting your well-being.',
        icon: '🛡️',
        subtext: 'Continue nurturing these positive emotional habits.'
      });
    } else if (analysis.healthScore <= 35) {
      insights.push({
        type: 'concern',
        message: 'Your emotional terrain shows signs of weathering—this may be a signal to explore additional support systems.',
        icon: '🕯️',
        subtext: 'Consider this a gentle nudge toward self-compassion and external resources.'
      });
    } else if (analysis.healthScore <= 50) {
      insights.push({
        type: 'attention',
        message: 'Some emotional patterns suggest room for gentle realignment.',
        icon: '🧭',
        subtext: 'Small, consistent adjustments can create meaningful shifts over time.'
      });
    }
    
    // Emotional Stability Insights - With poetic descriptors
    if (analysis.emotionalStability >= 85) {
      insights.push({
        type: 'positive',
        message: 'Your emotional climate shows remarkable consistency—like a steady mountain in changing seasons.',
        icon: '🏔️',
        subtext: 'This emotional equilibrium is a powerful foundation for decision-making.'
      });
    } else if (analysis.emotionalStability >= 70) {
      insights.push({
        type: 'positive',
        message: 'Your emotional currents flow with reasonable predictability.',
        icon: '🌅',
        subtext: 'This stability supports meaningful connections with others.'
      });
    } else if (analysis.emotionalStability <= 35) {
      insights.push({
        type: 'concern',
        message: 'Your emotional weather changes frequently—like sudden summer storms.',
        icon: '⚡',
        subtext: 'Tracking these patterns is the first step toward understanding their rhythm.'
      });
    } else if (analysis.emotionalStability <= 50) {
      insights.push({
        type: 'attention',
        message: 'Your emotional tides have noticeable variations.',
        icon: '🌊',
        subtext: 'This awareness itself is a tool for navigation.'
      });
    }
    
    // Positivity Ratio Insights - More descriptive ranges
    if (analysis.positivityRatio >= 75) {
      insights.push({
        type: 'positive',
        message: 'Your perspective leans toward the light—finding brightness even in challenging moments.',
        icon: '🌻',
        subtext: 'This optimistic lens can be contagious in the best way.'
      });
    } else if (analysis.positivityRatio >= 60) {
      insights.push({
        type: 'balanced',
        message: 'You maintain a realistic yet hopeful outlook.',
        icon: '⚖️',
        subtext: 'This balanced approach honors both challenges and opportunities.'
      });
    } else if (analysis.positivityRatio <= 25) {
      insights.push({
        type: 'concern',
        message: 'Heavier emotions have been frequent visitors lately.',
        icon: '☁️',
        subtext: 'Remember: clouds don\'t erase the sun, they just temporarily obscure it.'
      });
    } else if (analysis.positivityRatio <= 40) {
      insights.push({
        type: 'attention',
        message: 'Your focus tends toward life\'s complexities and challenges.',
        icon: '🔍',
        subtext: 'Consider what small sparks of joy you might invite into your awareness.'
      });
    }
    
    // Recent Emotional Shift - More evocative descriptions
    if (analysis.recentEmotionalShift === 'positive') {
      insights.push({
        type: 'momentum',
        message: 'A fresh breeze is moving through your emotional landscape.',
        icon: '🍃',
        subtext: 'Notice what changes or practices might be contributing to this uplift.'
      });
    } else if (analysis.recentEmotionalShift === 'negative') {
      insights.push({
        type: 'awareness',
        message: 'Your emotional weather has cooled recently.',
        icon: '🍂',
        subtext: 'Seasonal shifts are natural; this awareness alone is protective.'
      });
    }
    
    // Emotional Diversity - More poetic interpretations
    if (analysis.emotionalDiversity >= 75) {
      insights.push({
        type: 'rich',
        message: 'Your emotional palette is beautifully varied—a full spectrum of human experience.',
        icon: '🎨',
        subtext: 'This emotional range suggests openness to life\'s complexity.'
      });
    } else if (analysis.emotionalDiversity >= 60) {
      insights.push({
        type: 'balanced',
        message: 'You experience a healthy range of emotional colors.',
        icon: '🌈',
        subtext: 'This diversity helps you respond flexibly to different situations.'
      });
    } else if (analysis.emotionalDiversity <= 30) {
      insights.push({
        type: 'focused',
        message: 'Your emotional experience currently flows through a narrower channel.',
        icon: '🌊',
        subtext: 'This focus can indicate depth, or perhaps a need to explore other emotional territories.'
      });
    } else if (analysis.emotionalDiversity <= 45) {
      insights.push({
        type: 'concentrated',
        message: 'Your emotional expression tends toward specific tones.',
        icon: '🎯',
        subtext: 'Notice if this concentration serves you or limits your expressive range.'
      });
    }
    
    // Add personalized insights based on combinations
    if (insights.filter(i => i.type === 'concern').length >= 3) {
      insights.push({
        type: 'compassion',
        message: 'Your emotional landscape shows multiple signs of challenge—this is a courageous space to acknowledge.',
        icon: '🕊️',
        subtext: 'Consider this an invitation for extra kindness toward yourself this week.'
      });
    }
    
    if (insights.filter(i => i.type.includes('positive') || i.type === 'excellent').length >= 3) {
      insights.push({
        type: 'celebration',
        message: 'Multiple indicators suggest flourishing emotional well-being.',
        icon: '🎉',
        subtext: 'Take a moment to acknowledge what\'s supporting this positive state.'
      });
    }
    
    // Add a summary insight for significant patterns
    const positiveInsights = insights.filter(i => i.type === 'positive' || i.type === 'excellent').length;
    const concernInsights = insights.filter(i => i.type === 'concern').length;
    
    if (positiveInsights >= 2 && concernInsights === 0) {
      insights.push({
        type: 'summary',
        message: 'Overall, your emotional ecosystem shows signs of vibrant health and balance.',
        icon: '🌳',
        subtext: 'These patterns suggest resilience and emotional intelligence in action.'
      });
    } else if (concernInsights >= 2) {
      insights.push({
        type: 'summary',
        message: 'Several signals suggest your emotional world could use some gentle tending.',
        icon: '🌱',
        subtext: 'Even awareness of these patterns is a form of care.'
      });
    }
    
    // If no specific insights, provide more thoughtful general one
    if (insights.length === 0 && analysis.totalChits > 0) {
      insights.push({
        type: 'observation',
        message: 'Your emotional patterns are still revealing their unique contours.',
        icon: '🌀',
        subtext: 'Continue observing—each entry adds clarity to your emotional landscape.'
      });
    } else if (analysis.totalChits === 0) {
      insights.push({
        type: 'invitation',
        message: 'Your emotional journal awaits its first entries.',
        icon: '📖',
        subtext: 'Begin whenever you feel ready—there\'s no right or wrong starting point.'
      });
    }
    
    // Limit insights to most relevant 5-6
    const priorityOrder = ['concern', 'celebration', 'compassion', 'attention', 'summary', 'momentum', 'positive', 'excellent', 'balanced', 'rich', 'focused', 'observation', 'invitation'];
    
    return insights
      .sort((a, b) => priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type))
      .slice(0, 6);
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
    <div className="insights-header">
      <div className="header-content">
        <h5 className="insights-title">
          <span className="title-icon"></span>
          Emotional Insights
        </h5>
        <span className="insights-count">{insights.length} pattern{insights.length !== 1 ? 's' : ''} detected</span>
      </div>
      
    </div>

    <div className="insights-list">
      {insights.map((insight, index) => (
        <div 
          key={index} 
          className={`insight-card insight-${insight.type}`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="insight-card-header">
            <div className="insight-icon-container">
              <span className="insight-icon">{insight.icon}</span>
              <span className="insight-type-badge">{insight.type}</span>
            </div>
            <div className="insight-priority" title="Insight relevance">
              {index < 3 ? '✦' : '○'}
            </div>
          </div>

          <div className="insight-content">
            <p className="insight-message">{insight.message}</p>
            {insight.subtext && (
              <div className="insight-subtext">
                <span className="subtext-icon">💭</span>
                <span className="subtext-content">{insight.subtext}</span>
              </div>
            )}
          </div>

          <div className="insight-footer">
            <div className="insight-indicator">
              <div className={`indicator-dot indicator-${insight.type}`}></div>
              <span className="insight-category">
                {insight.type === 'concern' ? 'Attention Suggested' :
                 insight.type === 'positive' ? 'Strength Noted' :
                 insight.type === 'excellent' ? 'Celebration' :
                 insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
              </span>
            </div>
            <div className="insight-number">#{index + 1}</div>
          </div>
        </div>
      ))}
    </div>

    <div className="insights-footer">
      <div className="insights-summary">
        <div className="summary-item">
          <span className="summary-icon">📊</span>
          <span className="summary-text">
            {insights.filter(i => i.type === 'concern' || i.type === 'attention').length > 0 ? 
             `${insights.filter(i => i.type === 'concern' || i.type === 'attention').length} area${insights.filter(i => i.type === 'concern' || i.type === 'attention').length !== 1 ? 's' : ''} for gentle attention` :
             'All patterns within healthy ranges'}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-icon">✨</span>
          <span className="summary-text">
            {insights.filter(i => i.type === 'positive' || i.type === 'excellent').length} strength{insights.filter(i => i.type === 'positive' || i.type === 'excellent').length !== 1 ? 's' : ''} identified
          </span>
        </div>
      </div>
      <div className="insights-note">
        <span className="note-icon">💡</span>
        <span className="note-text">
          These insights are based on your recent emotional entries and patterns
        </span>
      </div>
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
const ConnectionVisualization = ({ partnerInfo }) => {
  return (
    <div className="connection-viz romantic">
      
      {/* LEFT — YOU */}
      <div className="connection-side left">
        <span className="you-label">You</span>
        <div className="user-icon you">
          <UserIcon />
          <div className="icon-glow" />
        </div>
      </div>

      {/* CENTER — LOVE ENERGY */}
      <div className="love-center">
        <div className="love-heart-wrapper">
          <svg
            className="love-heart"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
              2 5.42 4.42 3 7.5 3c1.74 0 3.41.81
              4.5 2.09C13.09 3.81 14.76 3
              16.5 3 19.58 3 22 5.42
              22 8.5c0 3.78-3.4 6.86-8.55
              11.54L12 21.35z" />
          </svg>

          {/* romantic aura */}
          <div className="heart-glow" />
          <div className="heart-ring" />
        </div>
      </div>


      {/* RIGHT — PARTNER */}
      <div className="connection-side right">
        <div className="user-icon partner">
          <UserIcon />
          <div className="icon-glow" />
        </div>
        <div className="partner-name">
          {partnerInfo?.username || 'Partner'}
        </div>
      </div>
    </div>
  );
};

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 
      7.2 4.5 7.2 7.2 9.3 12 12 12zm0 
      2.4c-3.2 0-9.6 1.6-9.6 
      4.8V22h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
  </svg>
);



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
        console.log('Active chest loaded:', activeChest);
        console.log('unlockDate:', activeChest.unlockDate);
        console.log('unlockDate type:', typeof activeChest.unlockDate);
        console.log('unlockDate instanceof Date:', activeChest.unlockDate instanceof Date);
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
      
      const newChest = await createChest(user.uid, profile.pairedUserId, durationInMinutes / 1440);
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
  

  
  const formatDate = (date) => {
  if (!date) return 'N/A';
  
  // Check if it's a valid date
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date);
    return 'Invalid date';
  }
  
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' at ' + dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTimeUntilUnlock = (unlockDate) => {
  if (!unlockDate) return '';
  
  const now = new Date();
  const unlock = unlockDate instanceof Date ? unlockDate : new Date(unlockDate);
  
  if (isNaN(unlock.getTime())) {
    return 'Date error';
  }
  
  const diff = unlock - now;
  
  if (diff <= 0) return 'Ready to open!';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
};

  if (loading) {
    return (
      <div className="home-container">
        <Header title="The Chest" />
        <div className="home-loading">
          <LoadingSpinner size="large" text=" Loading your journey" />
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
                    {isCreatingChest ? 'Creating Time Capsule...' : 'Start New Chest'}
                  </button>
                </div>
              )}
              
              {(screenState === 'C' || screenState === 'D') && chestData && (
                <div className="active-chest-display">
                  <div className="chest-metaphor">
                    <div className={`metaphor-icon ${screenState === 'D' ? 'unlocked' : 'locked'}`}>
                      {screenState === 'D' ? '' : '🔒'}
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
                    </div>
                    
                    <div className="time-details">
                      <div className="time-detail">
                        <span className="detail-label">Started</span>
                        <span className="detail-value">
                          {formatDate(chestData.startDate)}
                        </span>
                      </div>
                      
                      <div className="time-detail">
                        <span className="detail-label">Unlocks</span>
                        <span className="detail-value highlight">
                          {formatDateTime(chestData.unlockDate)}
                        </span>
                      </div>
                      
                      {/* Add this for debugging */}
                      <div className="time-detail debug" style={{ display: 'none' }}>
                        <span className="detail-label">Debug</span>
                        <span className="detail-value">
                          Raw: {chestData.unlockDate?.toString()}
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
                        Open
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
                  className="action-button-icon tooltip-container"
                  onClick={handleGoToHistory}
                  aria-label="View History"
                >
                  <svg className="button-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
                    <path d="M12.5 7H11V13L16.2 16.2L17 14.9L12.5 12.2V7Z" fill="currentColor"/>
                  </svg>
                </button>
                
                <button 
                  className="action-button-icon tooltip-container"
                  onClick={handleGoToSettings}
                  disabled={screenState === 'C'}
                  aria-label="Settings"
                >
                  <svg className="button-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.14 12.94C19.18 12.64 19.2 12.34 19.2 12C19.2 11.66 19.18 11.36 19.14 11.06L21.16 9.38C21.36 9.22 21.4 8.95 21.26 8.73L19.34 5.72C19.21 5.53 18.96 5.48 18.77 5.6L16.48 7C15.96 6.66 15.38 6.39 14.76 6.2L14.4 3.73C14.36 3.49 14.17 3.31 13.93 3.31H10.07C9.83 3.31 9.64 3.49 9.6 3.73L9.24 6.2C8.62 6.39 8.04 6.66 7.52 7L5.23 5.6C5.04 5.48 4.79 5.53 4.66 5.72L2.74 8.73C2.6 8.95 2.64 9.22 2.84 9.38L4.86 11.06C4.82 11.36 4.8 11.66 4.8 12C4.8 12.34 4.82 12.64 4.86 12.94L2.84 14.62C2.64 14.78 2.6 15.05 2.74 15.27L4.66 18.28C4.79 18.47 5.04 18.52 5.23 18.4L7.52 17C8.04 17.34 8.62 17.61 9.24 17.8L9.6 20.27C9.64 20.51 9.83 20.69 10.07 20.69H13.93C14.17 20.69 14.36 20.51 14.4 20.27L14.76 17.8C15.38 17.61 15.96 17.34 16.48 17L18.77 18.4C18.96 18.52 19.21 18.47 19.34 18.28L21.26 15.27C21.4 15.05 21.36 14.78 21.16 14.62L19.14 12.94ZM12 15.5C10.07 15.5 8.5 13.93 8.5 12C8.5 10.07 10.07 8.5 12 8.5C13.93 8.5 15.5 10.07 15.5 12C15.5 13.93 13.93 15.5 12 15.5Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>
                        
            {/* Daily Reflection */}
          <div className="dashboard-card reflection-card">
            <div className="reflection-header">
              <h3 className="card-title">
                <span className="title-icon">
                  
                </span>
                Daily Reflection
              </h3>
              <div className="reflection-indicator">
                <div className="pulse-dot"></div>
                <span className="status-text">
                  {screenState === 'C' ? 'Ready to Share' : 
                  screenState === 'D' ? 'Awaiting Partner' : 
                  screenState === 'B' ? 'Connection Active' : 
                  'Welcome'}
                </span>
              </div>
            </div>

            <div className="reflection-container">
              {/* Floating particles background */}
              <div className="floating-particles">
                {[...Array(15)].map((_, i) => (
                  <div 
                    key={i} 
                    className="particle"
                    style={{
                      '--delay': `${i * 0.2}s`,
                      '--x': `${Math.random() * 100}%`,
                      '--y': `${Math.random() * 100}%`,
                      '--size': `${Math.random() * 4 + 2}px`
                    }}
                  />
                ))}
              </div>

              {/* Animated floating icons */}
              <div className="floating-icons">
                <div className="floating-icon heart" style={{ '--i': 1 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>
                <div className="floating-icon message" style={{ '--i': 2 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                </div>
                <div className="floating-icon star" style={{ '--i': 3 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                </div>
              </div>

              {/* 3D Card with flip animation */}
              <div className="reflection-card-3d">
                <div className="card-face front">
                  <div className="reflection-content">
                    <div className="reflection-icon-wrapper">
                      <div className="reflection-icon">
                        {screenState === 'C' ? (
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
                            <path d="M15 11H13V9H11V11H9V13H11V15H13V13H15V11Z" fill="currentColor"/>
                          </svg>
                        ) : screenState === 'D' ? (
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                            <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 18H4V8L12 13L20 8V18ZM12 11L4 6H20L12 11Z" fill="currentColor"/>
                          </svg>
                        ) : (
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/>
                          </svg>
                        )}
                      </div>
                    </div>
                    
                    <div className="reflection-text-wrapper">
                      <p className="reflection-text">
                        {screenState === 'C' 
                          ? "What emotion is calling to be shared with your partner today? This moment is sacred space."
                          : screenState === 'D'
                          ? "A treasure awaits you. Prepare your heart to receive your partner's deepest feelings."
                          : "Your emotional journey continues. Every shared feeling weaves your story tighter together."}
                      </p>
                      
                      <div className="reflection-subtext">
                        {screenState === 'C' 
                          ? "Your vulnerability creates connection"
                          : screenState === 'D'
                          ? "Anticipation makes the heart grow fonder"
                          : "Continue building your shared emotional world"}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="card-face back">
                  <div className="reflection-prompt">
                    {screenState === 'C' && (
                      <>
                        <div className="prompt-header">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
                            <path d="M13 7H11V9H13V7ZM13 11H11V17H13V11Z" fill="currentColor"/>
                          </svg>
                          <span>Ready to Reflect</span>
                        </div>
                        <p className="prompt-text">Take a deep breath and share what's in your heart</p>
                        <button 
                          className="reflection-button"
                          onClick={handleAddChit}
                        >
                          <span className="button-glow"></span>
                          <span className="button-text">Begin Reflection</span>
                          <svg className="button-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z" fill="currentColor"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress indicator */}
              <div className="reflection-progress">
                <div className="progress-track">
                  <div className="progress-fill" style={{
                    width: screenState === 'C' ? '33%' : 
                          screenState === 'D' ? '66%' : 
                          screenState === 'B' ? '100%' : '0%'
                  }}></div>
                </div>
                <div className="progress-labels">
                  <span className={screenState === 'C' ? 'active' : ''}>Share</span>
                  <span className={screenState === 'D' ? 'active' : ''}>Receive</span>
                  <span className={screenState === 'B' ? 'active' : ''}>Connect</span>
                </div>
              </div>
            </div>
          </div>
            {screenState !== 'A' && (
            <div className="stats-bar">
              <div className="stat-item">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-number">
                    {chitsHistory.reduce((sum, chest) => sum + chest.chits.length, 0)}
                  </div>
                  <div className="stat-label">Chits</div>
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.5 3.5L18 2L16.5 3.5L15 2L13.5 3.5L12 2L10.5 3.5L9 2L7.5 3.5L6 2L4.5 3.5L3 2V22L4.5 20.5L6 22L7.5 20.5L9 22L10.5 20.5L12 22L13.5 20.5L15 22L16.5 20.5L18 22L19.5 20.5L21 22V2L19.5 3.5ZM19 19.09H5V4.91H19V19.09Z" fill="currentColor"/>
                    <path d="M6 15H18V17H6V15ZM6 11H18V13H6V11ZM6 7H18V9H6V7Z" fill="currentColor"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-number">{chestHistory.length}</div>
                  <div className="stat-label">Chests</div>
                </div>
              </div>
              
              
              
              <div className="stat-item">
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" fill="currentColor"/>
                  </svg>
                </div>
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