import React from 'react';
import './WorkoutSummary.css';

const WorkoutSummary = ({ data, exercise, onClose }) => {
  if (!data) return null;

  let exerciseName;
  switch (exercise) {
    case 'pushups':
      exerciseName = 'Push-Ups';
      break;
    case 'pullups':
      exerciseName = 'Pull-Ups';
      break;
    case 'squats':
      exerciseName = 'Squats';
      break;
    default:
      exerciseName = 'Exercise';
  }

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'full': return '#30d158';
      case 'good': return '#32d74b';
      case 'partial': return '#ff9f0a';
      case 'poor': return '#ff453a';
      default: return '#8e8e93';
    }
  };

  const getQualityLabel = (quality) => {
    switch (quality) {
      case 'full': return 'Full';
      case 'good': return 'Good';
      case 'partial': return 'Partial';
      case 'poor': return 'Poor';
      default: return quality;
    }
  };

  const getScoreGrade = (score) => {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  };

  return (
    <div className="workout-summary">
      <div className="summary-container">
        <div className="summary-header">
          <h2>Workout Complete!</h2>
          <p className="summary-exercise">{exerciseName} Session</p>
        </div>

        <div className="summary-stats">
          <div className="summary-stat-card">
            <div className="summary-stat-value">{data.total_reps}</div>
            <div className="summary-stat-label">Total Reps</div>
          </div>
          <div className="summary-stat-card">
            <div className="summary-stat-value">{data.avg_score.toFixed(0)}</div>
            <div className="summary-stat-label">Avg Score</div>
          </div>
          <div className="summary-stat-card">
            <div className="summary-stat-value">{data.avg_duration.toFixed(1)}s</div>
            <div className="summary-stat-label">Avg Duration</div>
          </div>
        </div>

        <div className="quality-breakdown">
          <h3>Quality Breakdown</h3>
          <div className="quality-bars">
            <div className="quality-bar">
              <span className="quality-label">Full Reps</span>
              <div className="quality-bar-bg">
                <div 
                  className="quality-bar-fill" 
                  style={{ 
                    width: `${(data.full_reps / data.total_reps) * 100}%`,
                    backgroundColor: '#30d158'
                  }}
                ></div>
              </div>
              <span className="quality-count">{data.full_reps}</span>
            </div>
            <div className="quality-bar">
              <span className="quality-label">Good Reps</span>
              <div className="quality-bar-bg">
                <div 
                  className="quality-bar-fill" 
                  style={{ 
                    width: `${(data.good_reps / data.total_reps) * 100}%`,
                    backgroundColor: '#32d74b'
                  }}
                ></div>
              </div>
              <span className="quality-count">{data.good_reps}</span>
            </div>
            <div className="quality-bar">
              <span className="quality-label">Partial Reps</span>
              <div className="quality-bar-bg">
                <div 
                  className="quality-bar-fill" 
                  style={{ 
                    width: `${(data.partial_reps / data.total_reps) * 100}%`,
                    backgroundColor: '#ff9f0a'
                  }}
                ></div>
              </div>
              <span className="quality-count">{data.partial_reps}</span>
            </div>
            <div className="quality-bar">
              <span className="quality-label">Poor Reps</span>
              <div className="quality-bar-bg">
                <div 
                  className="quality-bar-fill" 
                  style={{ 
                    width: `${(data.poor_reps / data.total_reps) * 100}%`,
                    backgroundColor: '#ff453a'
                  }}
                ></div>
              </div>
              <span className="quality-count">{data.poor_reps}</span>
            </div>
          </div>
        </div>

        {data.common_issues && data.common_issues.length > 0 && (
          <div className="common-issues">
            <h3>Common Issues</h3>
            <div className="issues-list">
              {data.common_issues.map(([issue, count]) => (
                <div key={issue} className="issue-item">
                  <span className="issue-text">{issue}</span>
                  <span className="issue-count">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="reps-list">
          <h3>Rep by Rep Breakdown</h3>
          <div className="reps-scroll">
            {data.reps_data && data.reps_data.map((rep) => (
              <div key={rep.rep_id} className="rep-card">
                <div className="rep-card-header">
                  <span className="rep-number">Rep #{rep.rep_id}</span>
                  <span 
                    className="rep-quality"
                    style={{ color: getQualityColor(rep.quality) }}
                  >
                    {getQualityLabel(rep.quality)}
                  </span>
                </div>
                <div className="rep-score">
                  <span className="score-label">Score:</span>
                  <span className="score-value">{rep.score}/100</span>
                  <span className="score-grade">{getScoreGrade(rep.score)}</span>
                </div>
                <div className="rep-duration">
                  <span className="duration-label">Duration:</span>
                  <span className="duration-value">{rep.duration.toFixed(2)}s</span>
                </div>
                {rep.flags && rep.flags.length > 0 && (
                  <div className="rep-issues">
                    {rep.flags.map((feedback, idx) => (
                      <span key={idx} className="rep-issue-tag">{feedback}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button className="close-summary-button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
};

export default WorkoutSummary;