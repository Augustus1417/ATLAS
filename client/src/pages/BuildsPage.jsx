import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildsAPI } from '../utils/api';
import {
  formatPrice,
  getComponentLink,
  getComponentStore,
  openComponentLink,
} from '../utils/format';
import PageLayout from '../components/PageLayout';
import { Card, Badge, Button, Eyebrow, SectionHeading, Skeleton } from '../components/UI';

function getBuildComponentLabel(component) {
  return (
    component.component_name ||
    component.name ||
    `Component #${component.component_id}`
  );
}

function BuildComponentCard({ component, onOpenLink }) {
  const name = getBuildComponentLabel(component);
  const category = component.component_category || component.category || 'Component';
  const brand = component.component_brand || component.brand;
  const hasLink = Boolean(getComponentLink(component));
  const store = getComponentStore(component);
  const unitPrice = Number(component.price_at_save || 0);
  const qty = Number(component.quantity || 1);

  return (
    <Card
      className={`!p-5 transition-colors ${
        hasLink ? 'cursor-pointer hover:border-violet-400/40 hover:bg-white/[0.06]' : ''
      }`}
      onClick={() => {
        if (hasLink) onOpenLink(component);
      }}
    >
      <div className="space-y-3">
        <Badge variant="default" size="sm">
          {category}
        </Badge>
        <div>
          <h4 className="text-lg font-bold text-white leading-snug">{name}</h4>
          {brand && <p className="text-white/55 text-sm mt-1">{brand}</p>}
          <p className="text-white/45 text-xs mt-1">Qty: {qty}</p>
        </div>

        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Unit price</span>
            <span className="text-white">{formatPrice(unitPrice)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-white/80">Subtotal</span>
            <span className="text-violet-300">{formatPrice(unitPrice * qty)}</span>
          </div>
          {hasLink ? (
            <p className="text-violet-300 text-xs font-medium pt-1">
              Click to view on {store || 'retailer'} →
            </p>
          ) : (
            <p className="text-white/35 text-xs pt-1">No listing link</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function BuildsPage() {
  const navigate = useNavigate();
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuilds();
  }, []);

  const loadBuilds = async () => {
    try {
      setLoading(true);
      const { data } = await buildsAPI.getAll({});
      setBuilds(data.data || []);
    } catch (error) {
      console.error('Failed to load builds:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="space-y-12 pb-16">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <Eyebrow>Your creations</Eyebrow>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              My Builds
            </h1>
          </div>
          <Button size="lg" onClick={() => navigate('/builder')}>
            New build
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-64 w-full" />
              </Card>
            ))}
          </div>
        ) : builds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {builds.map((build) => (
              <BuildCard
                key={build.build_id}
                build={build}
                onView={() => navigate(`/builds/${build.build_id}`)}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center !py-12">
            <p className="text-white/60 mb-6">You haven&apos;t created any builds yet.</p>
            <Button size="lg" onClick={() => navigate('/builder')}>
              Create your first build
            </Button>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}

function BuildCard({ build, onView }) {
  const totalPrice =
    build.total_price ??
    build.components?.reduce(
      (sum, c) => sum + Number(c.price_at_save || 0) * Number(c.quantity || 1),
      0
    ) ??
    0;

  const previewNames = (build.components || [])
    .slice(0, 3)
    .map((c) => getBuildComponentLabel(c))
    .join(', ');

  return (
    <Card
      className="cursor-pointer group hover:border-white/20 transition-all duration-300 !p-5"
      onClick={onView}
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between mb-2 gap-2">
            <Badge variant="default" size="sm">
              {build.intended_workload}
            </Badge>
            {build.is_public && (
              <Badge variant="success" size="sm">
                Public
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
            {build.build_name}
          </h3>
          {previewNames && (
            <p className="text-white/45 text-xs mt-2 line-clamp-2">{previewNames}</p>
          )}
        </div>

        <div className="space-y-2 pt-4 border-t border-white/10 text-sm">
          <div className="flex justify-between">
            <span className="text-white/60">Components</span>
            <span className="text-white">{build.components?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Total</span>
            <span className="text-white font-semibold">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Created</span>
            <span className="text-white/40">
              {new Date(build.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        <Button variant="secondary" size="md" className="w-full">
          View details
        </Button>
      </div>
    </Card>
  );
}

export function BuildDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [build, setBuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadBuildDetail();
  }, [id]);

  const loadBuildDetail = async () => {
    try {
      setLoading(true);
      const { data } = await buildsAPI.getById(id);
      setBuild(data.data);
    } catch (error) {
      console.error('Failed to load build:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this build?')) return;

    setDeleting(true);
    try {
      await buildsAPI.delete(id);
      navigate('/builds', { state: { message: 'Build deleted successfully' } });
    } catch {
      alert('Failed to delete build');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <Skeleton className="h-96 w-full max-w-3xl mx-auto" />
      </PageLayout>
    );
  }

  if (!build) {
    return (
      <PageLayout>
        <Card>
          <p className="text-white text-center">Build not found</p>
        </Card>
      </PageLayout>
    );
  }

  const totalPrice =
    build.total_price ??
    build.components?.reduce(
      (sum, c) => sum + Number(c.price_at_save || 0) * Number(c.quantity || 1),
      0
    ) ??
    0;

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto pb-16 space-y-8">
        <Button variant="ghost" onClick={() => navigate('/builds')} className="mb-2">
          ← Back to builds
        </Button>

        <div>
          <Eyebrow>Build details</Eyebrow>
          <h1 className="text-4xl font-bold text-white">{build.build_name}</h1>
        </div>

        <Card className="!p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-white/60 text-sm">Workload</p>
              <p className="text-xl font-bold text-white capitalize mt-1">
                {build.intended_workload}
              </p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Total price</p>
              <p className="text-xl font-bold text-violet-300 mt-1">
                {formatPrice(totalPrice)}
              </p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Components</p>
              <p className="text-xl font-bold text-white mt-1">
                {build.components?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-white/60 text-sm">Visibility</p>
              <p className="text-xl font-bold text-white mt-1">
                {build.is_public ? 'Public' : 'Private'}
              </p>
            </div>
          </div>
        </Card>

        <SectionHeading title="Selected components" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {build.components?.map((component) => (
            <BuildComponentCard
              key={component.build_component_id}
              component={component}
              onOpenLink={openComponentLink}
            />
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button
            size="lg"
            onClick={() => navigate(`/chat?build=${build.build_id}`)}
          >
            Discuss in chat
          </Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/builder')}>
            Create similar
          </Button>
          <Button size="lg" onClick={handleDelete} loading={deleting} variant="danger">
            Delete build
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
