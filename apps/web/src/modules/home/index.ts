import { ChartNoAxesColumnIcon, LandmarkIcon } from 'lucide-react';
import type { AppModule } from '../../app/modules';

/** Salon, insights and settings: the parts of Mnemo that span all collections. */
export const homeModule: AppModule = {
  id: 'home',
  nav: [
    { to: '/', navKey: 'salon', icon: LandmarkIcon, order: 0, placement: 'main', mobile: true },
    {
      to: '/insights',
      navKey: 'insights',
      icon: ChartNoAxesColumnIcon,
      order: 90,
      placement: 'secondary',
    },
  ],
};
