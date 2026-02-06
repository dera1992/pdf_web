import { useState } from 'react'

type FAQItem = {
  question: string
  answer: string
}

const faqItems: FAQItem[] = [
  {
    question: 'How is my data secured?',
    answer: 'We use encryption at rest and in transit, strict access controls, and audit logs.'
  },
  {
    question: 'Does the platform support OCR?',
    answer: 'Yes. OCR converts scans into searchable text with adjustable accuracy settings.'
  },
  {
    question: 'Can I chat with my PDFs?',
    answer: 'AI chat lets you ask questions and extract summaries from documents.'
  },
  {
    question: 'Which formats can I export?',
    answer: 'Export to PDF, DOCX, PNG, and structured data formats like CSV.'
  },
  {
    question: 'How does collaboration work?',
    answer: 'Invite teammates, assign comments, and manage permissions per workspace.'
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes. We offer a 14-day refund window for new paid subscriptions.'
  }
]

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-surface-50 py-20 dark:bg-surface-800">
      <div className="mx-auto w-full max-w-4xl px-4 lg:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">FAQ</p>
          <h2 className="mt-2 text-3xl font-semibold text-surface-900 dark:text-white">Your questions, answered</h2>
          <p className="mt-2 text-surface-600 dark:text-surface-300">
            Everything you need to know about using CodexPDF.
          </p>
        </div>
        <div className="mt-10 space-y-4">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <div key={item.question} className="rounded-2xl border border-surface-200 bg-white p-5 dark:border-surface-700 dark:bg-surface-900">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold text-surface-900 dark:text-white">{item.question}</span>
                  <span className={`ml-4 text-accent-500 transition ${isOpen ? 'rotate-180' : ''}`}>
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.19l3.71-3.96a.75.75 0 011.08 1.04l-4.25 4.53a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </button>
                {isOpen && <p className="mt-3 text-sm text-surface-600 dark:text-surface-300">{item.answer}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
