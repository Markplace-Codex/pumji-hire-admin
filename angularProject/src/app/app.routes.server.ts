import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'configuration/dropdown-datas/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'configuration/all-settings/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'configuration/products/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'configuration/affiliate-commission/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'consent/edit/:id',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
