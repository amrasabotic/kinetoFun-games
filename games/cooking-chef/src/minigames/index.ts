import type { MinigameId } from '@/types';
import type { MinigameModule } from '@/types/minigame';
import { VegChopModule } from './VegChop';
import { StirSoupModule } from './StirSoup';
import { FlipPancakeModule } from './FlipPancake';
import { DecorateCakeModule } from './DecorateCake';
import { BurgerStackModule } from './BurgerStack';
import { PizzaMasterModule } from './PizzaMaster';
import { SushiRollerModule } from './SushiRoller';
import { IceCreamArtistModule } from './IceCreamArtist';
import { SmoothieFrenzyModule } from './SmoothieFrenzy';
import { BBQGrillModule } from './BBQGrill';
import { DumplingDashModule } from './DumplingDash';
import { UltimateShowdownModule } from './UltimateShowdown';

export const MINIGAME_REGISTRY: Record<MinigameId, MinigameModule> = {
  'veg-chop': VegChopModule,
  'stir-soup': StirSoupModule,
  'flip-pancake': FlipPancakeModule,
  'decorate-cake': DecorateCakeModule,
  'burger-stack': BurgerStackModule,
  'pizza-master': PizzaMasterModule,
  'sushi-roller': SushiRollerModule,
  'ice-cream': IceCreamArtistModule,
  'smoothie-frenzy': SmoothieFrenzyModule,
  'bbq-grill': BBQGrillModule,
  'dumpling-dash': DumplingDashModule,
  'ultimate-showdown': UltimateShowdownModule,
};

export const ALL_MINIGAME_IDS = Object.keys(MINIGAME_REGISTRY) as MinigameId[];
