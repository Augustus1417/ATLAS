import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { componentsAPI } from '../utils/api';
import {
  formatPrice,
  getPartPrice,
  getComponentLink,
  getComponentStore,
  openComponentLink,
} from '../utils/format';
import PageLayout from '../components/PageLayout';
import { Card, Badge, Eyebrow, Button, Skeleton } from '../components/UI';

export function ComponentsPage() {
  const [components, setComponents] = useState([]);
  const [filteredComponents, setFilteredComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadComponents();
  }, []);

  useEffect(() => {
    filterComponents();
  }, [selectedCategory, searchQuery, components]);

  const loadComponents = async () => {
    try {
      setLoading(true);
      const { data } = await componentsAPI.getAll({});
      const componentsList = data.data || [];
      setComponents(componentsList);

      // Extract unique categories
      const uniqueCategories = [...new Set(componentsList.map((c) => c.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Failed to load components:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterComponents = () => {
    let filtered = components;

    if (selectedCategory) {
      filtered = filtered.filter((c) => c.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.brand.toLowerCase().includes(query)
      );
    }

    setFilteredComponents(filtered);
  };

  return (
    <PageLayout>
      <div className="space-y-12 pb-16">
        {/* Header */}
        <div>
          <Eyebrow>Component Library</Eyebrow>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Explore Components
          </h1>
          <p className="text-xl text-white/60">
            Browse our comprehensive database of PC components
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search components by name or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900">
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-white/60">
            Showing {filteredComponents.length} of {components.length} components
          </p>
        </div>

        {/* Components Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-64 w-full" />
              </Card>
            ))}
          </div>
        ) : filteredComponents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredComponents.map((component) => (
              <ComponentCard key={component.component_id} component={component} />
            ))}
          </div>
        ) : (
          <Card className="py-12">
            <div className="text-center">
              <p className="text-white/60 mb-4">
                No components found matching your search.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}

function ComponentCard({ component }) {
  const navigate = useNavigate();
  const priceLabel = getPartPrice(component) ? formatPrice(component) : null;
  const hasLink = Boolean(getComponentLink(component));

  return (
    <Card
      className="cursor-pointer group hover:border-white/20 transition-all duration-300 overflow-hidden h-full"
      onClick={() => {
        if (!openComponentLink(component)) {
          navigate(`/component/${component.component_id}`);
        }
      }}
    >
      <div className="flex flex-col gap-4 h-full">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="default" size="sm">
              {component.category}
            </Badge>
            <h3 className="text-lg font-bold text-white mt-2 group-hover:text-purple-300 transition-colors">
              {component.name}
            </h3>
          </div>
        </div>

        <p className="text-white/60 text-sm flex-1">{component.brand}</p>

        {priceLabel && (
          <p className="text-purple-300 font-semibold text-sm">{priceLabel}</p>
        )}

        <div className="space-y-1 pt-4 border-t border-white/5">
          {component.release_year && (
            <p className="text-xs text-white/40">
              Released: {component.release_year}
            </p>
          )}
          {component.form_factor && (
            <p className="text-xs text-white/40">
              Form Factor: {component.form_factor}
            </p>
          )}
          <p className="text-xs text-white/40 mt-2">
            {component.is_active ? (
              <span className="text-green-400">✓ Active</span>
            ) : (
              <span className="text-red-400">✗ Inactive</span>
            )}
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            if (!openComponentLink(component)) {
              navigate(`/component/${component.component_id}`);
            }
          }}
        >
          {hasLink
            ? `View at ${getComponentStore(component) || 'store'}`
            : 'View details'}
        </Button>
      </div>
    </Card>
  );
}

// Component detail page
export function ComponentDetailPage() {
  const { id } = useParams();
  const [component, setComponent] = useState(null);
  const [specs, setSpecs] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('specs');

  useEffect(() => {
    loadComponentDetails();
  }, [id]);

  const loadComponentDetails = async () => {
    try {
      setLoading(true);
      const { data: componentData } = await componentsAPI.getById(id);
      setComponent(componentData.data);

      const { data: specsData } = await componentsAPI.getSpecs(id);
      setSpecs(specsData.data || []);

      const { data: pricingData } = await componentsAPI.getPricing(id);
      setPricing(pricingData.data || []);
    } catch (error) {
      console.error('Failed to load component details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
      </PageLayout>
    );
  }

  if (!component) {
    return (
      <PageLayout>
        <Card>
          <p className="text-white text-center">Component not found</p>
        </Card>
      </PageLayout>
    );
  }

  const listingTarget = {
    ...component.component,
    latest_price: component.latest_price,
    link: component.latest_price?.link,
    store: component.latest_price?.store,
    price: component.latest_price?.price,
  };
  const listingLink = getComponentLink(listingTarget);
  const listingStore = getComponentStore(listingTarget);

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto pb-16">
        <Card className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Info */}
            <div>
              <Badge variant="default">{component.component.category}</Badge>
              <h1 className="text-4xl font-bold text-white mt-4">
                {component.component.name}
              </h1>
              <p className="text-xl text-white/60 mt-2">
                {component.component.brand}
              </p>
              <div className="mt-6 space-y-2">
                {component.component.release_year && (
                  <p className="text-white/60">
                    Released: {component.component.release_year}
                  </p>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="flex flex-col justify-center gap-4">
              {component.latest_price ? (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-white/10">
                  <p className="text-white/60 text-sm">Latest price</p>
                  <p className="text-4xl font-bold text-white mt-2">
                    ₱{component.latest_price.price.toLocaleString()}
                  </p>
                  {listingStore && (
                    <p className="text-white/50 text-sm mt-2">
                      Sold by {listingStore}
                    </p>
                  )}
                  <p className="text-white/40 text-xs mt-1">
                    Updated{' '}
                    {new Date(
                      component.latest_price.recorded_at
                    ).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-white/60">No pricing data available</p>
              )}
              {listingLink && (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => openComponentLink(listingTarget)}
                >
                  View listing{listingStore ? ` on ${listingStore}` : ''}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('specs')}
            className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
              activeTab === 'specs'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Specifications
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
              activeTab === 'pricing'
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Pricing History
          </button>
        </div>

        {/* Content */}
        <Card>
          {activeTab === 'specs' ? (
            <div className="space-y-4">
              {specs.length > 0 ? (
                specs.map((spec) => (
                  <div
                    key={spec.spec_id}
                    className="flex justify-between items-center pb-4 border-b border-white/5 last:border-0"
                  >
                    <span className="text-white/60">{spec.spec_name}</span>
                    <span className="text-white font-medium">
                      {spec.spec_value}
                      {spec.unit && ` ${spec.unit}`}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-white/60">No specifications available</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {pricing.length > 0 ? (
                pricing.map((price) => (
                  <div
                    key={price.price_id}
                    role={price.link?.startsWith('http') ? 'link' : undefined}
                    tabIndex={price.link?.startsWith('http') ? 0 : undefined}
                    onClick={() => {
                      if (price.link?.startsWith('http')) {
                        window.open(price.link, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        price.link?.startsWith('http') &&
                        (e.key === 'Enter' || e.key === ' ')
                      ) {
                        e.preventDefault();
                        window.open(price.link, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className={`flex justify-between items-center pb-4 border-b border-white/5 last:border-0 rounded-lg -mx-2 px-2 ${
                      price.link?.startsWith('http')
                        ? 'hover:bg-white/5 cursor-pointer'
                        : ''
                    }`}
                  >
                    <div>
                      <p className="text-white">
                        ₱{price.price.toLocaleString()}
                      </p>
                      <p className="text-white/40 text-sm">
                        {new Date(price.recorded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-white/60 text-sm">
                      {price.store || 'Unknown store'}
                      {price.link?.startsWith('http') ? ' →' : ''}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-white/60">No pricing history available</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
