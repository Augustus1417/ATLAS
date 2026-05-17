import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { builderAPI, buildsAPI, compatibilityAPI } from '../utils/api';
import {
  formatPrice,
  getPartPrice,
  getComponentLink,
  getComponentStore,
  openComponentLink,
  normalizePartsByCategory,
} from '../utils/format';
import PageLayout from '../components/PageLayout';
import {
  Button,
  Card,
  Input,
  Select,
  SectionHeading,
  Skeleton,
} from '../components/UI';

export function BuilderPage() {
  const navigate = useNavigate();
  const [buildName, setBuildName] = useState('');
  const [workload, setWorkload] = useState('gaming');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState({});
  const [allParts, setAllParts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [compatibilityIssues, setCompatibilityIssues] = useState([]);
  const [errors, setErrors] = useState({});

  const CATEGORIES = [
    'Case',
    'Motherboard',
    'CPU',
    'RAM',
    'Storage',
    'GPU',
    'PSU',
    'Cooling',
  ];

  useEffect(() => {
    loadParts();
  }, []);

  const loadParts = async () => {
    try {
      setLoading(true);
      const { data } = await builderAPI.getPartsByCategory();
      setAllParts(normalizePartsByCategory(data.data || {}));
    } catch (error) {
      console.error('Failed to load parts:', error);
      setErrors({ submit: 'Failed to load components' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComponent = async (category, component) => {
    const newSelection = {
      ...selectedComponents,
      [category]: { ...component, price: getPartPrice(component) },
    };
    setSelectedComponents(newSelection);

    // Check compatibility
    await checkCompatibility(newSelection);
  };

  const handleRemoveComponent = (category) => {
    const newSelection = { ...selectedComponents };
    delete newSelection[category];
    setSelectedComponents(newSelection);
  };

  const checkCompatibility = async (selection) => {
    const componentIds = Object.values(selection).map((c) => c.component_id);
    if (componentIds.length < 2) {
      setCompatibilityIssues([]);
      return;
    }

    try {
      const { data } = await compatibilityAPI.check(componentIds);
      if (!data.data.compatible) {
        setCompatibilityIssues(data.data.conflicts || []);
      } else {
        setCompatibilityIssues([]);
      }
    } catch (error) {
      console.error('Compatibility check failed:', error);
    }
  };

  const getTotalPrice = () =>
    Object.values(selectedComponents).reduce(
      (sum, c) => sum + (getPartPrice(c) || 0),
      0
    );

  const handleSaveBuild = async () => {
    setErrors({});

    if (!buildName.trim()) {
      setErrors({ buildName: 'Build name is required' });
      return;
    }

    if (Object.keys(selectedComponents).length === 0) {
      setErrors({
        submit: 'Please select at least one component',
      });
      return;
    }

    const missingPrices = Object.entries(selectedComponents).filter(
      ([, c]) => !getPartPrice(c)
    );
    if (missingPrices.length > 0) {
      setErrors({
        submit: `Missing prices for: ${missingPrices.map(([cat]) => cat).join(', ')}`,
      });
      return;
    }

    setSaving(true);

    try {
      const buildData = {
        build_name: buildName,
        intended_workload: workload,
        is_public: isPublic,
        components: Object.values(selectedComponents).map((c) => ({
          component_id: c.component_id,
          quantity: 1,
          price_at_save: getPartPrice(c),
        })),
      };

      const { data } = await buildsAPI.create(buildData);
      navigate(`/builds/${data.data.build_id}`, {
        state: { message: 'Build created successfully!' },
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
          eyebrow="Custom Configuration"
          title="Build Your PC"
          description="Select components to create your ideal build"
        />

        {errors.submit && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
            {errors.submit}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {Array(4).fill(0).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-32 w-full" />
                </Card>
              ))}
            </div>
            <Card>
              <Skeleton className="h-64 w-full" />
            </Card>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Component Selection */}
          <div className="lg:col-span-2 space-y-6">
            {CATEGORIES.map((category) => (
              <Card key={category}>
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">
                    {category}
                  </h3>

                  {selectedComponents[category] ? (
                    <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-white/10 flex justify-between items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium">
                          {selectedComponents[category].name}
                        </p>
                        <p className="text-white/60 text-sm">
                          {formatPrice(selectedComponents[category])}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getComponentLink(selectedComponents[category]) && (
                          <button
                            type="button"
                            title={`View on ${getComponentStore(selectedComponents[category]) || 'store'}`}
                            onClick={() =>
                              openComponentLink(selectedComponents[category])
                            }
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-violet-300 border border-violet-500/30 hover:bg-violet-500/10"
                          >
                            Link
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(category)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1"
                          aria-label="Remove component"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(allParts[category] || []).length === 0 && (
                        <p className="text-white/40 text-sm py-2">No parts available</p>
                      )}
                      {(allParts[category] || []).map((part) => {
                        const partLink = getComponentLink(part);
                        return (
                          <div
                            key={part.component_id}
                            className="flex gap-2 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (partLink) openComponentLink(part);
                              }}
                              disabled={!partLink}
                              className={`flex-1 text-left min-w-0 group ${
                                partLink ? 'cursor-pointer' : 'cursor-default opacity-80'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <p className="text-white font-medium group-hover:text-violet-300 transition-colors truncate">
                                    {part.name}
                                  </p>
                                  <p className="text-white/60 text-sm truncate">{part.brand}</p>
                                  {partLink && (
                                    <p className="text-violet-300/80 text-xs mt-1">
                                      View listing →
                                    </p>
                                  )}
                                </div>
                                <p className="text-violet-300 font-semibold text-sm shrink-0">
                                  {formatPrice(part)}
                                </p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddComponent(category, part)}
                              className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600/80 hover:bg-violet-600 border border-violet-500/40"
                            >
                              Add
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Build Summary */}
          <div className="space-y-6">
            {/* Build Info */}
            <Card>
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Build Summary</h3>

                <Input
                  label="Build Name"
                  placeholder="e.g., Gaming Beast"
                  value={buildName}
                  onChange={(e) => setBuildName(e.target.value)}
                  error={errors.buildName}
                />

                <Select
                  label="Intended Workload"
                  value={workload}
                  onChange={(e) => setWorkload(e.target.value)}
                  options={[
                    { value: 'gaming', label: 'Gaming' },
                    { value: 'streaming', label: 'Streaming' },
                    { value: 'content_creation', label: 'Content Creation' },
                    { value: 'productivity', label: 'Productivity' },
                    { value: 'workstation', label: 'Workstation' },
                  ]}
                />

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-white/80">Make this build public</span>
                </label>
              </div>
            </Card>

            {/* Price Summary */}
            <Card>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-white/60">Selected Components:</span>
                  <span className="text-white font-medium">
                    {Object.keys(selectedComponents).length}
                  </span>
                </div>

                <div className="space-y-2">
                  {Object.entries(selectedComponents).map(
                    ([category, component]) => (
                      <div
                        key={category}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-white/60">{category}:</span>
                        <span className="text-white/80">
                          {formatPrice(component)}
                        </span>
                      </div>
                    )
                  )}
                </div>

                {Object.keys(selectedComponents).length > 0 && (
                  <>
                    <div className="h-px bg-white/10" />
                    <div className="flex justify-between items-center">
                      <span className="text-white font-semibold">
                        Total Price:
                      </span>
                      <span className="text-2xl font-bold text-purple-300">
                        {formatPrice(getTotalPrice())}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Compatibility Issues */}
            {compatibilityIssues.length > 0 && (
              <Card className="border-red-500/30 bg-red-500/5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">⚠</span>
                    <h4 className="text-white font-semibold">
                      Compatibility Issues
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {compatibilityIssues.map((issue, i) => (
                      <p key={i} className="text-red-300 text-sm">
                        {issue.reason}
                      </p>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleSaveBuild}
                loading={saving}
                className="w-full"
                disabled={Object.keys(selectedComponents).length === 0}
              >
                Save Build
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setBuildName('');
                  setSelectedComponents({});
                  setCompatibilityIssues([]);
                }}
                className="w-full"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
        )}
      </PageLayout>
  );
}
