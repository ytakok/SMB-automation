import { RenderMode, ServerRoute } from '@angular/ssr';
import paths from './routes.manifest.json';
import { ACTIVE_TENANT } from './core/tenant/active-tenant';

const langParams = async () => ACTIVE_TENANT.languages.map((language) => ({ lang: language.code }));

export const serverRoutes: ServerRoute[] = [
  ...paths.map((path): ServerRoute => ({
    path: path ? `:lang/${path}` : ':lang',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: langParams,
  })),
  { path: '**', renderMode: RenderMode.Client },
];
