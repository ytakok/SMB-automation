import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { I18nService } from './core/i18n/i18n.service';
import { langGuard } from './core/i18n/lang.guard';
import { langResolver } from './core/i18n/lang.resolver';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => inject(I18nService).initialLang(),
  },
  {
    path: ':lang',
    canMatch: [langGuard],
    resolve: { lang: langResolver },
    loadComponent: () =>
      import('./layout/shell/shell.component').then((module) => module.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/home/home.page').then((module) => module.HomePage),
        data: {
          seo: {
            titleKey: 'home.seo.title',
            descriptionKey: 'home.seo.description',
          },
        },
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/about/about.page').then((module) => module.AboutPage),
        data: {
          seo: {
            titleKey: 'about.seo.title',
            descriptionKey: 'about.seo.description',
          },
        },
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./features/services/services.page').then((module) => module.ServicesPage),
        data: {
          seo: {
            titleKey: 'services.seo.title',
            descriptionKey: 'services.seo.description',
          },
        },
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/contact/contact.page').then((module) => module.ContactPage),
        data: {
          seo: {
            titleKey: 'contact.seo.title',
            descriptionKey: 'contact.seo.description',
          },
        },
      },
      {
        path: 'not-found',
        loadComponent: () =>
          import('./features/not-found/not-found.page').then((module) => module.NotFoundPage),
        data: {
          seo: {
            titleKey: 'notFound.seo.title',
            descriptionKey: 'notFound.seo.description',
            robots: 'noindex',
          },
        },
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/not-found/not-found.page').then((module) => module.NotFoundPage),
        data: {
          seo: {
            titleKey: 'notFound.seo.title',
            descriptionKey: 'notFound.seo.description',
            robots: 'noindex',
          },
        },
      },
    ],
  },
  { path: '**', redirectTo: '/en/not-found' },
];
