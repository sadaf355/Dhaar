import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  id: string;
  q: string;
  a: string;
}

const faqs: FaqItem[] = [
  {
    id: 'faq-1',
    q: 'What is DHAAR?',
    a: 'DHAAR (Deposit Holding, Assurance & Audit Registry) is an independent prototype built for Smart India Hackathon 2026 (Problem Statement SIH26265). It provides a unified digital registry and closed-loop verification pipeline for AICTE security deposits and fixed deposit receipts (FDRs), shifting oversight from unverified paper receipts to multi-tiered bank assurance.'
  },
  {
    id: 'faq-2',
    q: 'Is this real AICTE data?',
    a: 'No. All institutions, deposit receipts, amounts, and bank branches in this prototype are synthetic demo records generated for evaluation. The application runs entirely within your browser using mock local state; no real institutional records or live bank servers are queried.'
  },
  {
    id: 'faq-3',
    q: 'How is a deposit verified?',
    a: 'Verification follows a 4-tier Evidence Ladder. When an institution enters an FDR, it is graded E0 (Declared). An AICTE Regional Officer inspects the documents for E1 (Reviewed). To reach E2 (Bank-attested), the issuing bank branch must explicitly confirm the FDR number, amount, maturity, and joint lien in favour of AICTE via a dedicated verification desk. If confirmed within the last 180 days, it is classified as Assured.'
  },
  {
    id: 'faq-4',
    q: 'Who can approve a release?',
    a: 'Releases require strict segregation of duties through a seven-gate control pipeline. A Regional Officer acts as the Maker to initiate and compile the scrutiny package. An independent Checker validates the submission. Final authorization can only be granted by an Approving Authority, followed by bank confirmation of fund disposition before closure.'
  },
  {
    id: 'faq-5',
    q: 'What happens when a deposit matures?',
    a: 'DHAAR triggers advance notifications at 120, 90, 60, and 30 days prior to maturity. If the regulatory requirement is ongoing, the institution must renew the FDR and submit the renewed receipt, establishing a linked lineage in the registry. If the program tenure has completed and all release gates pass, a formal refund workflow is initiated.'
  },
  {
    id: 'faq-6',
    q: 'What would production need?',
    a: 'A production deployment requires integration with government SSO (Parichay / DigiLocker), secure API or SFTP connectivity with core banking systems (CBS) for automated lien confirmations, NeSL or state e-Stamping portals for indemnity verification, and PFMS for direct refund reconciliation.'
  }
];

export default function FaqSection() {
  const [openIds, setOpenIds] = useState<string[]>(['faq-1']);

  const toggle = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section id="faq" className="landing-section" aria-labelledby="faq-heading">
      <div className="landing-container">
        <div className="landing-section-header">
          <div className="eyebrow">
            <span className="landing-dot" aria-hidden="true" />
            FREQUENTLY ASKED QUESTIONS
          </div>
          <h2 id="faq-heading" className="landing-section-title">
            Everything you need to know about DHAAR
          </h2>
          <p className="landing-section-subtitle">
            Answers to common questions regarding the DHAAR architecture, trust model, and SIH26265 implementation scope.
          </p>
        </div>

        <div className="landing-faq-accordion" role="region" aria-label="FAQ Accordion">
          {faqs.map((item) => {
            const isOpen = openIds.includes(item.id);
            return (
              <div className={`panel landing-faq-card ${isOpen ? 'open' : ''}`} key={item.id}>
                <button
                  type="button"
                  id={`faq-btn-${item.id}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                  className="landing-faq-question-btn"
                  onClick={() => toggle(item.id)}
                >
                  <h3 className="landing-faq-question">{item.q}</h3>
                  <span className={`landing-faq-chevron ${isOpen ? 'rotated' : ''}`} aria-hidden="true">
                    <ChevronDown size={18} />
                  </span>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${item.id}`}
                    role="region"
                    aria-labelledby={`faq-btn-${item.id}`}
                    className="landing-faq-answer"
                  >
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
