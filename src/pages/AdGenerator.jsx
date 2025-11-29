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
      <div className="ad-generator-coming-soon">
        <div className="coming-soon-content">
          <Sparkles size={64} className="coming-soon-icon" />
          <h2>Coming Soon</h2>
          <p>We're working hard to bring you an amazing AI-powered ad generator.</p>
          <p className="coming-soon-subtitle">Stay tuned for updates!</p>
        </div>
      </div>
    </PageLayout>
  );
}

