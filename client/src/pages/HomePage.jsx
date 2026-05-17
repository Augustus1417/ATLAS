import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Eyebrow } from '../components/UI';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Fixed background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-20" />
        <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl opacity-10" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="min-h-screen w-full flex items-center justify-center px-4">
          <div className="max-w-4xl w-full text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/50">
                <span className="text-4xl font-bold text-white">A</span>
              </div>
            </div>

            {/* Main Headline */}
            <div>
              <Eyebrow>AI-Powered PC Building</Eyebrow>
              <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
                Build Your Perfect PC
              </h1>
              <p className="text-2xl text-white/60 max-w-2xl mx-auto">
                Automated Technology Lookup and Analysis Service. Get AI-powered
                recommendations tailored to your budget and workload.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Button
                onClick={() => navigate('/register')}
                size="lg"
                className="min-w-48"
              >
                Get Started
              </Button>
              <Button
                onClick={() => navigate('/login')}
                variant="secondary"
                size="lg"
                className="min-w-48"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="min-h-screen w-full flex items-center justify-center px-4 py-24">
          <div className="max-w-6xl w-full">
            <div className="text-center mb-16">
              <Eyebrow>Features</Eyebrow>
              <h2 className="text-5xl font-bold text-white mb-4">
                Everything You Need
              </h2>
              <p className="text-xl text-white/60">
                Comprehensive tools for PC builders at every level
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES.map((feature, i) => (
                <FeatureCard key={i} feature={feature} />
              ))}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="min-h-screen w-full flex items-center justify-center px-4 py-24">
          <div className="max-w-6xl w-full">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
              {STATS.map((stat, i) => (
                <div key={i} className="rounded-[2rem] p-1.5 bg-white/8 border border-white/20 hover:border-white/30 transition-all duration-500">
                  <div className="rounded-[calc(2rem-0.375rem)] bg-black/30 backdrop-blur-lg p-8 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] space-y-3">
                    <div className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-purple-500 to-blue-600 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-lg text-white/70 font-medium tracking-wide">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="min-h-screen w-full flex items-center justify-center px-4">
          <div className="max-w-3xl w-full text-center space-y-8">
            <h2 className="text-5xl font-bold text-white">Ready to Start?</h2>
            <p className="text-xl text-white/60">
              Join thousands of PC builders who are using ATLAS to find the
              perfect components for their builds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate('/register')}
                size="lg"
                className="min-w-48"
              >
                Create Account
              </Button>
              <Button
                onClick={() => navigate('/login')}
                variant="secondary"
                size="lg"
                className="min-w-48"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ feature }) {
  return (
    <div className="rounded-[2rem] p-1.5 bg-white/8 border border-white/20 hover:border-white/30 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-purple-500/15">
      <div className="rounded-[calc(2rem-0.375rem)] bg-black/30 backdrop-blur-lg p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] space-y-4">
        <div className="text-5xl group-hover:scale-110 transition-transform duration-500">{feature.icon}</div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors duration-300">
            {feature.title}
          </h3>
          <p className="text-base text-white/70 leading-relaxed">{feature.description}</p>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI Recommendations',
    description:
      'Get personalized component recommendations based on your budget and workload.',
  },
  {
    icon: '🔨',
    title: 'PC Builder',
    description:
      'Drag-and-drop interface to build your perfect PC with real-time price tracking.',
  },
  {
    icon: '💾',
    title: 'Component Library',
    description:
      'Access a comprehensive database of thousands of PC components.',
  },
  {
    icon: '📊',
    title: 'Price Tracking',
    description:
      'Monitor prices across multiple retailers and get alerts on deals.',
  },
];

const STATS = [
  { value: '10K+', label: 'Components' },
  { value: '500+', label: 'Brands' },
  { value: '100K+', label: 'Builds Created' },
  { value: '50K+', label: 'Active Users' },
];
