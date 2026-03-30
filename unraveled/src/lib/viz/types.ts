export interface VizNarrative {
  id: string;
  lat: number;
  lng: number;
  year: number;       // negative = BCE
  title: string;
  region: string;
  type: 'textual' | 'archaeological' | 'geological' | 'oral_tradition';
  tradition: string;
  desc: string;
  source: string;
  radius?: number;
  spread?: { to: string; year: number }[];
}
