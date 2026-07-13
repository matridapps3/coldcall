// The website-intake questionnaire. One source of truth: the public quiz page
// renders it, the manager view labels answers, and buildPrompt() turns it into a
// ready-to-run Claude Code (Opus 4.8) build prompt.
//
// Designed to be EASY: almost everything is single-choice (radio) or multi-select
// (checks) so the client mostly taps. Only a few essentials are free text
// (business name, what they do, services). Some MSQ fields ship `default`
// selections so a client can breeze through with sensible picks.
//
// Field types: text, tel, email, url, textarea, select, radio, checks (-> array),
// color (swatches -> array of hex). `default` prefills when unanswered.

export const FORM = [
  {
    section: 'Your business',
    intro: 'The basics so we get your name and what you do exactly right.',
    fields: [
      { key: 'biz_name', label: 'Business name (exactly as it should appear)', type: 'text', required: true },
      { key: 'tagline', label: 'Tagline or one-line description', type: 'text', placeholder: 'Optional, we can write one for you' },
      { key: 'about', label: 'What does your business do? A line or two is enough.', type: 'textarea', required: true },
      { key: 'years', label: 'How long have you been in business?', type: 'radio',
        options: ['Just started', 'Under 2 years', '2 to 5 years', '5 to 10 years', 'Over 10 years'] },
      { key: 'areas', label: 'Which city + areas/localities do you serve? List as many as you can.', type: 'text', placeholder: 'e.g. Andheri, Bandra, Juhu, Powai — we build a page for each so you rank in every locality' },
      { key: 'languages', label: 'Language(s) for the website', type: 'checks', options: ['English', 'Hindi', 'Marathi', 'Other'], default: ['English'] },
    ],
  },
  {
    section: 'Goals',
    intro: 'What should the website do for you?',
    fields: [
      { key: 'primary_goal', label: 'Main goal of the website', type: 'radio',
        options: ['Get more calls / enquiries', 'Take online bookings or appointments', 'Look credible and professional', 'Show up on Google for my area', 'Showcase my work / portfolio', 'Sell products online'] },
      { key: 'audience', label: 'Who are your customers? (pick any)', type: 'checks',
        options: ['Local individuals / households', 'Local businesses', 'Walk-in customers', 'People searching on Google', 'Repeat / existing customers', 'Premium / high-budget clients'] },
      { key: 'action', label: 'What should visitors mainly do?', type: 'radio',
        options: ['Call us', 'Message on WhatsApp', 'Book an appointment', 'Fill an enquiry form', 'Visit our location', 'Order online'] },
    ],
  },
  {
    section: 'Pages & features',
    intro: 'Pick your main menu pages here. On top of these we auto-build 100+ deeper pages — one for every service, area and common question — so you rank on Google and AI.',
    fields: [
      { key: 'pages', label: 'Main menu pages', type: 'checks',
        options: ['Home', 'About us', 'Services', 'Pricing', 'Gallery / Portfolio', 'Testimonials', 'Team', 'Menu', 'Blog / Articles', 'FAQ', 'Contact', 'Booking / Appointment'],
        default: ['Home', 'About us', 'Services', 'Contact'] },
      { key: 'pages_other', label: 'Any other pages (optional)', type: 'text' },
      { key: 'features', label: 'Features to include', type: 'checks',
        options: ['WhatsApp chat button', 'Contact / enquiry form', 'Google Map', 'Online booking / appointment', 'Photo gallery', 'Customer reviews', 'Click-to-call button', 'Social media links', 'Image slider / banner', 'Downloadable brochure'],
        default: ['WhatsApp chat button', 'Click-to-call button', 'Contact / enquiry form'] },
    ],
  },
  {
    section: 'Look & feel',
    intro: 'How you want it to look. All optional, tap what fits.',
    fields: [
      { key: 'style', label: 'Overall style', type: 'radio',
        options: ['Minimal & modern', 'Bold & colorful', 'Elegant & premium', 'Professional & corporate', 'Warm & friendly', 'Traditional & classic'] },
      { key: 'palette', label: 'Color mood', type: 'radio',
        options: ['Bright and vibrant', 'Soft and pastel', 'Dark and bold', 'Clean and minimal', 'Earthy and natural', 'Luxury (black & gold)', 'Match my logo', 'Let SiteBhai choose'] },
      { key: 'colors', label: 'Exact colors, if you have them (optional)', type: 'color' },
      { key: 'fonts', label: 'Typography feel', type: 'radio',
        options: ['Modern and clean', 'Classic and elegant', 'Bold and strong', 'Friendly and rounded', 'No preference'] },
      { key: 'has_logo', label: 'Do you have a logo?', type: 'radio', options: ['Yes, I will share it', 'No, please suggest one', 'No logo needed'] },
      { key: 'dislikes', label: 'Anything you do NOT want (pick any)', type: 'checks',
        options: ['Too much text', 'Too many colours', 'Cluttered layout', 'Generic stock-photo look', 'Pop-ups', 'Slow pages'] },
      { key: 'likes', label: 'Websites you like (paste links, optional)', type: 'textarea' },
    ],
  },
  {
    section: 'Content',
    intro: 'The actual material. The more you give, the better the site.',
    fields: [
      { key: 'services_list', label: 'List your services / products (with prices if any)', type: 'textarea', required: true },
      { key: 'usp', label: 'Why should customers choose you? (pick any)', type: 'checks',
        options: ['Affordable pricing', 'Experienced & qualified', 'Fast service', 'Personal attention', 'Wide range of services', 'Trusted by many customers', 'Premium quality', 'Convenient location', 'Open long hours'] },
      { key: 'about_text', label: 'About-us text (optional, we will polish)', type: 'textarea' },
      { key: 'testimonials', label: 'Reviews / testimonials to feature (optional)', type: 'textarea' },
      { key: 'must_have_text', label: 'Anything that MUST appear, e.g. offers, certifications (optional)', type: 'textarea' },
    ],
  },
  {
    section: 'Get found on Google',
    intro: 'So the right people find you. All optional, we can research these.',
    fields: [
      { key: 'keywords', label: 'What would customers type on Google, or ask an AI, to find you? (optional)', type: 'textarea', placeholder: 'e.g. dentist in Andheri, root canal cost near me, best orthodontist' },
      { key: 'common_questions', label: 'What do customers most often ask you? (optional, one per line)', type: 'textarea', placeholder: 'We turn each into a page that answers it — powers Google + AI results' },
      { key: 'gbp', label: 'Do you have a Google Business listing?', type: 'radio', options: ['Yes', 'No', 'Not sure'] },
      { key: 'competitors', label: "Competitors' websites, if any (optional)", type: 'textarea' },
    ],
  },
  {
    section: 'Contact & assets',
    intro: 'How customers reach you, and how you will send photos/logo.',
    fields: [
      { key: 'phone', label: 'Phone number', type: 'tel' },
      { key: 'whatsapp', label: 'WhatsApp number (if different)', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'address', label: 'Full address (for map / contact page)', type: 'textarea' },
      { key: 'hours', label: 'Business hours', type: 'text', placeholder: 'e.g. Mon-Sat 10am-8pm' },
      { key: 'socials', label: 'Social media links (optional)', type: 'textarea', placeholder: 'Instagram, Facebook, etc.' },
      { key: 'domain', label: 'Domain name you want', type: 'text', placeholder: 'e.g. sharmaassociates.in' },
      { key: 'assets_via', label: 'How will you send your logo and photos?', type: 'radio', options: ['WhatsApp', 'Email', 'Google Drive link', 'I need help arranging photos'] },
    ],
  },
  {
    section: 'Anything else',
    fields: [
      { key: 'notes', label: 'Anything else you want us to know (optional)', type: 'textarea' },
    ],
  },
];

const join = (v) => (Array.isArray(v) ? v.filter(Boolean).join(', ') : v == null ? '' : String(v)).trim();

// Render a submitted answer set into a clean Markdown brief (for quick reading).
export function buildBrief(form, answers, company) {
  const lines = [`# Website brief: ${company || answers.biz_name || 'Client'}`, ''];
  for (const sec of form) {
    const rows = [];
    for (const f of sec.fields) {
      const v = join(answers[f.key]);
      if (!v) continue;
      rows.push(`- **${f.label}:** ${v.replace(/\n/g, '\n  ')}`);
    }
    if (rows.length) { lines.push(`## ${sec.section}`, ...rows, ''); }
  }
  return lines.join('\n');
}

// Turn answers into a complete, self-contained build prompt the manager pastes
// straight into Claude Code (Opus 4.8) to build the whole site in one go.
export function buildPrompt(form, answers, company) {
  const a = (k) => join(answers[k]);
  const name = a('biz_name') || company || 'the business';
  const pages = [a('pages'), a('pages_other')].filter(Boolean).join(', ') || 'Home, About, Services, Contact';
  const wa = a('whatsapp') || a('phone');
  const seoAreas = a('areas');
  const L = [];

  L.push(`Build a complete, production-ready, COMPREHENSIVE multi-page marketing website for "${name}" — a large site (target 50-100+ substantial pages), NOT a 5-10 page brochure. This scale is the whole point: competitors ship 5-10 pages, we ship deep topical coverage. Create every page fully designed and written, in one go. Premium, modern, original — never a generic template.`);
  L.push('');
  L.push('## Business');
  if (a('about')) L.push(`- What they do: ${a('about')}`);
  if (a('tagline')) L.push(`- Tagline: ${a('tagline')}`);
  if (a('years')) L.push(`- Experience: ${a('years')}`);
  if (a('areas')) L.push(`- Serves: ${a('areas')}`);
  if (a('languages')) L.push(`- Website language(s): ${a('languages')}`);

  L.push('');
  L.push('## Goal');
  if (a('primary_goal')) L.push(`- Primary goal: ${a('primary_goal')}`);
  if (a('audience')) L.push(`- Target customers: ${a('audience')}`);
  if (a('action')) L.push(`- Main action visitors should take: ${a('action')}`);

  L.push('');
  L.push('## Pages');
  L.push(`Build each as its own page sharing one header/nav and footer: ${pages}.`);
  L.push('');
  L.push('## Coverage / scale — programmatic query capture (the differentiator)');
  L.push('Most of the pages exist to capture a specific real search query (long-tail search + AI answers).');
  L.push('IMPORTANT — expand from seeds: the client only gives the MAIN services, a FEW areas, and some questions. Do NOT stop there. Use your knowledge of this exact type of business to enumerate the FULL set: the standard services/treatments/courses people search for, the common questions they ask, and the nearby localities/suburbs of the areas given. Then build a dedicated page for each meaningful combination below:');
  L.push('- one page per service / treatment / course / offering (listed AND standard ones you infer);');
  L.push('- one page per service x area served, e.g. "[service] in [area]" — this is where the count grows;');
  L.push('- intent variants people actually search: "[service] near me", "best / top [service] in [area]", "[service] cost / price in [area]", and comparison pages;');
  L.push('- one page per common long-tail question (its own Q&A page), plus a thorough FAQ and a few genuine guide/article pages.');
  L.push('- Target a large site (roughly 50-100+ pages) built from real query coverage.');
  L.push('- CRITICAL quality guardrail: every page must have UNIQUE, substantial, genuinely useful content that truly answers its query. NEVER doorway or thin pages, and NEVER the same template with only the location word swapped — search engines penalise that, and it defeats the purpose. Real value per page is what makes the scale rank.');
  L.push('- Interlink related pages (service <-> area <-> question) so users and crawlers navigate the depth.');

  L.push('');
  L.push('## Features');
  if (a('features')) L.push(`Include: ${a('features')}.`);
  if (wa) L.push(`- WhatsApp button links to https://wa.me/${wa.replace(/\D/g, '')}.`);
  if (a('phone')) L.push(`- Click-to-call uses tel:${a('phone').replace(/\s/g, '')}.`);
  if (a('address')) L.push(`- Embed a Google Map for: ${a('address')}.`);

  L.push('');
  L.push('## Design');
  if (a('style')) L.push(`- Style: ${a('style')}`);
  if (a('palette')) L.push(`- Color mood: ${a('palette')}`);
  if (a('colors')) L.push(`- Use these colors: ${a('colors')}`);
  if (a('fonts')) L.push(`- Typography feel: ${a('fonts')}`);
  if (a('has_logo')) L.push(`- Logo: ${a('has_logo')}`);
  if (a('likes')) L.push(`- Reference sites the client likes: ${a('likes')}`);
  if (a('dislikes')) L.push(`- Avoid: ${a('dislikes')}`);

  L.push('');
  L.push('## Content (use this real content and write polished copy around it)');
  if (a('services_list')) L.push(`- Services / products: ${a('services_list')}`);
  if (a('usp')) L.push(`- Reasons to choose them: ${a('usp')}`);
  if (a('about_text')) L.push(`- About text: ${a('about_text')}`);
  if (a('testimonials')) L.push(`- Testimonials to feature: ${a('testimonials')}`);
  if (a('must_have_text')) L.push(`- Must appear: ${a('must_have_text')}`);

  L.push('');
  L.push('## SEO');
  if (a('keywords')) L.push(`- Target keywords: ${a('keywords')}`);
  if (a('common_questions')) L.push(`- Questions customers ask (give each its own answer page, and infer more like them): ${a('common_questions').replace(/\n/g, ' | ')}`);
  if (seoAreas) L.push(`- Target locations (and their nearby localities/suburbs): ${seoAreas}`);
  if (a('competitors')) L.push(`- Competitors to outdo: ${a('competitors')}`);
  L.push('- Give every page a unique, keyword-rich <title> and meta description.');
  L.push('- Use semantic HTML headings, alt text, and clean URLs.');
  L.push('- Add LocalBusiness JSON-LD schema (name, address, phone, hours, areas served), plus sitemap.xml and robots.txt.');
  L.push('');
  L.push('## AEO + GEO (optimise for AI answer engines, not just Google search)');
  L.push('- AEO: add FAQPage JSON-LD and write clear, factual, self-contained answers to the real questions customers ask, so answer engines can quote them directly.');
  L.push('- GEO: state the business entity unambiguously (who, what, exactly where, since when, what makes it credible) and include "best/top [service] in [area]"-style answer content, so ChatGPT, Perplexity and Google AI Overviews can confidently cite this site.');
  L.push('- Add an llms.txt at the site root summarising the business, its services, areas served, and contact, for AI crawlers.');

  L.push('');
  L.push('## Contact (put in footer and on the contact page)');
  for (const [k, lbl] of [['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['address', 'Address'], ['hours', 'Hours'], ['socials', 'Social links']]) {
    if (a(k)) L.push(`- ${lbl}: ${a(k)}`);
  }
  if (a('domain')) L.push(`- Intended domain: ${a('domain')}`);

  L.push('');
  L.push('## Requirements');
  L.push('- Plain HTML, CSS and a little vanilla JS. No build step; it should work by opening index.html.');
  L.push('- Mobile-first, fully responsive, fast-loading and accessible.');
  L.push('- Consistent header with navigation and a footer on every page; clear calls to action throughout.');
  L.push('- Premium, polished, original visual design. Cohesive color and type system based on the design notes above.');
  L.push('- Use tasteful, clearly-marked placeholder images where the client photos/logo will go (they will be supplied separately via ' + (a('assets_via') || 'WhatsApp/email') + ').');
  L.push('- Write real, specific marketing copy for this exact business, not lorem ipsum.');
  L.push('- Deliver every listed page, fully built and linked.');
  if (a('notes')) { L.push(''); L.push(`## Client notes`); L.push(a('notes')); }

  return L.join('\n');
}

export const REQUIRED_KEYS = form_required();
function form_required() { return FORM.flatMap((s) => s.fields).filter((f) => f.required).map((f) => f.key); }
