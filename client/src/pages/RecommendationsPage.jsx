import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommendationsAPI, buildsAPI } from '../utils/api';
import {
  formatPrice,
  getPartPrice,
  getComponentLink,
  getComponentStore,
  openComponentLink,
} from '../utils/format';
import PageLayout from '../components/PageLayout';
import {
  Button,
  Card,
  Input,
  Select,
  Badge,
  Eyebrow,
  SectionHeading,
} from '../components/UI';

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

      const payload = data.data || {};
      const components = payload.components || payload.parts || [];
      setRecommendation({ ...payload, components });
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
                  Components Selected
                </p>
                <p className="text-3xl font-bold text-blue-300 mt-3">
                  {recommendation.components.length}
                </p>
              </div>
            </div>
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
              {recommendation.components.map((component, index) => {
                const hasLink = Boolean(getComponentLink(component));
                const store = getComponentStore(component);
                return (
                <Card
                  key={component.component_id ?? `${component.name}-${index}`}
                  className={`transition-all duration-300 group ${
                    hasLink
                      ? 'cursor-pointer hover:border-violet-400/40 hover:bg-white/[0.07]'
                      : ''
                  }`}
                  onClick={() => {
                    if (hasLink) openComponentLink(component);
                  }}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="default" size="sm">
                          {component.category}
                        </Badge>
                        <h4 className="text-lg font-bold text-white mt-2 group-hover:text-purple-300 transition-colors">
                          {component.name}
                        </h4>
                      </div>
                    </div>

                    <p className="text-white/60 text-sm">{component.brand}</p>

                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-sm font-medium">Price:</span>
                        <span className="text-white font-semibold">
                          {formatPrice(component)}
                        </span>
                      </div>
                      {hasLink ? (
                        <p className="text-violet-300 text-sm font-medium">
                          Click to view on {store || 'retailer'} →
                        </p>
                      ) : (
                        <p className="text-white/40 text-xs">No listing link available</p>
                      )}
                    </div>

                    {component.reason && (
                      <div className="p-3 rounded-lg bg-blue-500/15 border border-blue-500/30">
                        <p className="text-blue-200 text-sm leading-relaxed">
                          💡 {component.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
              })}
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
