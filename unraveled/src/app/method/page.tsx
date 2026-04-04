import type { Metadata } from 'next';
import { MethodContent } from './MethodContent';

export const metadata: Metadata = {
  title: 'Our Method — Unraveled',
  description: "How 65 specialized AI agents, adversarial debate, and cross-tradition cross-validation produce Unraveled's convergence scores. Full pipeline documentation.",
  openGraph: {
    type: 'article',
    title: 'The Unraveled Research Method',
    description: 'A 5-stage AI pipeline: source collection, 65-agent independent research, cross-validation, adversarial debate, and convergence scoring.',
    siteName: 'Unraveled',
  },
};

export default function MethodPage() {
  return <MethodContent />;
}
