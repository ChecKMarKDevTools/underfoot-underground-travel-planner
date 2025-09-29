import { Place, DebugData } from '../types';

export const mockPlaces: Place[] = [
  {
    id: '1',
    name: 'The Neon Depths Beneath Tower Bridge',
    description:
      'Tower Bridge Road, London SE1 2UP • Ancient cyber-enhanced caverns where digital spirits guard quantum resonance crystals. Accessible through hidden maintenance tunnels during low tide.',
    latitude: 51.5055,
    longitude: -0.0754,
    category: 'underground',
    confidence: 0.94,
    historicalPeriod: 'Neo-Victorian Cyber Era',
    artifacts: [
      'Quantum Resonance Crystals',
      'Digital Spirit Anchors',
      'Cyber-Enhanced Navigation Stones',
    ],
    imageUrl:
      'https://images.unsplash.com/photo-1520637836862-4d197d17c90a?w=300&h=200&fit=crop&auto=format',
  },
  {
    id: '2',
    name: 'The Mystic Observatory of Silicon Dreams',
    description:
      'Thames Embankment, London EC4Y 0HT • A floating data nexus above the Thames where ancient algorithms merge with mystical sight. Best viewed during the digital aurora hours.',
    latitude: 51.5081,
    longitude: -0.0759,
    category: 'mystical',
    confidence: 0.89,
    historicalPeriod: 'Age of Digital Transcendence',
    artifacts: ['Holographic Star Charts', 'Reality Parsing Matrices', 'Dimensional Anchor Points'],
    imageUrl:
      'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=300&h=200&fit=crop&auto=format',
  },
  {
    id: '3',
    name: 'The Forgotten DataForge of Old London',
    description:
      "St. Paul's Churchyard, London EC4M 8AD • Ruins of the first cyber-magical foundry where reality was smithed into digital form. Enter through the concealed gear mechanism behind the cathedral.",
    latitude: 51.5126,
    longitude: -0.0991,
    category: 'ancient',
    confidence: 0.96,
    historicalPeriod: 'First Digital Awakening',
    artifacts: ['Memory Fragment Cores', 'Reality Smithing Tools', 'Glitch Pattern Catalysts'],
    imageUrl:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop&auto=format',
  },
  {
    id: '4',
    name: 'The Phantom Network Beneath Westminster',
    description:
      'Westminster Underground Station, London SW1A 0AA • A labyrinth of data streams flowing through abandoned tube tunnels. Access restricted to those who can perceive the quantum signatures.',
    latitude: 51.4994,
    longitude: -0.1247,
    category: 'forgotten',
    confidence: 0.82,
    historicalPeriod: 'Pre-Cyber Underground Era',
    artifacts: ['Soul Echo Streams', 'Parallel Dimension Keys', 'Phantom Network Nodes'],
    imageUrl:
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300&h=200&fit=crop&auto=format',
  },
];

export const generateMockDebugData = (query: string): DebugData => ({
  searchQuery: query,
  processingTime: Math.random() * 2000 + 500,
  confidence: Math.random() * 0.3 + 0.7,
  keywords: query
    .toLowerCase()
    .split(' ')
    .filter((word) => word.length > 2),
  geospatialData: {
    boundingBox: [51.4994, -0.1419, 51.5194, -0.1247],
    centerPoint: [51.5094, -0.1333],
    searchRadius: 5000,
  },
  llmReasoning: `The Stonewalker analyzed the query "${query}" by scanning the cyber-enhanced ley lines that pulse beneath reality's surface. Cross-referencing quantum probability matrices with digital spirit echoes revealed ${Math.floor(Math.random() * 4) + 1} potential nexus points. The search algorithm focused on areas where the digital realm bleeds through into physical space, creating anomalous readings in the neo-mystical detection grid.`,
  dataSource: [
    'Quantum Ley Line Scanner',
    'Digital Spirit Network',
    'Neo-Mystical Detection Grid',
    'Cyber-Enhanced Cartographic Database',
  ],
});

export const responses = [
  'Three locations pulse with unusual energy signatures. The Tower Bridge depths call strongest.',
  'I sense forgotten pathways beneath Westminster. Two sites show promising resonance patterns.',
  'Ancient algorithms converge on these coordinates. The data suggests hidden significance.',
  'Four nexus points detected. Study the confidence readings carefully before proceeding.',
  'Quantum traces indicate recent mystical activity. These places hold secrets worth exploring.',
];
