import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { atlasApi } from '../services/atlasApi';
import { useAuth } from '../context/AuthContext';
import '../styles/wizard.css';

export default function AIWizard() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    budgetPhp: 30000,
    workload: 'gaming',
    deviceType: 'desktop'
  });
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    {
      id: 'budget',
      title: 'Set Your Budget',
      description: 'How much are you planning to spend on your build?',
      component: (
        <div className="wizard-input-group">
          <label>Budget (PHP)</label>
          <input
            type="number"
            value={formData.budgetPhp}
            onChange={(e) => setFormData({...formData, budgetPhp: Number(e.target.value)})}
            className="wizard-input"
          />
          <p className="hint">Suggested range: 15,000 - 200,000 PHP</p>
        </div>
      )
    },
    {
      id: 'workload',
      title: 'Define Your Workload',
      description: 'What will be the primary use of this PC?',
      component: (
        <div className="wizard-grid">
          {[
            { id: 'gaming', label: 'Gaming', desc: 'High FPS and Raytracing' },
            { id: 'editing', label: 'Editing', desc: '4K Video & 3D Rendering' },
            { id: 'general', label: 'General', desc: 'Office work and Browsing' },
            { id: 'student', label: 'Student', desc: 'Coding and Study' },
          ].map(option => (
            <div
              key={option.id}
              className={`wizard-option ${formData.workload === option.id ? 'active' : ''}`}
              onClick={() => setFormData({...formData, workload: option.id})}
            >
              <strong>{option.label}</strong>
              <p>{option.desc}</p>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'confirm',
      title: 'Finalize Request',
      description: 'Ready to generate your AI-optimized part list?',
      component: (
        <div className="wizard-summary">
          <div className="summary-item">Budget: <strong>{formData.budgetPhp.toLocaleString()} PHP</strong></div>
          <div className="summary-item">Workload: <strong>{formData.workload.toUpperCase()}</strong></div>
        </div>
      )
    }
  ];

  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await atlasApi.getRecommendations({
        budget_php: formData.budgetPhp,
        workload: formData.workload,
        device_type: formData.deviceType,
      }, token);
      setRecommendations(res);
      setStep(4); // Move to results page
    } catch (e) {
      setError(e.message || 'Failed to fetch AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (step === 4) {
    // Calculate cheapest price for each part
    const partsWithPricing = recommendations?.parts?.map((part) => {
      const cheapestListing = part.listings
        ?.filter(l => l.price !== null && l.price !== undefined)
        .sort((a, b) => (a.price || Infinity) - (b.price || Infinity))[0];
      return {
        ...part,
        cheapest_price: cheapestListing?.price,
        best_store: cheapestListing?.store,
        best_link: cheapestListing?.link,
      };
    }) || [];

    const totalPrice = partsWithPricing.reduce((sum, part) => sum + (part.cheapest_price || 0), 0);

    return (
      <div className="wizard-results">
        <div className="wizard-results-head">
          <p className="results-kicker">ATLAS AI RECOMMENDER</p>
          <h1>Your AI Recommendation</h1>
          <p className="results-subtitle">A generated build plan based on your budget and workload.</p>
        </div>
        <div className="results-grid">
          {partsWithPricing.map((part, i) => (
            <div key={i} className="rec-card">
              <span className="rec-cat">{part.category}</span>
              <span className="rec-name">{part.name}</span>
              <span className="rec-price">
                {part.cheapest_price ? `₱${part.cheapest_price.toLocaleString()}` : 'Price TBA'}
              </span>
              {part.best_store && (
                <span className="rec-store">
                  Best: <strong>{part.best_store}</strong>
                </span>
              )}
              {part.best_link && (
                <a href={part.best_link} target="_blank" rel="noopener noreferrer" className="rec-link" style={{
                  display: 'inline-block',
                  marginTop: '6px',
                  color: '#0096ff',
                  textDecoration: 'none',
                  fontSize: '11px'
                }}>
                  View on Store →
                </a>
              )}
            </div>
          ))}
        </div>
        <div className="results-footer">
          <p>Estimated Total: <strong>₱{totalPrice.toLocaleString()}</strong></p>
          <div className="results-actions">
            <button 
              className="btn-secondary" 
              onClick={() => setStep(0)}
            >
              ← Back to Wizard
            </button>
            <button 
              className="btn-primary" 
              onClick={() => navigate('/builder', { state: { recommendations: partsWithPricing } })}
            >
              Visualize in 3D Builder
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-container">
      <div className="wizard-progress">
        {steps.map((s, i) => (
          <div key={s.id} className={`progress-dot ${i <= step ? 'active' : ''}`} />
        ))}
      </div>

      <div className="wizard-card">
        <div className="wizard-brand">ATLAS</div>
        <h2>{steps[step].title}</h2>
        <p>{steps[step].description}</p>
        {error ? <div className="wizard-error">{error}</div> : null}
        <div className="wizard-content">
          {steps[step].component}
        </div>

        <div className="wizard-nav">
          <button
            className="btn-secondary"
            disabled={step === 0}
            onClick={() => setStep(s => s - 1)}
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button className="btn-primary" onClick={() => setStep(s => s + 1)}>Next</button>
          ) : (
            <button className="btn-primary" onClick={fetchRecommendations} disabled={loading}>
              {loading ? 'Analyzing...' : 'Generate Build'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
