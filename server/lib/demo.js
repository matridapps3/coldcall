// Personalized sales-demo build prompt.
//
// The caller requests a demo for a lead; this produces a comprehensive prompt the
// caller pastes to the developer (via Google Chat). The dev runs it through Claude
// Code, gets a polished multi-page site, deploys it on Vercel, and sends the link
// back. The goal: a site that looks like a real agency built it for THIS business,
// not a generic AI template, so the owner is wowed when they see their own name.

// Per-vertical page + content guidance the prompt injects.
const VERTICAL = {
  'CA Firms': {
    kind: 'chartered accountancy / CA firm',
    pages: 'Home, About the firm, Services (Income Tax, GST, Audit & Assurance, ROC/Company compliance, Bookkeeping, Advisory), Team, Resources (a few article stubs on tax deadlines), Contact',
    detail: 'Services with short factual descriptions and "who it is for". Keep it ICAI-appropriate: professional, factual, credibility-first, NO "best CA" or guarantee claims. Partner/team section with plausible credentials (CA, years of experience). A trust strip: years in practice, clients served, response time.',
    vibe: 'trustworthy, clean, corporate-professional; navy/slate + a restrained accent; serif or grotesk headings',
  },
  Salons: {
    kind: 'unisex salon / beauty parlour',
    pages: 'Home, About, Services with a real price list (Haircut, Colour, Facial, Cleanup, Bridal makeup, Threading, Spa), Gallery, Testimonials, Book Appointment, Contact',
    detail: 'A proper services price list in INR. A strong photo gallery of work. Real-sounding local testimonials with Indian names and areas. A prominent "Book on WhatsApp / Call" CTA. Opening hours.',
    vibe: 'warm, stylish, aspirational; soft or bold palette that feels premium salon; elegant modern type; lots of imagery',
  },
  Cafes: {
    kind: 'cafe / coffee shop',
    pages: 'Home, About / Our Story, Menu (categorised with prices), Gallery, Reviews, Visit Us (map + hours), Contact',
    detail: 'A real, categorised menu with INR prices (coffee, shakes, snacks, meals). Big appetising photos. Ambience shots. Google-reviews-style testimonials. Direct "Order on WhatsApp" and "Get Directions" CTAs. Hours + location.',
    vibe: 'cosy, inviting, contemporary cafe; warm earthy or fresh palette; friendly rounded-but-refined type; food-photo led',
  },
  Photographers: {
    kind: 'wedding and event photographer / photography studio',
    pages: 'Home, Portfolio (categorised galleries: Weddings, Pre-wedding, Events, Candid), About the photographer, Packages, Testimonials, Enquire / Book',
    detail: 'This is a PORTFOLIO site, so photography leads everything: full-bleed hero image, large gallery grids with lightbox behaviour, minimal chrome. Pull their real work from Instagram if findable; otherwise use gorgeous, believable Indian wedding photography placeholders (clearly replaceable). Packages section with realistic INR ranges (e.g. wedding, pre-wedding, events) marked "starting at". Couple testimonials with Indian names. A strong "Check date availability on WhatsApp" CTA. Their Instagram linked prominently.',
    vibe: 'cinematic and editorial; near-black or warm ivory canvas that makes photos glow; elegant restrained serif + clean sans; generous whitespace; the photos ARE the design',
  },
  Coaching: {
    kind: 'coaching institute / tuition classes',
    pages: 'Home, About & Faculty, Courses and Batches (with class/subject and fee structure), Results / Toppers, Student & Parent Testimonials, Admission Enquiry, Contact',
    detail: 'Parents vet an institute online before admission, so credibility leads: years teaching, results and toppers (realistic names, percentages/ranks, clearly demo), faculty qualifications, batch timings table, fee structure in INR. A prominent "Book a free demo class" CTA and an admission-enquiry form. Photos of classrooms/students studying (tasteful stock).',
    vibe: 'bright, credible, education-forward; deep blue or green + a warm accent; clear structured layout that feels like a serious institution, not a startup',
  },
  Clinics: {
    kind: 'clinic / medical practice (doctor, dentist, physio or diagnostic centre)',
    pages: 'Home, About the Doctor(s) (qualifications, experience, registration), Services & Treatments, Book Appointment, Patient Information / FAQ, Testimonials, Contact & Timings',
    detail: 'Patients Google a doctor before visiting, so trust leads: qualifications (MBBS/MD/BDS etc.), years of experience, memberships, clinic photos. Services described factually and calmly with NO exaggerated medical claims, no "guaranteed cure", no before/after promises. Consultation timings table, "Book appointment on WhatsApp / Call" CTAs, emergency contact line, map. Patient testimonials kept modest and believable.',
    vibe: 'clean, calm, clinical trust; white with a soft medical blue or green; airy spacing, legible humanist type; feels hygienic and professional, never salesy',
  },
};

export function buildDemoPrompt(company, verticalName, opts = {}) {
  const v = VERTICAL[verticalName] || { kind: 'local business', pages: 'Home, About, Services, Gallery, Contact', detail: 'Services, gallery, testimonials, contact.', vibe: 'clean, modern, premium; a palette that fits the business' };
  const area = opts.area ? ` in ${opts.area}` : ' (find their city/area online)';
  const phone = opts.phone ? opts.phone : '(use their real number if found online, else a clear placeholder)';

  return `Build a complete, premium, multi-page DEMO website for a real Indian ${v.kind} called "${company}"${area}.

This is a SALES DEMO to wow the owner, so it must look like a real agency built it specifically for THEIR business. It must NOT look AI-generated or like a template.

## Research first (do this before writing any code)
Use your web search / browsing tools to look up "${company}"${opts.area ? ` ${opts.area}` : ''} on Google, Google Maps, JustDial, Instagram and Facebook. Pull whatever REAL details exist: exact area/locality, full address, actual services or menu with prices, opening hours, phone, and the style of their photos and reviews. Put the real business name everywhere and use the real facts you find. Where the business has a thin online footprint, infer realistic, specific details for a ${v.kind} in that area (do not leave blanks and do not use lorem ipsum). If you cannot search the web in this run, tell the operator so, then build from sensible inferred details.

## Pages (each its own file, shared header/nav + footer)
${v.pages}

## Make it NOT look AI-generated (this is the whole point)
- No "Welcome to ${company}" hero. Open with a real, specific value line in the owner's voice.
- No generic 3-identical-feature-card row, no stocky gradient hero, no emoji spam, no lorem.
- Vary the section layouts down the page (alternating image/text, a real list, a gallery, a quote) — do not repeat one card grid.
- Write specific, human copy with local flavour: area names, "since 20XX", real-sounding service names, actual INR prices.
- Real-feeling testimonials with Indian names + localities (clearly demo, but believable).
- Use tasteful, relevant photography (Unsplash/Pexels-style images appropriate to a ${v.kind}) so it looks alive, not empty.
- One cohesive, original design system: ${v.vibe}. Mobile-first, fast, accessible.

## Vertical specifics
${v.detail}

## SEO
Local keywords ("${v.kind} in [area]"), a unique keyword-rich <title> + meta description per page, semantic headings, LocalBusiness JSON-LD (name, address, phone, hours), sitemap.xml. Add a short FAQ with FAQPage JSON-LD and clear self-contained answers (AEO — so AI answer engines can cite it). Note: this demo is a small slice; the final site is a large 100+ page, SEO + AEO + GEO optimised build.

## Contact & CTAs
Phone: ${phone}. Add WhatsApp click-to-chat, a Google Map embed for the address, and a simple enquiry form. Clear calls to action throughout.

## Tech (must deploy on Vercel instantly)
Plain HTML, CSS and a little vanilla JS. NO build step, NO framework — it must work by opening index.html and deploy on Vercel as a static site with zero config. Put everything in one folder, all pages linked.

Deliver every page fully built, polished, original, and linked. Aim for "a real premium agency made this for us", not "an AI generated this".`;
}

// The WhatsApp message the caller sends once the demo link is back. It deliberately
// sets the expectation that the demo is only a small fraction of the real site, so a
// quick demo still impresses and anticipation for the full build goes up.
export function buildDemoMessage(company, url, caller) {
  return `${company} ji, humne aapke business ke liye ek quick demo bana ke rakha hai, zara dekhiye: ${url}\n\n` +
    `Dhyaan rahe, ye aapki final website ka sirf 10 percent hai, jaldi mein banaya. Asli site isse kai guna behtar aur detailed hogi, ` +
    `aapki apni photos, content aur branding ke saath. Agar ye chhoti si jhalak bhi pasand aayi, toh poori site aaj raat tak aapke naam se ` +
    `live kar dete hain, sirf 4,000 aaj (regular 6,000), koi advance nahi.\n` +
    `${caller ? caller + ', ' : ''}SiteBhai (IIT Madras + IIM founder ki company).\nReply STOP to opt out.`;
}
