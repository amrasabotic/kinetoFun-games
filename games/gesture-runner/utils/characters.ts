import type { CharacterId } from '../types/game';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  color: string;
  accentColor: string;
  description: string;
  unlockCondition: string;
  unlockCost: number; // coins needed, 0 = free
  unlockScore?: number; // score needed
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'starter',
    name: 'Runner',
    color: '#4dc8ff',
    accentColor: '#ffffff',
    description: 'The classic gesture runner. Ready from the start!',
    unlockCondition: 'Available from the start',
    unlockCost: 0,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    color: '#ff8c00',
    accentColor: '#ffcc00',
    description: 'A seasoned adventurer with a knack for discovery.',
    unlockCondition: 'Collect 200 total coins',
    unlockCost: 200,
  },
  {
    id: 'robot',
    name: 'ROBO-7',
    color: '#aaaaaa',
    accentColor: '#00ffff',
    description: 'Precision-engineered for maximum running efficiency.',
    unlockCondition: 'Reach score 5000',
    unlockCost: 0,
    unlockScore: 5000,
  },
  {
    id: 'ninja',
    name: 'Shadow',
    color: '#8000ff',
    accentColor: '#ff00ff',
    description: 'Masters of stealth and speed. Unseen, unstoppable.',
    unlockCondition: 'Collect 500 total coins',
    unlockCost: 500,
  },
];

export function getCharacter(id: CharacterId): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
