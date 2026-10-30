import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      shell: {
        commandCenter: 'Command Center',
        institutions: 'Institutions',
        registry: 'Deposit registry',
        submit: 'Submit an instrument',
        verification: 'Verification queue',
        evidence: 'Evidence workbench',
        bankDesk: 'Bank confirmation desk',
        compliance: 'Compliance & maturity',
        alerts: 'Alerts & SLA ladder',
        release: 'Release & refunds',
        reports: 'Operational reports',
        parameters: 'APH parameters',
        impact: 'DHAAR Impact Lab',
        demoQa: 'Demo readiness & QA',
        audit: 'Activity & audit',
        settings: 'Settings',
        workspaceChip: 'AICTE Operations',
        demoWorkspace: 'Demo workspace',
        searchPlaceholder: 'Search anything (Ctrl+K)'
      },
      dashboard: {
        title: 'Security Deposit Assurance Command Center',
        subtitle: 'Real-time visibility, automated rule pre-flight, and bank confirmation tracking.',
        totalSecured: 'Total Secured Cover',
        verifiedHeld: 'Verified-Held (E2/E3)',
        attentionRequired: 'Attention Required',
        openReleases: 'Open Release Requests',
        loadCohort: 'Load Synthetic Cohort (1.8k)',
        unloadCohort: 'Revert to Small Seed'
      },
      submit: {
        title: 'Submit Security Deposit Instrument',
        subtitle: 'Institution self-service intake with instantaneous cryptographic pre-flight evaluation.',
        fdrNo: 'FDR / Instrument Reference No',
        bank: 'Issuing Scheduled Commercial Bank',
        amount: 'Secured Principal Amount (INR)',
        issueDate: 'Issue Date',
        maturityDate: 'Maturity Date',
        uploadDoc: 'Attach FDR Certificate (PDF)',
        submitBtn: 'Submit Instrument to DHAAR'
      },
      bankDesk: {
        title: 'Bank Confirmation Desk',
        subtitle: 'Automated outreach, magic link token generation, and cryptographic attestation verification.',
        sendRequest: 'Send Confirmation Request',
        reIssue: 'Re-issue Expired Request',
        openDesk: 'Open Bank-side Portal Desk',
        attestationStatus: 'Attestation Status'
      },
      release: {
        title: 'Release & Refund Tracker',
        subtitle: 'Closed-loop multi-step approval with bank acknowledgement and reconciliation.',
        makerCheck: 'Maker Check',
        checkerApprove: 'Checker Approve',
        authorityApprove: 'Authority Approve',
        reconcile: 'Reconcile & Close',
        placeHold: 'Place on Hold',
        verifyNoc: 'Verify NOC Online'
      }
    }
  },
  hi: {
    translation: {
      shell: {
        commandCenter: 'कमांड सेंटर',
        institutions: 'संस्थान',
        registry: 'जमा रजिस्ट्री',
        submit: 'नया साधन जमा करें',
        verification: 'सत्यापन कतार',
        evidence: 'साक्ष्य वर्कबेंच',
        bankDesk: 'बैंक पुष्टि डेस्क',
        compliance: 'अनुपालन एवं परिपक्वता',
        alerts: 'अलर्ट एवं एसएलए सीढ़ी',
        release: 'रिलीज़ एवं रिफंड',
        reports: 'परिचालन रिपोर्ट',
        parameters: 'एपीएच पैरामीटर',
        impact: 'धार प्रभाव लैब',
        demoQa: 'डेमो तैयारी एवं क्यूए',
        audit: 'गतिविधि एवं ऑडिट',
        settings: 'सेटिंग्स',
        workspaceChip: 'एआईसीटीई संचालन',
        demoWorkspace: 'डेमो कार्यक्षेत्र',
        searchPlaceholder: 'खोजें... (Ctrl+K)'
      },
      dashboard: {
        title: 'सुरक्षा जमा आश्वासन कमांड सेंटर',
        subtitle: 'वास्तविक समय दृश्यता, स्वचालित नियम मूल्यांकन और बैंक पुष्टि ट्रैकिंग।',
        totalSecured: 'कुल सुरक्षित जमा राशि',
        verifiedHeld: 'सत्यापित सुरक्षित जमा (E2/E3)',
        attentionRequired: 'तत्काल समीक्षा आवश्यक',
        openReleases: 'सक्रिय रिलीज़ अनुरोध',
        loadCohort: 'बड़ा कोहोर्ट लोड करें (1.8k)',
        unloadCohort: 'मूल छोटे सीड पर लौटें'
      },
      submit: {
        title: 'सुरक्षा जमा साधन जमा करें',
        subtitle: 'तत्काल क्रिप्टोग्राफ़िक पूर्व-जांच के साथ संस्थान स्व-सेवा पंजीकरण।',
        fdrNo: 'एफडीआर / साधन संदर्भ संख्या',
        bank: 'जारीकर्ता अनुसूचित वाणिज्यिक बैंक',
        amount: 'सुरक्षित मूलधन राशि (रुपये)',
        issueDate: 'जारी करने की तारीख',
        maturityDate: 'परिपक्वता तिथि',
        uploadDoc: 'एफडीआर प्रमाणपत्र संलग्न करें (पीडीएफ)',
        submitBtn: 'धार में साधन जमा करें'
      },
      bankDesk: {
        title: 'बैंक पुष्टि डेस्क',
        subtitle: 'स्वचालित सूचना, मैजिक लिंक टोकन और क्रिप्टोग्राफ़िक सत्यापन।',
        sendRequest: 'पुष्टि अनुरोध भेजें',
        reIssue: 'समाप्त अनुरोध पुनः जारी करें',
        openDesk: 'बैंक-पक्ष पोर्टल खोलें',
        attestationStatus: 'सत्यापन स्थिति'
      },
      release: {
        title: 'रिलीज़ एवं रिफंड ट्रैकर',
        subtitle: 'बैंक पावती और समाधान के साथ बहु-स्तरीय अनुमोदन प्रणाली।',
        makerCheck: 'मेकर जांच',
        checkerApprove: 'चेकर अनुमोदन',
        authorityApprove: 'प्राधिकारी अनुमोदन',
        reconcile: 'समाधान एवं समापन',
        placeHold: 'होल्ड पर रखें',
        verifyNoc: 'एनओसी ऑनलाइन सत्यापित करें'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
