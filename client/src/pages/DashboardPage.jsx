import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import { componentsAPI } from '../utils/api';
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
  Badge,
  Eyebrow,
  SectionHeading,
  BentoGrid,
  Skeleton,
} from '../components/UI';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalComponents: 0,
    categories: 0,
    brands: 0,
  });

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      setLoading(true);
      const { data } = await componentsAPI.getAll({});
      const componentsList = data.data || [];
      setComponents(componentsList.slice(0, 6));
      const categories = new Set(componentsList.map((c) => c.category));
      const brands = new Set(componentsList.map((c) => c.brand));
      setStats({
        totalComponents: componentsList.length,
        categories: categories.size,
        brands: brands.size,
      });
    } catch (error) {
      console.error('Failed to load components:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="space-y-14 lg:space-y-16">
        {/* Hero */}
        <section className="max-w-3xl">
          <Eyebrow>Welcome back</Eyebrow>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            Hi, {user?.username || 'User'} 👋
          </h1>
          <p className="text-base sm:text-lg text-white/60 leading-relaxed mb-8 max-w-2xl">
            Your AI-powered PC building assistant is ready. Explore components,
            build your dream setup, or get personalized recommendations.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <Button size="lg" onClick={() => navigate('/builder')}>
              Build your PC
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/recommendations')}
            >
              Get recommendations
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/components')}
            >
              Explore components
            </Button>
          </div>
        </section>

        {/* Stats */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-6">
            {[
              { label: 'Total components', value: stats.totalComponents },
              { label: 'Categories', value: stats.categories },
              { label: 'Brands', value: stats.brands },
            ].map((stat) => (
              <Card key={stat.label} className="!p-6 lg:!p-8">
                <div className="flex flex-col items-center text-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/45">
                    {stat.label}
                  </p>
                  {loading ? (
                    <Skeleton className="h-10 w-20" />
                  ) : (
                    <p className="text-4xl lg:text-5xl font-bold text-white tabular-nums">
                      {stat.value}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Featured components */}
        <section>
          <SectionHeading
            eyebrow="Latest additions"
            title="Featured components"
            description="Browse our latest available components for your builds"
          />

          {loading ? (
            <BentoGrid>
              {Array(6).fill(0).map((_, i) => (
                <Card key={i} className="!p-6">
                  <Skeleton className="h-40 w-full" />
                </Card>
              ))}
            </BentoGrid>
          ) : components.length > 0 ? (
            <BentoGrid>
              {components.map((component) => {
                const hasLink = Boolean(getComponentLink(component));
                return (
                <Card
                  key={component.component_id}
                  className="cursor-pointer group !p-6 hover:border-white/20 transition-colors"
                  onClick={() => {
                    if (!openComponentLink(component)) {
                      navigate(`/component/${component.component_id}`);
                    }
                  }}
                >
                  <div className="flex flex-col gap-4 min-h-[140px]">
                    <div className="space-y-2">
                      <Badge variant="default" size="sm">
                        {component.category}
                      </Badge>
                      <h3 className="text-base font-bold text-white leading-snug group-hover:text-violet-300 transition-colors line-clamp-2">
                        {component.name}
                      </h3>
                      <p className="text-sm text-white/50">{component.brand}</p>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-4 border-t border-white/10">
                      <span className="text-base font-semibold text-white">
                        {getPartPrice(component) ? (
                          formatPrice(component)
                        ) : (
                          <span className="text-sm font-normal text-white/40">
                            Price unavailable
                          </span>
                        )}
                      </span>
                      <Button
                        size="md"
                        variant="secondary"
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
                  </div>
                </Card>
              );
              })}
            </BentoGrid>
          ) : (
            <Card className="!p-10 text-center">
              <p className="text-white/50">No components available</p>
            </Card>
          )}
        </section>

        {/* CTA */}
        <section
          className="rounded-2xl px-8 py-10 lg:px-12 lg:py-14 text-center"
          style={{
            background:
              'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(37,99,235,0.12))',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Ready to build your PC?
          </h2>
          <p className="text-base text-white/55 mb-8 max-w-md mx-auto leading-relaxed">
            Use our AI-powered builder to get recommendations based on your
            budget and workload.
          </p>
          <Button size="lg" onClick={() => navigate('/builder')}>
            Start building
          </Button>
        </section>
      </div>
    </PageLayout>
  );
}
