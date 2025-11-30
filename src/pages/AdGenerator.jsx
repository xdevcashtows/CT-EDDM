import React from 'react';
import { Sparkles } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import './AdGenerator.css';

export default function AdGenerator() {
  return (
    <PageLayout
      title="AI Ad Generator"
      subtitle="Create professional advertisements with AI-powered design"
    >
      <div className="ad-generator-page">
        <div className="ad-generator-empty-state">
          <Sparkles size={48} className="ad-generator-empty-icon" />
          <h2>Coming Soon</h2>
          <p>We're working hard to bring you an amazing AI-powered ad generator.</p>
        </div>
      </div>
    </PageLayout>
  );
}

