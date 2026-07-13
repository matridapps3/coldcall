// Caller playbook — a static, sectioned company/product brief the caller can pull up
// mid-call from the console (searchable, jump-to-section). One curated source of the
// facts a caller needs. Written in simple, plain English (the caller reads English
// well); the Hinglish lives only in the scripts/templates actually said to customers.
// Keep it HONEST: only verified facts (no fake clients/awards/numbers).

export const PLAYBOOK = [
  {
    id: 'snapshot', title: 'Quick snapshot', entries: [
      { h: 'The offer in one line', b: 'Bespoke 100+ page website, live tonight, ₹4,000 (regular ₹6,000). Google Business + WhatsApp setup free. Pay only after you see it.' },
      { h: 'Who we are', b: 'SiteBhai, a venture of Conyso. Founder studied at IIT Madras and IIM. Not a freelancer, not a template shop.' },
      { h: 'What to send', b: 'Sample: conyso.com. Plus we build a personalized demo of their own business (biggest close lever).' },
      { h: 'Goal of the call', b: 'The only job of the call is to get a yes to sending a WhatsApp message. Do NOT try to close on the call.' },
    ],
  },
  {
    id: 'founder', title: 'Founder & trust', entries: [
      { h: 'Founder', b: 'Krishna Chagti — IIT Madras (Data Science) + IIM. Founder of Conyso. SiteBhai is a Conyso venture.' },
      { h: 'Verify link', b: 'conyso.com/founder — tell them they can check the founder themselves.' },
      { h: 'Why it matters', b: 'Removes the "who are you, is this a scam" doubt. Pair the credential with pay-after.' },
      { h: 'Honesty rule', b: 'Only these verified facts. Never invent clients, awards, ratings, or numbers.' },
    ],
  },
  {
    id: 'build', title: 'What we build', entries: [
      { h: 'The site', b: 'Bespoke, multi-page, mobile-responsive, fast. Not a template. Live the same night, free hosting on a fast subdomain, no monthly fee.' },
      { h: '100+ pages', b: 'Competitors give 5-10 pages at this price. We build 100+ — a page for every service, every area served, and every common question.' },
      { h: 'SEO', b: 'Ranks on Google: unique keyword titles/meta per page, structured data, sitemap.' },
      { h: 'AEO (Answer Engine Optimization)', b: 'Built so AI assistants (ChatGPT etc.) can quote the business — FAQ pages with clear, self-contained answers.' },
      { h: 'GEO (Generative Engine Optimization)', b: 'Built for AI search (Google AI Overviews, Perplexity): clear entity info + "best X in [area]" answers so AI names them.' },
      { h: 'How to explain AEO/GEO to a customer', b: 'People now ask AI (ChatGPT etc.), not just Google, for "best X near me" — we build the site so AI names you too.' },
    ],
  },
  {
    id: 'pricing', title: 'Pricing', entries: [
      { h: 'Website', b: '₹4,000 if they start today, ₹6,000 regular. One-time, no monthly fee.' },
      { h: 'Agency anchor', b: 'Agencies charge ₹10,000-25,000 for the same thing. We are a fraction of that.' },
      { h: 'Free with every website', b: 'Google Business Profile setup + WhatsApp Business setup — both free.' },
      { h: 'Own domain', b: 'Standard .in/.com ₹1,499 first year, ~₹1,800/yr renewal, in the client\'s name (DNS managed). Premium quoted at actual. Or the client buys their own and we connect it free.' },
      { h: 'Changes', b: 'Minor (text, photos, timings, price) free forever. Major (new pages, redesign) from ₹1,499.' },
      { h: 'Custom tool', b: 'Booking / ops / billing tool from ₹7,999.' },
    ],
  },
  {
    id: 'packages', title: 'Packages & care plans', entries: [
      { h: 'Starter', b: '₹4,000 today / ₹6,000 regular — the 100+ page site + free Google/WhatsApp. This is the default pitch.' },
      { h: 'Growth (most popular)', b: '₹8,999 / ₹11,999 — Starter + own domain + extra pages + online booking + 1 year care included.' },
      { h: 'Pro', b: '₹15,999 / ₹19,999 — Growth + custom ops/booking tool + priority build + care.' },
      { h: 'Basic Care', b: '₹3,999/yr — unlimited minor changes, monthly content update, Google upkeep, priority support. Offer from year 2.' },
      { h: 'Care+', b: '₹7,999/yr — Basic + quarterly refresh, seasonal campaigns, Google posts, analytics.' },
      { h: 'When to mention tiers', b: 'Lead with Starter. Bring up Growth/Pro only when they ask for more, or want a domain, booking, or the custom tool.' },
    ],
  },
  {
    id: 'process', title: 'Delivery & process', entries: [
      { h: 'Same night', b: 'The site goes live the same night once they say yes and give the basics.' },
      { h: 'The flow', b: 'Call → send sample / personalized demo → they like it → close → they fill a 2-minute intake quiz → we build → live.' },
      { h: 'Pay-after (risk reversal)', b: 'They pay only if they like it. We build and show first; no advance, no risk. This is the strongest close lever.' },
      { h: 'Intake quiz', b: 'On close, send the quiz link — they pick colours/content/pages and upload photos/logo; it generates the build.' },
    ],
  },
  {
    id: 'objections', title: 'Objection answers', entries: [
      { h: 'Too expensive', b: '₹4,000 one-time, no monthly. Agencies charge 10-25k. One or two new customers cover it. And they pay only after they see it.' },
      { h: 'Wants to think it over / will get back', b: 'No pressure — but meanwhile customers searching for them go to a competitor. Offer to build their own demo so they decide after seeing it. Today\'s ₹4,000 rate is locked.' },
      { h: 'Already on Instagram / Practo / JustDial', b: 'That is a rented profile shared with competitors. Their own site + Google + AI is theirs, ranks, and looks professional.' },
      { h: 'No time', b: '30 seconds — offer to send a sample on WhatsApp to see in their free time.' },
      { h: 'No budget', b: 'They pay only after they see it and like it — no advance, so no budget risk. ₹4,000 comes back with one enquiry.' },
      { h: 'Needs to ask partner / family', b: 'Offer to build their own demo so they can show it and decide together. Pay-after, no advance.' },
      { h: 'Who are you / can I trust you', b: 'SiteBhai is a Conyso venture; founder is from IIT Madras + IIM (conyso.com/founder). And we build first — they pay only if they like it.' },
      { h: 'Can I get my own domain?', b: 'Yes — their own domain in their name from ₹1,499/yr, or they buy it and we connect it free.' },
    ],
  },
  {
    id: 'verticals', title: 'Active verticals', entries: [
      { h: 'Photographers', b: 'Pain: a client asks for a portfolio link; Instagram looks amateur, so they book someone else. The demo (their own photos) closes hardest. Season urgency.' },
      { h: 'Coaching', b: 'Pain: parents Google before admission; no site means they trust a bigger institute. Urgency: admission season. One admission = ₹20k-1L.' },
      { h: 'Clinics', b: 'Pain: patients Google the doctor; no site means the next name gets the patient. Tone: respectful ("doctor sahab"), NO medical claims or guarantees.' },
    ],
  },
  {
    id: 'rules', title: 'Rules & compliance', entries: [
      { h: 'Honesty', b: 'No fake clients, awards, or numbers. Only verified founder facts. Use behavioural proof ("customers Google you") — not testimonials we do not have.' },
      { h: 'Clinics', b: 'No medical claims or guarantees. Keep it factual, professional, respectful.' },
      { h: 'Opt-out', b: 'Every WhatsApp carries "Reply STOP to opt out" (DPDP Act).' },
      { h: 'Do not over-promise', b: '"100+ pages" means real query-capture pages (service x area x question), never thin or spun filler. Same-night is the aim once the basics are in.' },
    ],
  },
  {
    id: 'links', title: 'Links', entries: [
      { h: 'Sample site', b: 'conyso.com' },
      { h: 'Founder page', b: 'conyso.com/founder' },
      { h: 'Quiz link', b: 'Sent automatically on close (format /quiz?code=XXXX).' },
    ],
  },
];
