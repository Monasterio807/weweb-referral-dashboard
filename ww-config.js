export default {
  editor: {
    label: { en: 'Referral Dashboard', de: 'Referral-Dashboard' },
    icon: 'gift',
  },
  triggerEvents: [
    { name: 'loaded', label: { en: 'On loaded', de: 'Geladen' }, event: { code: '' } },
    { name: 'copied', label: { en: 'On link copied', de: 'Link kopiert' }, event: { link: '' } },
    { name: 'error', label: { en: 'On error', de: 'Fehler' }, event: { reason: '' } },
  ],
  properties: {
    authToken: {
      label: { en: 'User JWT (auth token)', de: 'User-JWT (Login-Token)' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Access Token des eingeloggten Users. An die Supabase-Plugin-Variable binden. NIE den service_role-Key verwenden.',
      },
      /* wwEditor:end */
    },
    apiKey: {
      label: { en: 'Supabase anon/publishable key', de: 'Supabase Anon-/Publishable-Key' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: '',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Oeffentlicher Anon-/Publishable-Key des Projekts. NIE den service_role-Key verwenden.',
      },
      /* wwEditor:end */
    },
    supabaseUrl: {
      label: { en: 'Supabase URL', de: 'Supabase URL' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: 'https://ztvqsxdudzdyqgeylujr.supabase.co',
    },
    baseUrl: {
      label: { en: 'Referral base URL', de: 'Basis-URL für Empfehlungs-Link' },
      type: 'Text',
      section: 'settings',
      bindable: true,
      defaultValue: 'https://app.imploya.ch',
      /* wwEditor:start */
      bindingValidation: {
        type: 'string',
        tooltip: 'Basis-URL der Landingpage, auf die der Empfehlungs-Link zeigt. Default: https://app.imploya.ch',
      },
      /* wwEditor:end */
    },
  },
};
