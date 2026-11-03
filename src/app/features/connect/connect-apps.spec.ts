import {
  buildConnectionSheet,
  CONNECT_APPS,
  ConnectApp,
  isAppReady,
  requiredFields,
} from './connect-apps';

const app: ConnectApp = {
  id: 'demo',
  minutes: 1,
  n8nCredential: 'Demo API',
  steps: [
    { fields: [{ key: 'id', sheetLabel: 'ID' }] },
    {
      fields: [
        { key: 'secret', sheetLabel: 'Secret', secret: true },
        { key: 'note', sheetLabel: 'Note', optional: true },
      ],
    },
  ],
};

describe('connect apps', () => {
  it('needs every required field filled to be ready', () => {
    expect(requiredFields(app).map((field) => field.key)).toEqual(['id', 'secret']);
    expect(isAppReady(app, {})).toBe(false);
    expect(isAppReady(app, { demo: { id: '1', secret: '  ' } })).toBe(false);
    expect(isAppReady(app, { demo: { id: '1', secret: 's' } })).toBe(true);
  });

  it('writes every field and marks unfinished apps on the sheet', () => {
    const sheet = buildConnectionSheet([app], { demo: { id: '42' } }, 'Acme', 'https://x/cb');
    expect(sheet).toContain('Connection sheet for Acme');
    expect(sheet).toContain('n8n redirect URI: https://x/cb');
    expect(sheet).toContain('[demo] (incomplete)');
    expect(sheet).toContain('  ID: 42');
    expect(sheet).toContain('  Secret: -');
  });

  it('gives every app unique field keys and https links', () => {
    for (const connectApp of CONNECT_APPS) {
      const keys = connectApp.steps.flatMap((step) => step.fields ?? []).map((field) => field.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const step of connectApp.steps) {
        if (step.link) {
          expect(step.link.startsWith('https://')).toBe(true);
        }
      }
    }
  });
});
