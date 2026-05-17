import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommendationsAPI, buildsAPI } from '../utils/api';
import { formatPrice, getPartPrice } from '../utils/format';
import PageLayout from '../components/PageLayout';
import { RecommendedPartCard } from '../components/RecommendedPartCard';
import {
  Button,
  Card,
  Input,
  Select,
  SectionHeading,
} from '../components/UI';

const partSelection = (component) => ({
  category: component.category,
  name: component.name,
});

export function RecommendationsPage() {
  const navigate = useNavigate();
  const [budget, setBudget] = useState('150000');
  const [workload, setWorkload] = useState('gaming');
  const [deviceType, setDeviceType] = useState('desktop');
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [buildName, setBuildName] = useState('');
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [regeneratingCategory, setRegeneratingCategory] = useState(null);

  const applyRecommendationPayload = (payload) => {
    const components = payload.components || payload.parts || [];
    setRecommendation({ ...payload, components });
  };

  const handleGenerateRecommendation = async () => {
    setErrors({});

    if (!budget || budget < 10000) {
      setErrors({ budget: 'Budget must be at least ₱10,000' });
      return;
    }

    setLoading(true);

    try {
      const { data } = await recommendationsAPI.generate({
        budget_php: parseInt(budget),
        workload,
        device_type: deviceType,
      });

      applyRecommendationPayload(data.data || {});
      setBuildName(`${workload.toUpperCase()} Build - ₱${parseInt(budget).toLocaleString()}`);
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.message ||
          'Failed to generate recommendations',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAll = async () => {
    if (!recommendation?.components?.length) return;

    setRegeneratingAll(true);
    setErrors({});

    try {
      const { data } = await recommendationsAPI.generate({
        budget_php: parseInt(budget, 10),
        workload,
        device_type: deviceType,
        regenerate: true,
        avoid_parts: recommendation.components.map(partSelection),
      });
      applyRecommendationPayload(data.data || {});
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.message ||
          error.response?.data?.detail ||
          'Failed to regenerate build',
      });
    } finally {
      setRegeneratingAll(false);
    }
  };

  const handleRegeneratePart = async (category) => {
    if (!recommendation?.components?.length) return;

    setRegeneratingCategory(category);
    setErrors({});

    const locked = recommendation.components
      .filter((c) => c.category !== category)
      .map(partSelection);
    const avoid = recommendation.components
      .filter((c) => c.category === category)
      .map(partSelection);

    try {
      const { data } = await recommendationsAPI.generate({
        budget_php: parseInt(budget, 10),
        workload,
        device_type: deviceType,
        regenerate_category: category,
        locked_parts: locked,
        avoid_parts: avoid,
      });
      applyRecommendationPayload(data.data || {});
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.message ||
          error.response?.data?.detail ||
          'Failed to regenerate this part',
      });
    } finally {
      setRegeneratingCategory(null);
    }
  };

  const handleSaveRecommendedBuild = async () => {
    if (!buildName.trim()) {
      setErrors({ buildName: 'Build name is required' });
      return;
    }

    const saveable = recommendation.components.filter(
      (c) => c.component_id && getPartPrice(c)
    );
    if (saveable.length === 0) {
      setErrors({ submit: 'No priced components to save. Try generating again.' });
      return;
    }

    setSaving(true);

    try {
      const buildData = {
        build_name: buildName,
        intended_workload: workload,
        is_public: false,
        components: saveable.map((c) => ({
            component_id: c.component_id,
            quantity: 1,
            price_at_save: getPartPrice(c),
          })),
      };

      const { data } = await buildsAPI.create(buildData);
      navigate(`/builds/${data.data.build_id}`, {
        state: { message: 'Recommended build saved successfully!' },
      });
    } catch (error) {
      setErrors({
        submit: error.response?.data?.message || 'Failed to save build',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout>
      <SectionHeading
        eyebrow="AI-Powered"
        title="Get Recommendations"
        description="Let our AI suggest the perfect components for your needs"
      />

      {errors.submit && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200">
          {errors.submit}
        </div>
      )}

      {!recommendation ? (
        // Input Form
        <Card className="max-w-2xl">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">
              Tell Us Your Needs
            </h2>

            <Input
              label="Budget (PHP)"
              type="number"
              min="10000"
              step="5000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              error={errors.budget}
              placeholder="e.g., 150000"
            />

            <Select
              label="Workload Type"
              value={workload}
              onChange={(e) => setWorkload(e.target.value)}
              options={[
                { value: 'gaming', label: '🎮 Gaming' },
                { value: 'streaming', label: '📡 Streaming' },
                {
                  value: 'content_creation',
                  label: '🎬 Content Creation',
                },
                { value: 'productivity', label: '💼 Productivity' },
                { value: 'workstation', label: '🖥️ Workstation' },
              ]}
            />

            <Select
              label="Device Type"
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              options={[
                { value: 'desktop', label: 'Desktop' },
                { value: 'laptop', label: 'Laptop' },
              ]}
            />

            <Button
              onClick={handleGenerateRecommendation}
              loading={loading}
              size="lg"
              className="w-full"
            >
              Generate Recommendations
            </Button>
          </div>
        </Card>
      ) : (
        // Recommendation Results
        <div className="space-y-8 pb-20">
          {/* Summary */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <p className="text-white/60 text-sm max-w-md">
                Not happy with this build? Regenerate the full list or swap individual parts.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={regeneratingAll}
                disabled={Boolean(regeneratingCategory)}
                onClick={handleRegenerateAll}
                className="shrink-0"
              >
                Regenerate build
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-white/60 text-sm uppercase tracking-wide font-bold">
                  Recommended Budget
                </p>
                <p className="text-3xl font-bold text-purple-300 mt-3">
                  ₱{parseInt(budget).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-sm uppercase tracking-wide font-bold">
                  Estimated Total
                </p>
                <p className="text-3xl font-bold text-white mt-3">
                  {formatPrice(
                    recommendation.estimated_total_php ??
                      recommendation.components.reduce(
                        (sum, c) => sum + (getPartPrice(c) || 0),
                        0
                      )
                  )}
                </p>
              </div>
              <div>
                <p className="text-white/60 text-sm uppercase tracking-wide font-bold">
                  Budget Used
                </p>
                <p className="text-3xl font-bold text-blue-300 mt-3">
                  {(() => {
                    const budgetNum = parseInt(budget, 10) || 1;
                    const total =
                      recommendation.estimated_total_php ??
                      recommendation.components.reduce(
                        (sum, c) => sum + (getPartPrice(c) || 0),
                        0
                      );
                    return `${Math.round((total / budgetNum) * 100)}%`;
                  })()}
                </p>
              </div>
            </div>
            {(() => {
              const budgetNum = parseInt(budget, 10) || 1;
              const total =
                recommendation.estimated_total_php ??
                recommendation.components.reduce(
                  (sum, c) => sum + (getPartPrice(c) || 0),
                  0
                );
              if (total / budgetNum >= 0.85) return null;
              return (
                <p className="text-amber-200/90 text-sm mt-4 border-t border-white/10 pt-4">
                  This build uses less than 85% of your budget. Use{' '}
                  <span className="text-white font-medium">Regenerate build</span> for a
                  higher-tier alternative.
                </p>
              );
            })()}
          </Card>

          {/* Recommendation Reason */}
          {recommendation.reason && (
            <Card>
              <div>
                <h3 className="text-lg font-bold text-white mb-3">
                  Why This Build?
                </h3>
                <p className="text-white/70 text-base leading-relaxed">{recommendation.reason}</p>
              </div>
            </Card>
          )}

          {/* Components */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">
              Recommended Components
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendation.components.map((component, index) => (
                <RecommendedPartCard
                  key={component.component_id ?? `${component.name}-${index}`}
                  component={component}
                  index={index}
                  onRegenerate={handleRegeneratePart}
                  regenerating={regeneratingCategory === component.category}
                />
              ))}
            </div>
          </div>

          {/* Save Build */}
          <Card className="bg-gradient-to-r from-purple-500/10 to-blue-600/10 border-white/20">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">Save This Build</h3>

              <Input
                label="Build Name"
                value={buildName}
                onChange={(e) => setBuildName(e.target.value)}
                error={errors.buildName}
                placeholder="e.g., My Gaming Build"
              />

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleSaveRecommendedBuild}
                  loading={saving}
                  className="flex-1"
                >
                  Save Build
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setRecommendation(null)}
                  className="flex-1"
                >
                  New Recommendation
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}
