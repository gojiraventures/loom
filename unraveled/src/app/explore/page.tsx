import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ExploreClient } from './ExploreClient';

export const metadata = {
  title: 'Relationships — UnraveledTruth',
  description: 'Interactive relationship graph — navigate people and institutions across time.',
};

export default function ExplorePage() {
  return (
    <div className="min-h-screen flex flex-col bg-ground">
      <Header />
      <main className="flex-1 flex flex-col min-h-0">
        <ExploreClient />
      </main>
      <Footer />
    </div>
  );
}
