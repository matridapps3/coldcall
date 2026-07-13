// Starter campaign content for the three SiteBhai verticals. All Hinglish.
//
// Grounded in real call data: pickup low, most answers non-committal ("btaayenge"),
// refusal rare, and the WhatsApp message converts. THE CALL'S ONLY JOB IS TO EARN
// "haan, WhatsApp pe bhej do". The message + a scheduled follow-up closes.
//
// Biggest strength = PRICE + SPEED. These people have wanted a website but agencies
// charge 10-15k. We do it for 4,000, live the same night. That is a no-brainer.
// Urgency lever: "aaj shuru karein toh 4,000, warna regular 6,000".
//
// Offer: done-for-you website, aaj raat tak live, Rs 4,000 (regular 6,000), hosted
// free on a Vercel subdomain, koi monthly fee. RISK-REVERSAL: "pay after you see it"
// (pasand aaye tabhi paise) — the biggest close lever, woven throughout. Google
// Business + WhatsApp Business setup are now FREE with every website (were a paid
// add-on) — a sweetener that lifts close rate and justifies the higher site price.
// Own domain ADD-ON: standard .in/.com Rs 1,499 y1 + Rs 1,800/yr renewal (in client
// name, DNS managed by us); premium/unusual TLDs quote actual, or client buys their
// own and we connect free. Custom Ops tool from 7,999, minor changes FREE, major 1,499+.
// No em dashes, minimal emoji. Vars: {{company}}, {{caller}}, {{phone}}. Every
// WhatsApp template carries a STOP opt-out line.

const SAMPLE = 'conyso.com';

// Packages + care plans (mode-agnostic). Sent on request when a prospect asks for
// bigger options. The cold-call pitch stays the simple Starter hook (4,000 tonight);
// this is the anchor-and-upsell ladder. Growth is the "most popular" middle.
const PLANS_BODY =
  "{{company}}, humare packages:\n\n" +
  "STARTER — 4,000 aaj / 6,000 regular: bespoke 100+ page website (competitors 5-10 dete hain), SEO + AEO + GEO optimised (Google AUR AI dono pe dikhein), mobile-friendly, fast subdomain, Google Business + WhatsApp setup FREE, enquiry + WhatsApp chat. Pay after you see it.\n\n" +
  "GROWTH — 8,999 aaj / 11,999 regular (sabse popular): Starter + apna domain (pehla saal, aapke naam) + extra pages/sections + online booking/enquiry + 1 saal Care Plan free.\n\n" +
  "PRO — 15,999 aaj / 19,999 regular: Growth + custom booking/ops tool (appointments, orders, billing, dashboard) + priority build aur support + 1 saal Care.\n\n" +
  "CARE PLANS (site live hone ke baad, ongoing):\n" +
  "Basic Care — 3,999/saal: unlimited chhote changes, monthly content update, Google upkeep, priority support.\n" +
  "Care+ — 7,999/saal: Basic + quarterly refresh, seasonal campaigns, monthly Google posts, simple analytics report.\n\n" +
  "Alag se bhi le sakte hain: apna domain 1,499 (pehla saal) phir ~1,800/saal; custom tool 7,999 se; bade changes 1,499 se; chhote changes hamesha FREE.\n" +
  "Reply STOP to opt out.";

// 8-touch cadence over ~2 weeks with ESCALATING, varied content: each WhatsApp is
// different (sample -> follow-up -> more-examples -> break-up), interleaved with
// calls, so a ghost never gets the same nudge twice and the last touch is a
// loss-aversion break-up.
const STEPS = (sampleKey, followupKey, samplesKey, breakupKey) => [
  { kind: 'call',     title: 'Opening call',          day_delay: 0, template: null,       rules: { no_answer: 'advance' } },
  { kind: 'whatsapp', title: 'Their demo (or sample)',  day_delay: 0, template: sampleKey,   rules: { no_answer: 'advance' } },
  { kind: 'call',     title: 'Follow-up call',        day_delay: 2, template: null,       rules: { no_answer: 'advance' } },
  { kind: 'whatsapp', title: 'WhatsApp follow-up',     day_delay: 2, template: followupKey, rules: { no_answer: 'advance' } },
  { kind: 'call',     title: 'Follow-up call 2',      day_delay: 3, template: null,       rules: { no_answer: 'advance' } },
  { kind: 'whatsapp', title: 'WhatsApp more examples', day_delay: 3, template: samplesKey,  rules: { no_answer: 'advance' } },
  { kind: 'call',     title: 'Last call',             day_delay: 4, template: null,       rules: { no_answer: 'advance', interested: 'callback' } },
  { kind: 'whatsapp', title: 'Break-up (last chance)', day_delay: 2, template: breakupKey,  rules: { no_answer: 'lost', interested: 'callback' } },
];

// Shared objection nodes (generic, reused in every vertical's flow). Each funnels
// back to sending the sample, since the call's job is to earn the WhatsApp yes.
const OBJECTION_NODES = [
  { key: 'no_need', title: 'Not needed', say:
    '"Abhi zaroorat nahi lagti, samajh sakta hoon. Par jab koi Google pe aapko dhoondhta hai aur kuch dhang ka nahi milta, wo competitor ke paas chala jaata hai. Ek sample bhej deta hoon, free mein dekh lijiye, koi risk nahi, pasand aaye tabhi paise."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Sach mein nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'ask_partner', title: 'Ask partner / family', say:
    '"Bilkul, decision saath mein hona chahiye. Isiliye main aapka apna demo bana ke bhej deta hoon — aap dono use aaram se dekh lijiye, baat karna aasan ho jayega. Pasand aaye tabhi 4,000, koi advance nahi. Do din baad ek chhota follow up karunga."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'no_budget', title: 'No budget', say:
    '"Samajh sakta hoon. Par socho — paise tabhi dene hain jab site ban ke saamne ho aur pasand aaye, advance kuch nahi. Toh budget ka risk toh hai hi nahi. Aur 4,000 toh ek-do nayi enquiry se nikal jaata hai. Main aapka demo bana ke bhej doon?"',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Abhi nahi', to: 'btaayenge' },
    ] },
  { key: 'trust', title: 'Trust / who are you', say:
    'Trust is the real question. Give the credential straight, then seal it with pay-after.\n\n"Bilkul poochhiye, poochhna chahiye. SiteBhai, IIT Madras aur IIM se padhe founder Krishna Chagti ki company Conyso ka hissa hai. Koi ek-din-ka freelancer ya fraud nahi. Aur isiliye toh hum pehle bana ke dikhate hain, paise baad mein, jab aapko sach mein theek lage. Chahein toh conyso.com/founder pe humare founder ko khud dekh lijiye. Main sample bhej doon?"',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
];

const CA_FLOW = [
  { key: 'confirm', entry: true, title: 'Confirm identity', say:
    'First just confirm you have reached the right place. Do not pitch yet — get a micro-yes.\n\n"Namaste, {{company}} se baat ho rahi hai?"',
    options: [
      { label: 'Haan, boliye', to: 'opening' },
      { label: 'Galat number / kaun chahiye', outcome: 'wrong_number' },
      { label: 'Wo abhi available nahi', to: 'busy' },
    ] },
  { key: 'opening', title: 'Pitch', say:
    'Confirmed. Now intro + offer, natural tone. Only get a yes to a WhatsApp; do not close on the call.\n\n"{{caller}} baat kar raha hoon SiteBhai se, bas ek minute lunga. Ye IIT Madras aur IIM se padhe founder ki company hai. Baat ye hai ki aapki CA firm ka apna website nahi hai, aur aaj kal naye clients CA ka naam pehle Google pe check karte hain, na mile toh doosri firm ke paas chale jaate hain. Hum bana dete hain, poora professional, ICAI-compliant, aaj raat tak live. Baaki agencies iske 10-15 hazaar lete hain, hum sirf 4,000 mein. Aur risk koi nahi, hum bana ke dikha denge, pasand aaye tabhi paise. Main ek sample aur pricing WhatsApp pe bhej doon? Aaram se dekh lijiyega."',
    options: [
      { label: 'Haan, WhatsApp pe bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka / kya exactly?', to: 'price' },
      { label: 'Sochenge / btaayenge', to: 'btaayenge' },
      { label: 'Ye kya cheez hai?', to: 'explain' },
      { label: 'Abhi busy hoon', to: 'busy' },
      { label: 'Zaroorat nahi hai', to: 'no_need' },
      { label: 'Partner/ghar se poochna hai', to: 'ask_partner' },
      { label: 'Abhi budget nahi', to: 'no_budget' },
      { label: 'Aap kaun ho / bharosa kaise?', to: 'trust' },
      { label: 'Nahi chahiye', to: 'not_interested' },
      { label: 'Wrong number', outcome: 'wrong_number' },
      { label: 'Dobara call mat karna', outcome: 'dnc' },
    ] },
  { key: 'explain', title: 'What we do', say:
    '"Hum CA firms ka website banate hain, aapki services, partners aur contact, sab ICAI rules ke andar. Aaj raat tak live, hosting free. Agencies 10 hazaar se kam nahi lete, hum 4,000 mein. Ek sample WhatsApp pe bhej deta hoon, dekh lijiye."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka?', to: 'price' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price', title: 'Price', say:
    '"4,000 ek baar, koi monthly fee nahi, hosting free. Isi kaam ke agencies 10-15 hazaar lete hain. Aur ek baat, aaj shuru karein toh 4,000, warna regular 6,000 hai. Poori detail WhatsApp pe bhej deta hoon."',
    options: [
      { label: 'Theek hai detail bhejo', to: 'send_sample', template: 'details' },
      { label: 'Mehenga hai', to: 'price_push' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price_push', title: 'Price hold', say:
    'Discount mat do, 4,000 already lowest hai. Anchor use karo.\n\n"Sir 4,000 toh already sabse kam hai, market mein koi 10 hazaar se neeche nahi karta. Ek baar ka kharcha, hamesha aapka, koi monthly nahi. Main sample bhej deta hoon, dekh ke decide kar lijiye, koi pressure nahi."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Phir bhi sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'btaayenge', title: 'Will get back', say:
    'Most common answer. Do not push — give a light loss-frame, send their own demo (endowment), then follow up.\n\n"Bilkul, koi jaldi nahi. Bas ek baat — jab tak site nahi, jo naye clients aapko Google pe dhoondhte hain wo doosri firm ke paas chale jaate hain. Isliye main abhi aapka apna demo bana ke bhej deta hoon, aap aaram se dekhiyega. Pasand aaye tabhi 4,000, aaj wala rate lock, warna 6,000. Do din baad ek chhota follow up karunga, theek hai?"',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'btaayenge' },
      { label: 'Bhej do, dekh lenge', to: 'send_sample', template: 'btaayenge' },
      { label: 'Sach mein nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'busy', title: 'Busy', say:
    '"Koi baat nahi. Main WhatsApp pe bhej deta hoon, fursat mein dekh lijiyega, main follow up karunga. Ya baad mein call karoon?"',
    options: [
      { label: 'WhatsApp pe bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Baad mein call karo', outcome: 'call_back' },
    ] },
  { key: 'send_sample', title: 'Send WhatsApp', say:
    'Send the sample first (Send on WhatsApp), then hit "Demo banwa do". Their own demo closes best, and that goes out as the 2nd touch. Most will say "Will get back", which auto-schedules a follow-up in 2 days.\n\n"Ek sample bhej diya, aur aapki firm ka apna demo bhi bana ke bhej raha hoon, thodi der mein WhatsApp pe aa jayega."',
    options: [
      { label: 'Demo banwa do (unka apna)', demo: true },
      { label: 'Bhej diya, dekh lenge', outcome: 'will_revert' },
      { label: 'Abhi interested hain', to: 'interested' },
      { label: 'Ready hain, shuru karo', outcome: 'meeting_booked' },
    ] },
  { key: 'interested', title: 'Interested', say:
    '"Badhiya sir. Aaj raat tak live kar dunga, aaj wala 4,000 rate lock. Confirm karte hi main ek chhota form WhatsApp pe bhej dunga (2 min), usme aap firm ki detail, services aur email khud bhar denge, aur hum kaam shuru. Chalein?"',
    options: [
      { label: 'Confirm, shuru karo', outcome: 'meeting_booked' },
      { label: 'Pehle demo bana ke bhejo', demo: true },
      { label: 'Checklist WhatsApp pe bhejo', to: 'send_sample', template: 'details' },
      { label: 'Ruko, sochta hoon', to: 'btaayenge' },
    ] },
  { key: 'not_interested', title: 'Not interested', say:
    'Kam hota hai. Warm raho, sample phir bhi bhejo.\n\n"Koi baat nahi sir. Ek sample bhej deta hoon, kaam aaye toh. Time dene ke liye shukriya."',
    options: [
      { label: 'Phir bhi ek message bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Not interested mark karo', outcome: 'not_interested' },
    ] },
  ...OBJECTION_NODES,
];

const SALON_FLOW = [
  { key: 'confirm', entry: true, title: 'Confirm identity', say:
    'Just confirm you have reached the right place. Get a micro-yes, then pitch.\n\n"Namaste, {{company}} se baat ho rahi hai?"',
    options: [
      { label: 'Haan, boliye', to: 'opening' },
      { label: 'Galat number / kaun chahiye', outcome: 'wrong_number' },
      { label: 'Wo abhi available nahi', to: 'busy' },
    ] },
  { key: 'opening', title: 'Pitch', say:
    'Confirmed. Now intro + offer. Only get a yes to a WhatsApp.\n\n"{{caller}} from SiteBhai, bas ek minute. Ye IIT Madras aur IIM se padhe founder ki company hai. Aapke salon ka apna website nahi hai, aur log "salon near me" Google karke book karte hain; aap na dikhein toh booking paas wale salon ko chali jaati hai. Hum bana dete hain online booking aur Google Maps ke saath, aaj raat tak live. Baaki agencies 10-15 hazaar lete hain, hum sirf 4,000 mein. Aur risk koi nahi, hum bana ke dikha denge, pasand aaye tabhi paise. Ek sample WhatsApp pe bhej doon, dekh lijiyega?"',
    options: [
      { label: 'Haan, WhatsApp pe bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka hai?', to: 'price' },
      { label: 'Sochenge / btaayenge', to: 'btaayenge' },
      { label: 'Ye kya cheez hai?', to: 'explain' },
      { label: 'Abhi busy hoon', to: 'busy' },
      { label: 'Zaroorat nahi hai', to: 'no_need' },
      { label: 'Partner/ghar se poochna hai', to: 'ask_partner' },
      { label: 'Abhi budget nahi', to: 'no_budget' },
      { label: 'Aap kaun ho / bharosa kaise?', to: 'trust' },
      { label: 'Nahi chahiye', to: 'not_interested' },
      { label: 'Wrong number', outcome: 'wrong_number' },
      { label: 'Dobara call mat karna', outcome: 'dnc' },
    ] },
  { key: 'explain', title: 'What we do', say:
    '"Aapke salon ki website online booking aur Google Maps ke saath, taaki log salon near me search karke seedha aapko book karein. Aaj raat tak live, hosting free. Agencies 10 hazaar+ lete hain, hum 4,000 mein. Sample bhej deta hoon."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka?', to: 'price' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price', title: 'Price', say:
    '"4,000 ek baar, koi monthly nahi, hosting free. Agencies isi ke 10-15 hazaar lete hain. Aur aaj shuru karein toh 4,000, warna regular 6,000. Poori detail WhatsApp pe bhej deta hoon."',
    options: [
      { label: 'Theek hai detail bhejo', to: 'send_sample', template: 'details' },
      { label: 'Mehenga hai', to: 'price_push' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price_push', title: 'Price hold', say:
    'Discount mat do, 4,000 already lowest hai.\n\n"4,000 toh already sabse kam hai, koi 10 hazaar se neeche nahi karta. Ek baar ka, hamesha aapka, koi monthly nahi. Ek do nayi booking se nikal jaata hai. Sample bhej deta hoon, dekh lena."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Phir bhi sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'btaayenge', title: 'Will get back', say:
    'Most common. Do not push — light loss-frame, their own demo (endowment), follow up.\n\n"Bilkul, koi jaldi nahi. Bas ek baat — log aapke area mein aapke jaisa business Google pe dhoondhte hain; aap na dikhein toh paas wale ke paas chale jaate hain. Isliye main abhi aapka apna demo bana ke bhej deta hoon, aaram se dekhiye. Pasand aaye tabhi 4,000, aaj wala rate lock, warna 6,000. Do din baad ek chhota follow up karunga."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'btaayenge' },
      { label: 'Bhej do, dekh lenge', to: 'send_sample', template: 'btaayenge' },
      { label: 'Sach mein nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'busy', title: 'Busy', say:
    '"Koi baat nahi. Main WhatsApp pe bhej deta hoon, fursat mein dekh lijiyega. Ya baad mein call karoon?"',
    options: [
      { label: 'WhatsApp pe bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Baad mein call karo', outcome: 'call_back' },
    ] },
  { key: 'send_sample', title: 'Send WhatsApp', say:
    'Send the sample first (Send on WhatsApp), then hit "Demo banwa do". Their own demo closes best, and that goes out as the 2nd touch. Most will say "Will get back", which auto-schedules a follow-up in 2 days.\n\n"Ek sample bhej diya, aur aapke business ka apna demo bhi bana ke bhej raha hoon, thodi der mein WhatsApp pe aa jayega."',
    options: [
      { label: 'Demo banwa do (unka apna)', demo: true },
      { label: 'Bhej diya, dekh lenge', outcome: 'will_revert' },
      { label: 'Abhi interested hain', to: 'interested' },
      { label: 'Ready hain, shuru karo', outcome: 'meeting_booked' },
    ] },
  { key: 'interested', title: 'Interested', say:
    '"Badhiya. Aaj raat tak live kar dunga, aaj wala 4,000 rate lock. Confirm karte hi main ek chhota form bhej dunga (2 min), usme aap salon ki detail, services aur 4-5 photos daal denge, aur hum kaam shuru. Chalein?"',
    options: [
      { label: 'Confirm, shuru karo', outcome: 'meeting_booked' },
      { label: 'Pehle demo bana ke bhejo', demo: true },
      { label: 'WhatsApp pe list bhejo', to: 'send_sample', template: 'details' },
      { label: 'Ruko, sochte hain', to: 'btaayenge' },
    ] },
  { key: 'not_interested', title: 'Not interested', say:
    '"Koi baat nahi. Ek sample bhej deta hoon, kaam aaye toh. Time dene ke liye shukriya."',
    options: [
      { label: 'Phir bhi ek message bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Not interested mark karo', outcome: 'not_interested' },
    ] },
  ...OBJECTION_NODES,
];

const CAFE_FLOW = [
  { key: 'confirm', entry: true, title: 'Confirm identity', say:
    'Just confirm you have reached the right place. Get a micro-yes, then pitch.\n\n"Namaste, {{company}} se baat ho rahi hai?"',
    options: [
      { label: 'Haan, boliye', to: 'opening' },
      { label: 'Galat number / kaun chahiye', outcome: 'wrong_number' },
      { label: 'Wo abhi available nahi', to: 'busy' },
    ] },
  { key: 'opening', title: 'Pitch', say:
    'Confirmed. Now intro + offer. Only get a yes to a WhatsApp.\n\n"{{caller}} from SiteBhai, bas ek minute. Ye IIT Madras aur IIM se padhe founder ki company hai. Aapke cafe ka apna website nahi hai. Hum bana dete hain menu, photos aur Google Maps ke saath, direct orders bina Zomato commission ke, aaj raat tak live. Agencies 10-15 hazaar lete hain, hum sirf 4,000 mein. Aur risk koi nahi, hum bana ke dikha denge, pasand aaye tabhi paise. Sample WhatsApp pe bhej doon?"',
    options: [
      { label: 'Haan, WhatsApp pe bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka hai?', to: 'price' },
      { label: 'Sochenge / btaayenge', to: 'btaayenge' },
      { label: 'Ye kya cheez hai?', to: 'explain' },
      { label: 'Abhi busy hoon', to: 'busy' },
      { label: 'Zaroorat nahi hai', to: 'no_need' },
      { label: 'Partner/ghar se poochna hai', to: 'ask_partner' },
      { label: 'Abhi budget nahi', to: 'no_budget' },
      { label: 'Aap kaun ho / bharosa kaise?', to: 'trust' },
      { label: 'Nahi chahiye', to: 'not_interested' },
      { label: 'Wrong number', outcome: 'wrong_number' },
      { label: 'Dobara call mat karna', outcome: 'dnc' },
    ] },
  { key: 'explain', title: 'What we do', say:
    '"Aapke cafe ki website menu, photos aur Google Maps ke saath, aur direct WhatsApp orders bina commission ke. Log cafe near me search karke aapko dhoondh lenge. Aaj raat tak live. Agencies 10 hazaar+ lete hain, hum 4,000 mein. Sample bhej deta hoon."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka?', to: 'price' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price', title: 'Price', say:
    '"4,000 ek baar, koi monthly nahi, koi order commission nahi, hosting free. Ek hafte ke Zomato commission se bhi kam. Aur aaj shuru karein toh 4,000, warna regular 6,000. Detail WhatsApp pe bhej deta hoon."',
    options: [
      { label: 'Theek hai detail bhejo', to: 'send_sample', template: 'details' },
      { label: 'Mehenga hai', to: 'price_push' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price_push', title: 'Price hold', say:
    'Discount mat do, 4,000 already lowest hai.\n\n"4,000 toh already sabse kam hai, koi 10 hazaar se neeche nahi karta. Ek baar ka, hamesha aapka, koi monthly ya commission nahi. Zomato toh har order pe kaatta hai. Sample bhej deta hoon, dekh lena."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Phir bhi sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'btaayenge', title: 'Will get back', say:
    'Most common. Do not push — light loss-frame, their own demo (endowment), follow up.\n\n"Bilkul, koi jaldi nahi. Bas ek baat — log aapke area mein aapke jaisa business Google pe dhoondhte hain; aap na dikhein toh paas wale ke paas chale jaate hain. Isliye main abhi aapka apna demo bana ke bhej deta hoon, aaram se dekhiye. Pasand aaye tabhi 4,000, aaj wala rate lock, warna 6,000. Do din baad ek chhota follow up karunga."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'btaayenge' },
      { label: 'Bhej do, dekh lenge', to: 'send_sample', template: 'btaayenge' },
      { label: 'Sach mein nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'busy', title: 'Busy', say:
    '"Koi baat nahi. Main WhatsApp pe bhej deta hoon, fursat mein dekh lijiyega. Ya baad mein call karoon?"',
    options: [
      { label: 'WhatsApp pe bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Baad mein call karo', outcome: 'call_back' },
    ] },
  { key: 'send_sample', title: 'Send WhatsApp', say:
    'Send the sample first (Send on WhatsApp), then hit "Demo banwa do". Their own demo closes best, and that goes out as the 2nd touch. Most will say "Will get back", which auto-schedules a follow-up in 2 days.\n\n"Ek sample bhej diya, aur aapke business ka apna demo bhi bana ke bhej raha hoon, thodi der mein WhatsApp pe aa jayega."',
    options: [
      { label: 'Demo banwa do (unka apna)', demo: true },
      { label: 'Bhej diya, dekh lenge', outcome: 'will_revert' },
      { label: 'Abhi interested hain', to: 'interested' },
      { label: 'Ready hain, shuru karo', outcome: 'meeting_booked' },
    ] },
  { key: 'interested', title: 'Interested', say:
    '"Badhiya. Aaj raat tak live, aaj wala 4,000 rate lock. Confirm karte hi main ek chhota form bhej dunga (2 min), usme aap cafe ki detail, menu aur 4-5 photos daal denge, aur hum kaam shuru. Chalein?"',
    options: [
      { label: 'Confirm, shuru karo', outcome: 'meeting_booked' },
      { label: 'Pehle demo bana ke bhejo', demo: true },
      { label: 'WhatsApp pe list bhejo', to: 'send_sample', template: 'details' },
      { label: 'Ruko, sochte hain', to: 'btaayenge' },
    ] },
  { key: 'not_interested', title: 'Not interested', say:
    '"Koi baat nahi. Ek sample bhej deta hoon. Shukriya."',
    options: [
      { label: 'Phir bhi ek message bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Not interested mark karo', outcome: 'not_interested' },
    ] },
  ...OBJECTION_NODES,
];

// ---- New ICP flows: trades that ALWAYS wanted a site but were priced out. ----
// The wound is named out loud in the opening: "aap kab se chahte the, agencies ne
// 20-25 hazaar bol ke rok diya". The demo of THEIR OWN work is the close.

const PHOTO_FLOW = [
  { key: 'confirm', entry: true, title: 'Confirm identity', say:
    'Just confirm you have reached the right place. Get a micro-yes, then pitch.\n\n"Namaste, {{company}} se baat ho rahi hai?"',
    options: [
      { label: 'Haan, boliye', to: 'opening' },
      { label: 'Galat number / kaun chahiye', outcome: 'wrong_number' },
      { label: 'Wo abhi available nahi', to: 'busy' },
    ] },
  { key: 'opening', title: 'Pitch', say:
    'Confirmed. Name the pain, then offer the demo. Do not close; get a yes to a WhatsApp.\n\n"{{caller}} bol raha hoon SiteBhai se, bas ek minute. Ye IIT Madras aur IIM se padhe founder ki company hai. Aapka kaam maine dekha, kamaal ka hai. Par jab client website ka link maangta hai, toh Instagram hi bhejna padta hai na? Portfolio website ke liye agencies 20-25 hazaar maangti hain, isliye ruki hui hogi. Hum wahi website 4,000 mein banate hain, aapki photos ke saath, aaj raat tak live — aur 5-10 page nahi, poore 100+ pages, taaki aap Google aur AI (ChatGPT wagairah) dono pe upar aayein. Aur paise tabhi, jab bana ke pasand aaye. Main aapke naam se ek demo bana ke WhatsApp karoon?"',
    options: [
      { label: 'Haan, demo bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka hai?', to: 'price' },
      { label: 'Instagram pe portfolio hai', to: 'insta' },
      { label: 'Sochenge / btaayenge', to: 'btaayenge' },
      { label: 'Ye kya cheez hai?', to: 'explain' },
      { label: 'Abhi busy hoon / shoot pe hoon', to: 'busy' },
      { label: 'Zaroorat nahi hai', to: 'no_need' },
      { label: 'Partner/ghar se poochna hai', to: 'ask_partner' },
      { label: 'Abhi budget nahi', to: 'no_budget' },
      { label: 'Aap kaun ho / bharosa kaise?', to: 'trust' },
      { label: 'Nahi chahiye', to: 'not_interested' },
      { label: 'Wrong number', outcome: 'wrong_number' },
      { label: 'Dobara call mat karna', outcome: 'dnc' },
    ] },
  { key: 'explain', title: 'What we do', say:
    '"Hum photographers ke liye portfolio website banate hain: aapki best photos ke saath galleries, packages, testimonials, enquiry ka button. Client link kholte hi samajh jaata hai ki aap professional ho. Aaj raat tak live, sirf 4,000, jabki agencies isi ke 20-25 hazaar leti hain. Ek sample bhejta hoon WhatsApp pe."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka?', to: 'price' },
      { label: 'Instagram kaafi hai', to: 'insta' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'insta', title: 'On Instagram', say:
    'This is their #1 excuse. Break it respectfully.\n\n"Instagram accha hai, par wo scroll hai, portfolio nahi. Shaadi ka client 50-60 hazaar de raha hai, wo teen saal purani posts nahi kholta, wo website dekh ke decide karta hai ki aap professional ho ya nahi. Website pe aapka best kaam, packages, reviews, sab ek jagah. Aur aapke competitors jo bade packages le rahe hain, unki website hai. Demo bana ke dikhaun, aapki hi photos ke saath?"',
    options: [
      { label: 'Theek hai, demo bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka?', to: 'price' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price', title: 'Price', say:
    '"4,000 ek baar, bas. Koi monthly fee nahi, hosting free. Wahi kaam agencies 20-25 hazaar mein karti hain, isliye toh ab tak nahi banayi aapne. Aur aaj shuru karein toh 4,000, warna regular 6,000. Ek shaadi ki booking se sau guna wasool ho jaata hai. Poori detail WhatsApp pe bhejta hoon."',
    options: [
      { label: 'Theek hai detail bhejo', to: 'send_sample', template: 'details' },
      { label: 'Mehenga hai', to: 'price_push' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price_push', title: 'Price hold', say:
    'No discount. Do the math on one booking.\n\n"Sir, aapki ek wedding booking kitne ki hai, 40-50 hazaar? Website 4,000 ki hai, ek baar. Agar saal mein ek extra booking bhi laayi, toh 20 guna paisa wasool. Aur paise bhi tabhi dena jab bana ke pasand aaye. Demo bhejta hoon, dekh lo pehle."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Phir bhi sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'btaayenge', title: 'Will get back', say:
    'Most common. Do not push — demo (endowment) + loss + season + follow up.\n\n"Bilkul, aaram se sochiye. Main aapke naam se demo bana ke WhatsApp kar deta hoon, dekh ke hi decide karna. Bas do baatein: (1) client website ka link maangta hai, sirf Instagram pe serious nahi lagta, wo doosre photographer ko chun leta hai. (2) Wedding season ki enquiries shuru hone se pehle live ho jao toh poora season ka fayda. Pasand aaye tabhi 4,000, aaj wala rate lock, warna 6,000. Do din baad follow up karunga."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'btaayenge' },
      { label: 'Bhej do, dekh lenge', to: 'send_sample', template: 'btaayenge' },
      { label: 'Sach mein nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'busy', title: 'Busy / on a shoot', say:
    '"Bilkul samajh sakta hoon, shoot ke beech disturb nahi karunga. Main WhatsApp pe demo aur detail bhej deta hoon, pack-up ke baad dekh lena. Ya kal kis time call karoon?"',
    options: [
      { label: 'WhatsApp pe bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Baad mein call karo', outcome: 'call_back' },
    ] },
  { key: 'send_sample', title: 'Send WhatsApp', say:
    'Send the sample first, then hit "Demo banwa do". Their own photo demo closes best, and that goes out as the 2nd touch.\n\n"Ek sample bhej diya, aur aapka apna portfolio demo bhi bana ke bhej raha hoon, thodi der mein WhatsApp pe aa jayega."',
    options: [
      { label: 'Demo banwa do (unka apna)', demo: true },
      { label: 'Bhej diya, dekh lenge', outcome: 'will_revert' },
      { label: 'Abhi interested hain', to: 'interested' },
      { label: 'Ready hain, shuru karo', outcome: 'meeting_booked' },
    ] },
  { key: 'interested', title: 'Interested', say:
    '"Badhiya! Aaj raat tak aapka portfolio live kar dunga, aaj wala 4,000 rate lock. Confirm karte hi main ek chhota form bhej dunga (2 min), usme aap apni 15-20 best photos, naam aur packages daal denge, aur hum kaam shuru. Chalein?"',
    options: [
      { label: 'Confirm, shuru karo', outcome: 'meeting_booked' },
      { label: 'Pehle demo bana ke bhejo', demo: true },
      { label: 'Photos WhatsApp pe bhejunga', to: 'send_sample', template: 'details' },
      { label: 'Ruko, sochte hain', to: 'btaayenge' },
    ] },
  { key: 'not_interested', title: 'Not interested', say:
    '"Koi baat nahi. Ek sample bhej deta hoon, season se pehle kabhi mann bane toh ready hain hum. Aapke kaam ke liye shubhkamnayein."',
    options: [
      { label: 'Phir bhi ek message bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Not interested mark karo', outcome: 'not_interested' },
    ] },
  ...OBJECTION_NODES,
];

const COACHING_FLOW = [
  { key: 'confirm', entry: true, title: 'Confirm identity', say:
    'Just confirm you have reached the right place. Get a micro-yes, then pitch.\n\n"Namaste, {{company}} se baat ho rahi hai?"',
    options: [
      { label: 'Haan, boliye', to: 'opening' },
      { label: 'Galat number / kaun chahiye', outcome: 'wrong_number' },
      { label: 'Wo abhi available nahi', to: 'busy' },
    ] },
  { key: 'opening', title: 'Pitch', say:
    'Confirmed. Use the parents-Google-you pain, then get a yes to a WhatsApp.\n\n"{{caller}} bol raha hoon SiteBhai se, bas ek minute. Ye IIT Madras aur IIM se padhe founder ki company hai. Aaj kal parent admission se pehle institute ka naam Google karta hai. Bade institutes ki website hai, aur jinki nahi hai unpe bharosa kam ho jaata hai. Website ka socha toh hoga, par agencies 15-20 hazaar maangti hain. Hum wahi website 4,000 mein banate hain, aapke courses, results, faculty ke saath, aaj raat tak live — aur 5-10 page nahi, poore 100+ pages, taaki Google aur AI dono pe aap upar aayein. Paise tabhi, jab pasand aaye. Sample WhatsApp karoon?"',
    options: [
      { label: 'Haan, WhatsApp pe bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka hai?', to: 'price' },
      { label: 'Word of mouth se chalta hai', to: 'wom' },
      { label: 'Sochenge / btaayenge', to: 'btaayenge' },
      { label: 'Ye kya cheez hai?', to: 'explain' },
      { label: 'Abhi class mein hoon / busy', to: 'busy' },
      { label: 'Zaroorat nahi hai', to: 'no_need' },
      { label: 'Partner/ghar se poochna hai', to: 'ask_partner' },
      { label: 'Abhi budget nahi', to: 'no_budget' },
      { label: 'Aap kaun ho / bharosa kaise?', to: 'trust' },
      { label: 'Nahi chahiye', to: 'not_interested' },
      { label: 'Wrong number', outcome: 'wrong_number' },
      { label: 'Dobara call mat karna', outcome: 'dnc' },
    ] },
  { key: 'explain', title: 'What we do', say:
    '"Hum coaching institutes ke liye website banate hain: aapke courses aur batches, fee structure, results aur toppers, faculty, aur admission enquiry ka form. Parent link kholte hi samajh jaata hai ki institute serious hai. Aaj raat tak live, sirf 4,000, jabki agencies 15-20 hazaar leti hain. Sample bhejta hoon."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka?', to: 'price' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'wom', title: 'Word of mouth', say:
    'Their #1 excuse. Flip it: word of mouth is exactly what drives them to your website.\n\n"Bilkul, aapke results hi aapka naam chala rahe hain. Par sochiye, jis parent ne aapka naam suna, wo ghar jaake sabse pehle kya karta hai? Google. Wahan website nahi milti toh doubt aata hai, aur wo doosre institute ki website dekh leta hai. Aapka word of mouth hi zyada admissions banega agar Google pe kuch professional mile. Demo dikhaun aapke naam se?"',
    options: [
      { label: 'Theek hai, dikhao', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka?', to: 'price' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price', title: 'Price', say:
    '"4,000 ek baar, koi monthly nahi, hosting free. Agencies isi kaam ke 15-20 hazaar leti hain. Aur aaj shuru karein toh 4,000, warna regular 6,000. Aapki ek admission ki fee se bhi kam. Poori detail WhatsApp pe bhejta hoon."',
    options: [
      { label: 'Theek hai detail bhejo', to: 'send_sample', template: 'details' },
      { label: 'Mehenga hai', to: 'price_push' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price_push', title: 'Price hold', say:
    'No discount. Do the math on one admission.\n\n"Sir, ek student ki saal bhar ki fee kitni hai? 15-20 hazaar toh hogi. Website 4,000 ki hai, ek baar. Ek bhi extra admission aayi toh dus guna wasool. Aur paise tabhi dena jab bana ke pasand aaye. Sample bhejta hoon, dekh lijiye."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Phir bhi sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'btaayenge', title: 'Will get back', say:
    'Most common. Demo (endowment) + loss + admission season + follow up.\n\n"Bilkul, aaram se sochiye. Main aapke institute ka demo bana ke bhej deta hoon, dekh ke decide karna. Bas do baatein: (1) parent admission se pehle Google karta hai; website na mile toh bade naam wale institute pe bharosa kar leta hai. (2) Admission season se pehle live ho jaaye toh is saal ke admissions pe asar. Pasand aaye tabhi 4,000, aaj wala rate lock, warna 6,000. Do din baad follow up karunga."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'btaayenge' },
      { label: 'Bhej do, dekh lenge', to: 'send_sample', template: 'btaayenge' },
      { label: 'Sach mein nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'busy', title: 'In class / busy', say:
    '"Samajh gaya, class ke time disturb nahi karunga. WhatsApp pe bhej deta hoon, free hoke dekh lijiyega. Ya shaam ko kis time call karoon?"',
    options: [
      { label: 'WhatsApp pe bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Baad mein call karo', outcome: 'call_back' },
    ] },
  { key: 'send_sample', title: 'Send WhatsApp', say:
    'Send the sample first, then hit "Demo banwa do". Their own institute demo drives the parents point home, and that goes out as the 2nd touch.\n\n"Ek sample bhej diya, aur aapke institute ka apna demo bhi bana ke bhej raha hoon, thodi der mein WhatsApp pe aa jayega."',
    options: [
      { label: 'Demo banwa do (unka apna)', demo: true },
      { label: 'Bhej diya, dekh lenge', outcome: 'will_revert' },
      { label: 'Abhi interested hain', to: 'interested' },
      { label: 'Ready hain, shuru karo', outcome: 'meeting_booked' },
    ] },
  { key: 'interested', title: 'Interested', say:
    '"Badhiya! Aaj raat tak live kar dunga, aaj wala 4,000 rate lock. Confirm karte hi main ek chhota form bhej dunga (2 min), usme aap institute ki detail, courses, fees aur results daal denge, aur hum kaam shuru. Chalein?"',
    options: [
      { label: 'Confirm, shuru karo', outcome: 'meeting_booked' },
      { label: 'Pehle demo bana ke bhejo', demo: true },
      { label: 'Details WhatsApp pe bhejunga', to: 'send_sample', template: 'details' },
      { label: 'Ruko, sochte hain', to: 'btaayenge' },
    ] },
  { key: 'not_interested', title: 'Not interested', say:
    '"Koi baat nahi. Ek sample bhej deta hoon, admission season se pehle kabhi mann bane toh hum ready hain. Shukriya."',
    options: [
      { label: 'Phir bhi ek message bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Not interested mark karo', outcome: 'not_interested' },
    ] },
  ...OBJECTION_NODES,
];

const CLINIC_FLOW = [
  { key: 'confirm', entry: true, title: 'Confirm identity', say:
    'Just confirm you have reached the right place. Keep the tone respectful.\n\n"Namaste, {{company}} se baat ho rahi hai? Doctor sahab available hain?"',
    options: [
      { label: 'Haan, boliye', to: 'opening' },
      { label: 'Galat number / kaun chahiye', outcome: 'wrong_number' },
      { label: 'Doctor abhi patient ke saath / nahi hain', to: 'busy' },
    ] },
  { key: 'opening', title: 'Pitch', say:
    'Confirmed. Respectful tone — you are speaking to a doctor. Use the patients-Google-you pain.\n\n"{{caller}} bol raha hoon SiteBhai se, sirf ek minute lunga. Ye IIT Madras aur IIM se padhe founder ki company hai. Aaj kal naya patient clinic aane se pehle doctor ka naam Google karta hai. Website mil jaaye toh bharosa ho jaata hai, na mile toh wo agla naam dekh leta hai. Website ka socha hoga aapne, par agencies 15-20 hazaar bolti hain. Hum wahi website 4,000 mein banate hain, aapki qualification, timings, appointment booking ke saath, aaj raat tak live — aur 5-10 page nahi, poore 100+ pages, taaki naya patient aapko Google aur AI dono pe dhoonde. Paise tabhi, jab pasand aaye. Sample WhatsApp karoon?"',
    options: [
      { label: 'Haan, WhatsApp pe bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka hai?', to: 'price' },
      { label: 'Practo/Justdial pe hoon', to: 'listed' },
      { label: 'Sochenge / btaayenge', to: 'btaayenge' },
      { label: 'Ye kya cheez hai?', to: 'explain' },
      { label: 'Patient ke saath hoon / busy', to: 'busy' },
      { label: 'Zaroorat nahi hai', to: 'no_need' },
      { label: 'Partner/ghar se poochna hai', to: 'ask_partner' },
      { label: 'Abhi budget nahi', to: 'no_budget' },
      { label: 'Aap kaun ho / bharosa kaise?', to: 'trust' },
      { label: 'Nahi chahiye', to: 'not_interested' },
      { label: 'Wrong number', outcome: 'wrong_number' },
      { label: 'Dobara call mat karna', outcome: 'dnc' },
    ] },
  { key: 'explain', title: 'What we do', say:
    '"Hum doctors aur clinics ke liye website banate hain: aapki qualification aur experience, treatments, consultation timings, WhatsApp pe appointment booking, aur clinic ka map. Sab factual aur professional, koi bhadkila advertising nahi. Aaj raat tak live, sirf 4,000, jabki agencies 15-20 hazaar leti hain. Sample bhejta hoon."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka?', to: 'price' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'listed', title: 'On Practo/JustDial', say:
    'Their #1 excuse. A listing vs their own identity.\n\n"Practo accha hai, par wahan aap doosre doctors ke beech ek listing ho, patient wahan compare karta hai aur reviews pe atakta hai. Apni website matlab aapki apni pehchaan: aapki qualification, aapki timings, seedha aapse appointment. Google pe aapka naam search karne wala patient seedha aap tak pahunchta hai, kisi list mein nahi. Dono saath chalte hain. Sample dikhaun?"',
    options: [
      { label: 'Theek hai, dikhao', to: 'send_sample', template: 'sample' },
      { label: 'Kitne ka?', to: 'price' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price', title: 'Price', say:
    '"4,000 ek baar, koi monthly nahi, hosting free. Agencies isi ke 15-20 hazaar leti hain. Aaj shuru karein toh 4,000, warna regular 6,000. Do-teen consultations ke barabar, ek baar mein. Poori detail WhatsApp pe bhejta hoon."',
    options: [
      { label: 'Theek hai detail bhejo', to: 'send_sample', template: 'details' },
      { label: 'Mehenga hai', to: 'price_push' },
      { label: 'Sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'price_push', title: 'Price hold', say:
    'No discount. Do the math on one new patient.\n\n"Doctor sahab, ek naya regular patient saal bhar mein kitna value laata hai? Website 4,000 ki hai, ek baar. Mahine mein ek bhi naya patient website se aaya toh kai guna wasool. Aur paise tabhi dena jab bana ke pasand aaye. Sample bhejta hoon."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Phir bhi sochenge', to: 'btaayenge' },
      { label: 'Nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'btaayenge', title: 'Will get back', say:
    'Most common. Never push with doctors. Demo (endowment) + light loss + follow up.\n\n"Bilkul doctor sahab, aaram se dekhiye. Main aapke naam se demo bana ke bhej deta hoon. Bas itna — naya patient aane se pehle doctor ka naam Google karta hai; website mile toh bharosa banta hai, na mile toh agla naam. Koi jaldi nahi, pasand aaye tabhi 4,000 (aaj wala rate, warna 6,000). Do din baad ek chhota follow up kar lunga."',
    options: [
      { label: 'Theek hai bhejo', to: 'send_sample', template: 'btaayenge' },
      { label: 'Bhej do, dekh lenge', to: 'send_sample', template: 'btaayenge' },
      { label: 'Sach mein nahi chahiye', to: 'not_interested' },
    ] },
  { key: 'busy', title: 'With a patient / busy', say:
    '"Maaf kijiye, patient ke beech disturb kiya. Main WhatsApp pe bhej deta hoon, fursat mein dekh lijiyega. Ya lunch time pe call karoon?"',
    options: [
      { label: 'WhatsApp pe bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Baad mein call karo', outcome: 'call_back' },
    ] },
  { key: 'send_sample', title: 'Send WhatsApp', say:
    'Send the sample first, then hit "Demo banwa do". Their own doctor demo makes their professional identity feel real, and that goes out as the 2nd touch.\n\n"Ek sample bhej diya, aur aapke clinic ka apna demo bhi bana ke bhej raha hoon, thodi der mein WhatsApp pe aa jayega."',
    options: [
      { label: 'Demo banwa do (unka apna)', demo: true },
      { label: 'Bhej diya, dekh lenge', outcome: 'will_revert' },
      { label: 'Abhi interested hain', to: 'interested' },
      { label: 'Ready hain, shuru karo', outcome: 'meeting_booked' },
    ] },
  { key: 'interested', title: 'Interested', say:
    '"Dhanyavaad doctor sahab. Aaj raat tak live kar dunga, aaj wala 4,000 rate lock. Confirm karte hi main ek chhota form bhej dunga (2 min), usme aap apna naam, qualification, timings aur treatments daal denge, aur hum kaam shuru. Theek hai?"',
    options: [
      { label: 'Confirm, shuru karo', outcome: 'meeting_booked' },
      { label: 'Pehle demo bana ke bhejo', demo: true },
      { label: 'Details WhatsApp pe bhejunga', to: 'send_sample', template: 'details' },
      { label: 'Ruko, sochte hain', to: 'btaayenge' },
    ] },
  { key: 'not_interested', title: 'Not interested', say:
    '"Koi baat nahi doctor sahab. Ek sample bhej deta hoon, kabhi zaroorat lage toh hum hain. Aapka time dene ke liye dhanyavaad."',
    options: [
      { label: 'Phir bhi ek message bhejo', to: 'send_sample', template: 'sample' },
      { label: 'Not interested mark karo', outcome: 'not_interested' },
    ] },
  ...OBJECTION_NODES,
];

export const STARTER_MODES = [
  // ============================ CA FIRMS ============================
  {
    name: 'CA Firms', active: 0,
    scripts: [
      { title: '1. Opening (30 seconds)', body:
        "Goal of the call: get a yes to a WhatsApp. Do not close on the call.\n\n" +
        "Step 1, just confirm (micro-yes): \"Namaste, {{company}} se baat ho rahi hai?\"\n\n" +
        "Step 2, after the yes, intro + offer: \"{{caller}} baat kar raha hoon SiteBhai se, bas ek minute. Ye IIT Madras aur IIM se padhe founder ki company hai. Aapki CA firm ka apna website " +
        "nahi hai. Hum bana dete hain, poora professional, ICAI-compliant, aaj raat tak live. Baaki agencies iske " +
        "10-15 hazaar lete hain, hum sirf 4,000 mein. Aur risk koi nahi, hum bana ke dikha denge, pasand aaye tabhi paise. Main ek sample aur pricing WhatsApp pe bhej doon? Aaram se " +
        "dekh lijiyega.\"" },
      { title: '2. If they say they will get back', body:
        "This is the most common answer. Do not push. Loss-frame + their own demo (endowment) + follow up.\n\n" +
        "\"Bilkul sir, koi jaldi nahi. Bas ek baat, jab tak site nahi, jo naye clients aapko Google pe dhoondhte hain wo doosri firm ke paas chale jaate hain. Isliye main aapka apna demo bana ke bhej deta hoon, aap aaram se dekhiyega. Pasand aaye tabhi 4,000, aaj wala rate lock, warna 6,000. Do din baad ek chhota follow up karunga.\"\n\n" +
        "Then hit Send on WhatsApp and log Will get back." },
      { title: '3. If they do not pick up', body:
        "Do not move on. Immediately send the 'Missed call' WhatsApp so they see who called, the rate, and get the " +
        "sample. Then log the call as 'No answer'. Most replies come from this message, not the call." },
      { title: '4. Quick objection answers', body:
        "\"Kitna?\" -> 4,000 ek baar, koi monthly nahi, hosting free. Agencies 10 hazaar se kam nahi lete. Aaj shuru karein toh 4,000, regular 6,000.\n" +
        "\"Time nahi\" -> Bas firm ka naam aur services chahiye, baaki hum karte hain, aaj raat tak.\n" +
        "\"ICAI allow karta hai?\" -> Haan, April 2026 se, jab tak factual hai. Hum fully compliant rakhte hain.\n" +
        "\"Pehle se hai\" -> Koi baat nahi, sample bhej deta hoon compare karne ke liye.\n" +
        "\"Apna domain milega?\" -> 4,000 mein website ek fast subdomain pe live. Khud ka domain (jaise aapkifirm.in) chahiye toh pehla saal +1,499 (standard .in/.com), phir 1,800/saal, aapke naam. Premium ho toh confirm karke, ya aap khud le lo hum free connect kar denge." },
      { title: '5. Follow-up call (day 2)', body:
        "\"Hi {{company}}, {{caller}} from SiteBhai, jo sample bheja tha WhatsApp pe uspe follow up. Dekha aapne? Pasand " +
        "aaye toh aaj raat tak live kar deta hoon, aapke liye abhi bhi 4,000 mein.\"" },
    ],
    templates: [
      { key: 'plans', title: 'Packages & care plans', body: PLANS_BODY },
      { key: 'missed', title: 'Missed call (send after no answer)', body:
        "Hi {{company}}, {{caller}} from SiteBhai (IIT Madras + IIM founder ki company), abhi call kiya tha. Aapki CA firm ka website hum bana dete hain, " +
        "ICAI-compliant, aaj raat tak live. Agencies 10-15 hazaar lete hain, hum sirf 4,000 mein. Aur risk koi nahi, hum bana ke dikha denge, pasand aaye tabhi paise. Sample: " + SAMPLE +
        "\nAaj shuru karein toh 4,000, regular 6,000. Fursat mein reply kijiye. Reply STOP to opt out." },
      { key: 'sample', title: 'After call: sample + pricing', body:
        "Baat karne ke liye shukriya {{company}}. Jaisa kaha, ye raha sample: " + SAMPLE + "\nPoori multi-page website, " +
        "ICAI-compliant, hosting free, koi monthly fee nahi. Baad mein koi chhota change (number, timing, text) hamesha free. " +
        "Agencies iske 10 hazaar+ lete hain. Aaj shuru karein " +
        "toh sirf 4,000 (regular 6,000), aaj raat tak live. Aur haan, SiteBhai IIT Madras aur IIM se padhe founder ki company (Conyso) ka hissa hai, koi freelancer nahi. Risk bhi koi nahi: hum bana ke dikha denge, pasand aaye tabhi 4,000, warna koi baat nahi. Shuru karoon? Reply STOP to opt out." },
      { key: 'btaayenge', title: 'After a "sochenge" call', body:
        "Koi jaldi nahi {{company}}. Sample bhej raha hoon: " + SAMPLE + "\nSochne ke liye: agencies 10-15 hazaar lete " +
        "hain, hum 4,000 mein, aaj raat tak live. Aaj shuru karein toh 4,000, warna regular 6,000. Aur risk koi nahi, pasand aaye tabhi 4,000 dena. Do din mein follow " +
        "up karunga. Reply STOP to opt out." },
      { key: 'followup', title: 'Day-2 follow-up', body:
        "Hi {{company}}, {{caller}} from SiteBhai. Sample dekha aapne? Aajkal naye clients CA firm ka naam pehle Google/JustDial pe check karte hain; jinko aapki site nahi milti, wo doosri firm ke paas chale jaate hain. " +
        "Har din bina website ke ye leads nikal rahe hain. Aapke liye abhi bhi 4,000 (regular 6,000), aaj raat tak live, pasand aaye tabhi paise. Bas 'haan' bhej dijiye, aaj hi live kar dun. Reply STOP to opt out." },
      { key: 'details', title: 'Full price list', body:
        "Poori price list, {{company}}:\n\n" +
        "Website: 4,000 (aaj shuru karein toh) / regular 6,000. 100+ pages (competitors 5-10 dete hain), SEO + AEO + GEO optimised, appointment/consultation booking, mobile-friendly, ICAI-compliant. Aaj raat tak live, hosting free (fast subdomain), koi monthly fee.\n" +
        "Apna domain (jaise aapkifirm.in): pehla saal 1,499 (standard .in/.com), aapke naam register, DNS hum manage karte hain; premium domain ho toh actual confirm karke, ya aap khud le lo hum free connect kar denge; phir 1,800/saal renewal (hum handle karte hain, aapko kuch nahi karna).\n" +
        "Google Business Profile setup: FREE with website (Maps listing, photos, timing, verification).\n" +
        "WhatsApp Business setup: FREE with website (profile, catalog, auto-reply).\n" +
        "Custom tool (fee tracker, billing, etc.): 7,999 se, aapke kaam ke hisaab se banate hain.\n" +
        "Chhote changes (text, number, timing, address): hamesha FREE, bas WhatsApp karo.\n" +
        "Bade changes (naya section, redesign): 1,499 se, pehle bata dete hain.\n\n" +
        "Agencies isi ke 10-15 hazaar lete hain. Sample: " + SAMPLE + "\nShuru karoon? Reply STOP to opt out." },
      { key: 'samples', title: 'Send samples', body:
        "Zaroor {{company}}, ek reference dekhiye, aur aapka apna demo bhi bana ke bhej sakta hoon: " + SAMPLE + "\nAajkal customer pehle online check karta hai; jinki dhang ki website hai, log unpe zyada bharosa karte hain aur wahi chunte hain. Aapka bhi bilkul aise banega. " +
        "SiteBhai IIT Madras + IIM founder ki company hai, koi risk nahi: pasand aaye tabhi 4,000 (regular 6,000), aaj raat tak live. Reply STOP to opt out." },
      { key: 'breakup', title: 'Break-up (last chance)', body:
        "Namaste {{company}}, {{caller}} from SiteBhai. Ye mera aakhri message, uske baad tang nahi karunga. " +
        "Do baatein saaf: (1) 4,000 wala rate aaj band ho raha hai, kal se 6,000. (2) Jab tak website nahi, jo log aapko online dhoondhte hain wo roz competitor ke paas jaate rahenge. " +
        "Website chahiye toh bas 'haan' likh dijiye, main aaj hi aapke naam se bana ke live kar dunga, paise tab bhi tabhi jab pasand aaye. Warna main aapko list se hata deta hoon, aur aapke kaam ke liye dil se shubhkaamnayein. Reply STOP to opt out." },
    ],
    steps: STEPS('sample', 'followup', 'samples', 'breakup'),
    flow: CA_FLOW,
  },

  // ============================= SALONS =============================
  {
    name: 'Salons', active: 0,
    scripts: [
      { title: '1. Opening (30 seconds)', body:
        "Goal of the call: get a yes to a WhatsApp. Do not close on the call.\n\n" +
        "Step 1, just confirm (micro-yes): \"Namaste, {{company}} se baat ho rahi hai?\"\n\n" +
        "Step 2, after the yes, intro + offer: \"{{caller}} from SiteBhai, bas ek minute. Ye IIT Madras aur IIM se padhe founder ki company hai. Aapke salon ka apna website nahi hai. Hum bana " +
        "dete hain online booking aur Google Maps ke saath, aaj raat tak live. Baaki agencies 10-15 hazaar lete hain, " +
        "hum sirf 4,000 mein. Aur risk koi nahi, hum bana ke dikha denge, pasand aaye tabhi paise. Ek sample WhatsApp pe bhej doon? Fursat mein dekh lijiyega.\"" },
      { title: '2. If they say they will get back', body:
        "Most common answer. Do not push. Loss-frame + their own demo (endowment) + follow up.\n\n" +
        "\"Bilkul, koi jaldi nahi. Bas ek baat, log aapke area mein aapke jaisa business Google pe dhoondhte hain; aap na dikhein toh paas wale ke paas chale jaate hain. Isliye main aapka apna demo bana ke bhej deta hoon, aaram se dekhiye. Pasand aaye tabhi 4,000, aaj wala rate lock, warna 6,000. Do din baad ek chhota follow up karunga.\"\n\nPhir Send on WhatsApp dabao aur " +
        "'Will get back' log karo." },
      { title: '3. If they do not pick up', body:
        "Immediately send the 'Missed call' WhatsApp so they see who called and get the sample, then log 'No answer'. " +
        "Zyada reply isi message se aate hain." },
      { title: '4. Quick objection answers', body:
        "\"Kitna?\" -> 4,000 ek baar, koi monthly nahi, hosting free. Agencies 10 hazaar se kam nahi lete. Aaj toh 4,000, regular 6,000.\n" +
        "\"Time nahi\" -> Bas salon ka naam, services aur photos chahiye, same day live.\n" +
        "\"Instagram hai\" -> Wahan compare hota hai, apni site aur Google Maps se direct booking aati hai.\n" +
        "\"Abhi nahi\" -> Koi baat nahi, sample bhej deta hoon, fursat mein dekh lijiye.\n" +
        "\"Apna domain milega?\" -> 4,000 mein website ek fast subdomain pe live. Khud ka domain chahiye toh pehla saal +1,499 (standard .in/.com), phir 1,800/saal, aapke naam. Premium ho toh confirm karke, ya aap khud le lo hum free connect kar denge." },
      { title: '5. Follow-up call (day 2)', body:
        "\"Hi {{company}}, {{caller}} from SiteBhai, jo sample bheja tha WhatsApp pe, dekha aapne? Pasand aaye toh aaj " +
        "raat tak live kar dun, aapke liye abhi bhi 4,000 mein.\"" },
    ],
    templates: [
      { key: 'plans', title: 'Packages & care plans', body: PLANS_BODY },
      { key: 'missed', title: 'Missed call (send after no answer)', body:
        "Hi {{company}}, {{caller}} from SiteBhai (IIT Madras + IIM founder ki company), abhi call kiya tha. Aapke salon ka website hum bana dete hain online " +
        "booking aur Google Maps ke saath, aaj raat tak live. Agencies 10-15 hazaar lete hain, hum sirf 4,000 mein. Aur risk koi nahi, hum bana ke dikha denge, pasand aaye tabhi paise." +
        "Sample: " + SAMPLE + "\nAaj shuru karein toh 4,000, regular 6,000. Fursat mein reply kijiye. Reply STOP to opt out." },
      { key: 'sample', title: 'After call: sample + pricing', body:
        "Time dene ke liye shukriya, {{company}}. Ye raha sample: " + SAMPLE + "\nOnline booking + Google Maps wali poori " +
        "website, hosting free, koi monthly fee nahi. Baad mein koi chhota change (number, timing, text) hamesha free. " +
        "Agencies iske 10 hazaar+ lete hain. Aaj shuru karein toh sirf " +
        "4,000 (regular 6,000), aaj raat tak live. Aur haan, SiteBhai IIT Madras aur IIM se padhe founder ki company (Conyso) ka hissa hai, koi freelancer nahi. Risk bhi koi nahi: hum bana ke dikha denge, pasand aaye tabhi 4,000, warna koi baat nahi. Shuru karoon? Reply STOP to opt out." },
      { key: 'btaayenge', title: 'After a "sochenge" call', body:
        "Koi jaldi nahi {{company}}. Sample bhej raha hoon: " + SAMPLE + "\nAgencies 10-15 hazaar lete hain, hum 4,000 mein, " +
        "aaj raat tak live. Aaj shuru karein toh 4,000, warna regular 6,000. Aur risk koi nahi, pasand aaye tabhi 4,000 dena. Do din mein follow up karunga. Reply STOP to opt out." },
      { key: 'followup', title: 'Day-2 follow-up', body:
        "Hi {{company}}, {{caller}} from SiteBhai. Sample dekha aapne? Log aapke area mein aapke jaisa business Google pe dhoondhte hain; aap na dikhein toh paas wale ke paas chale jaate hain, roz. " +
        "Har din bina website ke ye customers nikal rahe hain. Aapke liye abhi bhi 4,000 (regular 6,000), aaj raat tak live, pasand aaye tabhi paise. Bas 'haan' bhej dijiye, aaj hi live kar dun. Reply STOP to opt out." },
      { key: 'details', title: 'Full price list', body:
        "Poori price list, {{company}}:\n\n" +
        "Website: 4,000 (aaj shuru karein toh) / regular 6,000. 100+ pages (competitors 5-10 dete hain), SEO + AEO + GEO optimised, online appointment booking, aapki services aur photos, mobile-friendly. Aaj raat tak live, hosting free (fast subdomain), koi monthly fee.\n" +
        "Apna domain (jaise aapkasalon.in): pehla saal 1,499 (standard .in/.com), aapke naam register, DNS hum manage karte hain; premium domain ho toh actual confirm karke, ya aap khud le lo hum free connect kar denge; phir 1,800/saal renewal (hum handle karte hain).\n" +
        "Google Business Profile setup: FREE with website (Maps listing, photos, timing, verification, taaki salon near me pe dikhein).\n" +
        "WhatsApp Business setup: FREE with website (profile, catalog, auto-reply).\n" +
        "Custom tool (appointment tracker, billing): 7,999 se, aapke kaam ke hisaab se.\n" +
        "Chhote changes (text, number, timing, address): hamesha FREE, bas WhatsApp karo.\n" +
        "Bade changes (naya section, redesign): 1,499 se.\n\n" +
        "Agencies isi ke 10-15 hazaar lete hain. Sample: " + SAMPLE + "\nShuru karoon? Reply STOP to opt out." },
      { key: 'samples', title: 'Send samples', body:
        "Zaroor {{company}}, ek reference dekhiye, aur aapka apna demo bhi bana ke bhej sakta hoon: " + SAMPLE + "\nAajkal customer pehle online check karta hai; jinki dhang ki website hai, log unpe zyada bharosa karte hain aur wahi chunte hain. Aapka bhi bilkul aise banega. " +
        "SiteBhai IIT Madras + IIM founder ki company hai, koi risk nahi: pasand aaye tabhi 4,000 (regular 6,000), aaj raat tak live. Reply STOP to opt out." },
      { key: 'breakup', title: 'Break-up (last chance)', body:
        "Namaste {{company}}, {{caller}} from SiteBhai. Ye mera aakhri message, uske baad tang nahi karunga. " +
        "Do baatein saaf: (1) 4,000 wala rate aaj band ho raha hai, kal se 6,000. (2) Jab tak website nahi, jo log aapko online dhoondhte hain wo roz competitor ke paas jaate rahenge. " +
        "Website chahiye toh bas 'haan' likh dijiye, main aaj hi aapke naam se bana ke live kar dunga, paise tab bhi tabhi jab pasand aaye. Warna main aapko list se hata deta hoon, aur aapke kaam ke liye dil se shubhkaamnayein. Reply STOP to opt out." },
    ],
    steps: STEPS('sample', 'followup', 'samples', 'breakup'),
    flow: SALON_FLOW,
  },

  // ============================== CAFES =============================
  {
    name: 'Cafes', active: 0,
    scripts: [
      { title: '1. Opening (30 seconds)', body:
        "Goal of the call: get a yes to a WhatsApp. Do not close on the call.\n\n" +
        "Step 1, just confirm (micro-yes): \"Namaste, {{company}} se baat ho rahi hai?\"\n\n" +
        "Step 2, after the yes, intro + offer: \"{{caller}} from SiteBhai, bas ek minute. Ye IIT Madras aur IIM se padhe founder ki company hai. Aapke cafe ka apna website nahi hai. Hum bana dete " +
        "hain menu, photos aur Google Maps ke saath, direct orders bina Zomato commission ke, aaj raat tak live. Agencies " +
        "10-15 hazaar lete hain, hum sirf 4,000 mein. Aur risk koi nahi, hum bana ke dikha denge, pasand aaye tabhi paise. Sample WhatsApp pe bhej doon?\"" },
      { title: '2. If they say they will get back', body:
        "Most common answer. Do not push. Loss-frame + their own demo (endowment) + follow up.\n\n" +
        "\"Bilkul, koi jaldi nahi. Bas ek baat, log aapke area mein aapke jaisa business Google pe dhoondhte hain; aap na dikhein toh paas wale ke paas chale jaate hain. Isliye main aapka apna demo bana ke bhej deta hoon, aaram se dekhiye. Pasand aaye tabhi 4,000, aaj wala rate lock, warna 6,000. Do din baad ek chhota follow up karunga.\"\n\nPhir Send on WhatsApp dabao aur " +
        "'Will get back' log karo." },
      { title: '3. If they do not pick up', body:
        "Immediately send the 'Missed call' WhatsApp so they see who called and get the sample, then log 'No answer'. " +
        "Zyada reply isi message se aate hain." },
      { title: '4. Quick objection answers', body:
        "\"Kitna?\" -> 4,000 ek baar, koi monthly nahi, koi commission nahi. Agencies 10 hazaar se kam nahi lete. Aaj toh 4,000, regular 6,000.\n" +
        "\"Time nahi\" -> Bas cafe ka naam, menu aur photos chahiye, same day live.\n" +
        "\"Zomato pe hain\" -> Wahan har order pe commission jaata hai, apni site se direct order milte hain, zero commission.\n" +
        "\"Abhi nahi\" -> Koi baat nahi, sample bhej deta hoon.\n" +
        "\"Apna domain milega?\" -> 4,000 mein website ek fast subdomain pe live. Khud ka domain chahiye toh pehla saal +1,499 (standard .in/.com), phir 1,800/saal, aapke naam. Premium ho toh confirm karke, ya aap khud le lo hum free connect kar denge." },
      { title: '5. Follow-up call (day 2)', body:
        "\"Hi {{company}}, {{caller}} from SiteBhai, jo sample bheja tha WhatsApp pe, dekha? Pasand aaye toh aaj raat tak " +
        "live kar deta hoon, aapke liye abhi bhi 4,000 mein.\"" },
    ],
    templates: [
      { key: 'plans', title: 'Packages & care plans', body: PLANS_BODY },
      { key: 'missed', title: 'Missed call (send after no answer)', body:
        "Hi {{company}}, {{caller}} from SiteBhai (IIT Madras + IIM founder ki company), abhi call kiya tha. Aapke cafe ka website hum bana dete hain menu, " +
        "photos aur Google Maps ke saath, direct orders bina commission ke, aaj raat tak live. Agencies 10-15 hazaar " +
        "lete hain, hum sirf 4,000 mein. Aur risk koi nahi, hum bana ke dikha denge, pasand aaye tabhi paise. Sample: " + SAMPLE + "\nAaj shuru karein toh 4,000, regular 6,000. Fursat mein " +
        "reply kijiye. Reply STOP to opt out." },
      { key: 'sample', title: 'After call: sample + pricing', body:
        "Time dene ke liye shukriya, {{company}}. Ye raha sample: " + SAMPLE + "\nMenu, photos, Google Maps aur direct " +
        "WhatsApp orders wali website, hosting free, koi monthly fee ya commission nahi. Baad mein koi chhota change " +
        "(number, timing, text) hamesha free. Agencies iske 10 hazaar+ lete hain. Aaj shuru karein toh sirf 4,000 " +
        "(regular 6,000), aaj raat tak live. Aur haan, SiteBhai IIT Madras aur IIM se padhe founder ki company (Conyso) ka hissa hai, koi freelancer nahi. Risk bhi koi nahi: hum bana ke dikha denge, pasand aaye tabhi 4,000, warna koi baat nahi. Shuru karoon? Reply STOP to opt out." },
      { key: 'btaayenge', title: 'After a "sochenge" call', body:
        "Koi jaldi nahi {{company}}. Sample bhej raha hoon: " + SAMPLE + "\nAgencies 10-15 hazaar lete hain, hum 4,000 mein, " +
        "koi commission nahi, aaj raat tak live. Aaj shuru karein toh 4,000, warna regular 6,000. Aur risk koi nahi, " +
        "pasand aaye tabhi 4,000 dena. Do din mein follow up karunga. Reply STOP to opt out." },
      { key: 'followup', title: 'Day-2 follow-up', body:
        "Hi {{company}}, {{caller}} from SiteBhai. Sample dekha aapne? Log aapke area mein aapke jaisa business Google pe dhoondhte hain; aap na dikhein toh paas wale ke paas chale jaate hain, roz. " +
        "Har din bina website ke ye customers nikal rahe hain. Aapke liye abhi bhi 4,000 (regular 6,000), aaj raat tak live, pasand aaye tabhi paise. Bas 'haan' bhej dijiye, aaj hi live kar dun. Reply STOP to opt out." },
      { key: 'details', title: 'Full price list', body:
        "Poori price list, {{company}}:\n\n" +
        "Website: 4,000 (aaj shuru karein toh) / regular 6,000. 100+ pages (competitors 5-10 dete hain), SEO + AEO + GEO optimised, menu, photos, Google Maps, direct WhatsApp order (bina commission). Aaj raat tak live, hosting free (fast subdomain), koi monthly fee.\n" +
        "Apna domain (jaise aapkacafe.in): pehla saal 1,499 (standard .in/.com), aapke naam register, DNS hum manage karte hain; premium domain ho toh actual confirm karke, ya aap khud le lo hum free connect kar denge; phir 1,800/saal renewal (hum handle karte hain).\n" +
        "Google Business Profile setup: FREE with website (Maps listing, photos, timing, verification, taaki cafe near me pe dikhein).\n" +
        "WhatsApp Business setup: FREE with website (profile, catalog, auto-reply).\n" +
        "Custom tool (billing, order/table tracker): 7,999 se, aapke kaam ke hisaab se.\n" +
        "Chhote changes (text, number, timing, address): hamesha FREE, bas WhatsApp karo.\n" +
        "Bade changes (naya section, redesign): 1,499 se.\n\n" +
        "Agencies isi ke 10-15 hazaar lete hain. Sample: " + SAMPLE + "\nShuru karoon? Reply STOP to opt out." },
      { key: 'samples', title: 'Send samples', body:
        "Zaroor {{company}}, ek reference dekhiye, aur aapka apna demo bhi bana ke bhej sakta hoon: " + SAMPLE + "\nAajkal customer pehle online check karta hai; jinki dhang ki website hai, log unpe zyada bharosa karte hain aur wahi chunte hain. Aapka bhi bilkul aise banega. " +
        "SiteBhai IIT Madras + IIM founder ki company hai, koi risk nahi: pasand aaye tabhi 4,000 (regular 6,000), aaj raat tak live. Reply STOP to opt out." },
      { key: 'breakup', title: 'Break-up (last chance)', body:
        "Namaste {{company}}, {{caller}} from SiteBhai. Ye mera aakhri message, uske baad tang nahi karunga. " +
        "Do baatein saaf: (1) 4,000 wala rate aaj band ho raha hai, kal se 6,000. (2) Jab tak website nahi, jo log aapko online dhoondhte hain wo roz competitor ke paas jaate rahenge. " +
        "Website chahiye toh bas 'haan' likh dijiye, main aaj hi aapke naam se bana ke live kar dunga, paise tab bhi tabhi jab pasand aaye. Warna main aapko list se hata deta hoon, aur aapke kaam ke liye dil se shubhkaamnayein. Reply STOP to opt out." },
    ],
    steps: STEPS('sample', 'followup', 'samples', 'breakup'),
    flow: CAFE_FLOW,
  },

  // ========================= PHOTOGRAPHERS =========================
  // Core ICP thesis: a portfolio site is table-stakes in their trade, they have
  // wanted one for years, and 20-25k agency pricing locked them out. Their work
  // is visual, so the personalized demo (their own photos) closes hardest here.
  {
    name: 'Photographers', active: 1,
    scripts: [
      { title: '1. Opening (30 seconds)', body:
        "Goal of the call: get a yes to a WhatsApp/demo. Name the pain: they always wanted it, agency prices blocked them.\n\n" +
        "Step 1, just confirm (micro-yes): \"Namaste, {{company}} se baat ho rahi hai?\"\n\n" +
        "Step 2, after the yes, intro + offer: \"{{caller}} bol raha hoon SiteBhai se, bas ek minute. Ye IIT Madras aur IIM se padhe founder ki company hai. Aapka kaam maine dekha, kamaal ka hai. " +
        "Par jab client website ka link maangta hai, toh Instagram hi bhejna padta hai na? Portfolio website ke liye " +
        "agencies 20-25 hazaar maangti hain, isliye ruki hui hogi. Hum wahi website 4,000 mein banate hain, aapki " +
        "photos ke saath, aaj raat tak live. Aur paise tabhi, jab bana ke pasand aaye. Main aapke naam se ek demo " +
        "bana ke WhatsApp karoon?\"" },
      { title: '2. If they say they will get back', body:
        "Most common. Do not push. Demo + season + follow up.\n\n" +
        "\"Bilkul, aaram se sochiye. Main aapke naam se demo bana ke WhatsApp kar deta hoon, dekh ke hi decide karna. " +
        "Bas ek baat, wedding season ki enquiries shuru hone se pehle live ho jao toh poora season ka fayda milega. " +
        "Aaj shuru karein toh 4,000, warna regular 6,000. Do din baad follow up karunga.\"\n\n" +
        "Then hit Send on WhatsApp and log Will get back. If they seem interested, hit Generate demo." },
      { title: '3. If they do not pick up', body:
        "They will be on a shoot, that is normal. Immediately send the 'Missed call' WhatsApp; photographers do read messages. " +
        "Phir 'No answer' log karo. In logon ke saath WhatsApp hi asli channel hai." },
      { title: '4. Quick objection answers', body:
        "\"Instagram pe portfolio hai\" -> Instagram scroll hai, portfolio nahi. 50-60 hazaar dene wala client website dekh ke trust karta hai. Website pe best kaam, packages, reviews ek jagah.\n" +
        "\"Kitna?\" -> 4,000 ek baar, koi monthly nahi. Agencies isi ke 20-25 hazaar leti hain. Aaj toh 4,000, regular 6,000.\n" +
        "\"Mehenga\" -> Ek wedding booking 40-50 hazaar ki. Website 4,000 ki, ek baar. Ek extra booking = 20 guna wasool. Aur pay-after hai.\n" +
        "\"Time nahi\" -> Bas 15-20 best photos aur packages ka idea chahiye, baaki hum. Aaj raat tak live.\n" +
        "\"Apna domain milega?\" -> 4,000 mein fast subdomain pe live. Khud ka domain (jaise aapkastudio.in) pehla saal +1,499, phir 1,800/saal." },
      { title: '5. Follow-up call (day 2)', body:
        "\"Hi {{company}}, {{caller}} from SiteBhai. Jo demo/sample bheja tha WhatsApp pe, dekha aapne? Season se pehle " +
        "live karna ho toh aaj bhi 4,000 wala rate de dunga, aur paise tabhi jab pasand aaye. Bataiye, shuru karein?\"" },
    ],
    templates: [
      { key: 'plans', title: 'Packages & care plans', body: PLANS_BODY },
      { key: 'missed', title: 'Missed call (send after no answer)', body:
        "Hi {{company}}, {{caller}} from SiteBhai (IIT Madras + IIM founder ki company), abhi call kiya tha, shayad aap shoot pe honge. Hum photographers ke " +
        "liye portfolio website banate hain, aapki photos, packages aur enquiry button ke saath, aaj raat tak live. " +
        "Agencies iske 20-25 hazaar leti hain, hum sirf 4,000 mein, aur paise tabhi jab bana ke pasand aaye. Sample: " + SAMPLE +
        "\nAaj shuru karein toh 4,000, regular 6,000. Fursat mein reply kijiye. Reply STOP to opt out." },
      { key: 'sample', title: 'After call: sample + pricing', body:
        "Baat karke accha laga, {{company}}. Jaisa kaha, ye raha sample: " + SAMPLE + "\nAisi hi portfolio website aapki " +
        "photos ke saath: galleries, packages, testimonials, enquiry button. Google Business aur WhatsApp setup bhi saath mein free. Aaj raat tak live, hosting free, koi monthly " +
        "fee nahi. Baad mein chhote changes hamesha free. Agencies iske 20-25 hazaar leti hain, aaj shuru karein toh sirf " +
        "4,000 (regular 6,000). Aur haan, SiteBhai IIT Madras aur IIM se padhe founder ki company (Conyso) ka hissa hai, koi freelancer nahi. Risk bhi koi nahi: hum bana ke dikha denge, pasand aaye tabhi 4,000. Shuru karoon? Reply STOP to opt out." },
      { key: 'btaayenge', title: 'After a "sochenge" call', body:
        "Koi jaldi nahi {{company}}. Sample dekh lijiye: " + SAMPLE + "\nSochte waqt bas itna yaad rakhiye: jo client " +
        "50-60 hazaar ka package le raha hai, wo website dekh ke hi trust karta hai, aur season ki enquiries shuru hone " +
        "wali hain. Agencies 20-25 hazaar leti hain, hum 4,000 mein, aaj raat tak live. Aur risk koi nahi, pasand aaye " +
        "tabhi paise. Do din mein follow up karunga. Reply STOP to opt out." },
      { key: 'followup', title: 'Day-2 follow-up', body:
        "Hi {{company}}, {{caller}} from SiteBhai. Sample dekha aapne? Client kaam dekhne ke liye website ka link maangta hai; sirf Instagram bhejne pe serious nahi lagta, wo doosre photographer ko book kar leta hai. " +
        "Har booking jo aise nikal jaati hai, seedha loss. Aapke liye abhi bhi 4,000 (regular 6,000), aaj raat tak live, pasand aaye tabhi paise. Bas 'haan' bhej dijiye, aaj hi live kar dun. Reply STOP to opt out." },
      { key: 'details', title: 'Full price list', body:
        "Poori price list, {{company}}:\n\n" +
        "Portfolio website: 4,000 (aaj shuru karein toh) / regular 6,000. Aapki photos ke saath galleries (weddings, " +
        "pre-wedding, events), packages, testimonials, enquiry/booking button, mobile-friendly, 100+ pages (competitors 5-10 dete hain), SEO + AEO + GEO optimised (Google + AI dono pe dikhne ke liye). Aaj raat " +
        "tak live, hosting free (fast subdomain), koi monthly fee.\n" +
        "Apna domain (jaise aapkastudio.in): pehla saal 1,499 (standard .in/.com), aapke naam register, DNS hum manage " +
        "karte hain; premium domain ho toh actual confirm karke, ya aap khud le lo hum free connect kar denge; phir " +
        "1,800/saal renewal.\n" +
        "Google Business Profile setup: FREE with website (Maps listing, photos, timing, verification, taaki photographer near me pe dikhein).\n" +
        "WhatsApp Business setup: FREE with website (profile, catalog, auto-reply).\n" +
        "Custom tool (booking/lead tracker, client gallery delivery): 7,999 se.\n" +
        "Chhote changes (photos update, packages, number): hamesha FREE, bas WhatsApp karo.\n" +
        "Bade changes (naya section, redesign): 1,499 se.\n\n" +
        "Aur sabse badi baat: pasand aaye tabhi paise. Sample: " + SAMPLE + "\nShuru karoon? Reply STOP to opt out." },
      { key: 'samples', title: 'Send samples', body:
        "Zaroor {{company}}, ek reference dekhiye, aur aapka apna demo bhi bana ke bhej sakta hoon: " + SAMPLE + "\nAajkal client kaam dekhne se pehle photographer ki website dhoondhta hai; jinki site hai wo zyada professional lagte hain aur booking unhe milti hai. Aapki portfolio site isse bhi behtar banegi. " +
        "SiteBhai IIT Madras + IIM founder ki company hai, koi risk nahi: pasand aaye tabhi 4,000 (regular 6,000), aaj raat tak live. Reply STOP to opt out." },
      { key: 'breakup', title: 'Break-up (last chance)', body:
        "Namaste {{company}}, {{caller}} from SiteBhai. Ye mera aakhri message, uske baad tang nahi karunga. " +
        "Do baatein saaf: (1) 4,000 wala rate aaj band ho raha hai, kal se 6,000. (2) Jab tak website nahi, jo log aapko online dhoondhte hain wo roz competitor ke paas jaate rahenge. " +
        "Website chahiye toh bas 'haan' likh dijiye, main aaj hi aapke naam se bana ke live kar dunga, paise tab bhi tabhi jab pasand aaye. Warna main aapko list se hata deta hoon, aur aapke kaam ke liye dil se shubhkaamnayein. Reply STOP to opt out." },
    ],
    steps: STEPS('sample', 'followup', 'samples', 'breakup'),
    flow: PHOTO_FLOW,
  },

  // =========================== COACHING ===========================
  // ICP thesis: parents Google an institute before admission; big institutes have
  // sites; small ones always wanted one and were priced out at 15-20k.
  {
    name: 'Coaching', active: 1,
    scripts: [
      { title: '1. Opening (30 seconds)', body:
        "Goal of the call: get a yes to a WhatsApp. Pain: parents Google them, agency prices had blocked them.\n\n" +
        "Step 1, just confirm (micro-yes): \"Namaste, {{company}} se baat ho rahi hai?\"\n\n" +
        "Step 2, after the yes, intro + offer: \"{{caller}} bol raha hoon SiteBhai se, bas ek minute. Ye IIT Madras aur IIM se padhe founder ki company hai. Aaj kal parent admission se pehle " +
        "institute ka naam Google karta hai. Bade institutes ki website hai, aur jinki nahi hai unpe bharosa kam ho " +
        "jaata hai. Website ka socha toh hoga, par agencies 15-20 hazaar maangti hain. Hum wahi website 4,000 mein " +
        "banate hain, aapke courses, results, faculty ke saath, aaj raat tak live. Paise tabhi, jab pasand aaye. " +
        "Sample WhatsApp karoon?\"" },
      { title: '2. If they say they will get back', body:
        "Most common. Do not push. Sample + admission season + follow up.\n\n" +
        "\"Bilkul, aaram se sochiye. Sample abhi WhatsApp pe bhej deta hoon. Bas ek baat, admission season se pehle " +
        "live ho jaaye toh is saal ke admissions pe asar dikhega. Aaj shuru karein toh 4,000, warna regular 6,000. " +
        "Do din baad follow up karunga.\"\n\nThen hit Send on WhatsApp and log Will get back." },
      { title: '3. If they do not pick up', body:
        "They will be in class. Immediately send the 'Missed call' WhatsApp, then log 'No answer'. An evening or Sunday follow-up " +
        "call gets picked up more." },
      { title: '4. Quick objection answers', body:
        "\"Word of mouth se chalta hai\" -> Wahi word of mouth Google tak le jaata hai. Parent naam sunta hai, phir Google karta hai. Website na mile toh doubt, aur competitor ki site mil jaati hai.\n" +
        "\"Kitna?\" -> 4,000 ek baar, koi monthly nahi. Agencies 15-20 hazaar leti hain. Aaj toh 4,000, regular 6,000.\n" +
        "\"Mehenga\" -> Ek student ki saal bhar ki fee se bhi kam, ek baar mein. Ek extra admission aayi toh dus guna wasool. Pay-after bhi hai.\n" +
        "\"Time nahi\" -> Bas courses, fees aur faculty ki list chahiye, baaki hum. Aaj raat tak live.\n" +
        "\"Apna domain milega?\" -> 4,000 mein fast subdomain pe live. Khud ka domain pehla saal +1,499, phir 1,800/saal." },
      { title: '5. Follow-up call (day 2)', body:
        "\"Hi {{company}}, {{caller}} from SiteBhai. Jo sample bheja tha WhatsApp pe, dekha aapne? Admission season se " +
        "pehle live karna ho toh aaj bhi 4,000 wala rate de dunga, paise tabhi jab pasand aaye. Shuru karein?\"" },
    ],
    templates: [
      { key: 'plans', title: 'Packages & care plans', body: PLANS_BODY },
      { key: 'missed', title: 'Missed call (send after no answer)', body:
        "Hi {{company}}, {{caller}} from SiteBhai (IIT Madras + IIM founder ki company), abhi call kiya tha, shayad aap class mein honge. Hum coaching " +
        "institutes ke liye website banate hain: courses, batches, results, faculty aur admission enquiry ke saath, aaj " +
        "raat tak live. Agencies 15-20 hazaar leti hain, hum sirf 4,000 mein, aur paise tabhi jab bana ke pasand aaye. " +
        "Sample: " + SAMPLE + "\nAaj shuru karein toh 4,000, regular 6,000. Fursat mein reply kijiye. Reply STOP to opt out." },
      { key: 'sample', title: 'After call: sample + pricing', body:
        "Baat karke accha laga, {{company}}. Ye raha sample: " + SAMPLE + "\nAisi hi website aapke institute ke liye: " +
        "courses aur batches, fee structure, results/toppers, faculty, admission enquiry form. Google Business aur WhatsApp setup bhi saath mein free. Aaj raat tak live, hosting " +
        "free, koi monthly fee nahi. Baad mein chhote changes hamesha free. Agencies 15-20 hazaar leti hain, aaj shuru " +
        "karein toh sirf 4,000 (regular 6,000). Aur haan, SiteBhai IIT Madras aur IIM se padhe founder ki company (Conyso) ka hissa hai, koi freelancer nahi. Risk bhi koi nahi: hum bana ke dikha denge, pasand aaye tabhi 4,000. Shuru " +
        "karoon? Reply STOP to opt out." },
      { key: 'btaayenge', title: 'After a "sochenge" call', body:
        "Koi jaldi nahi {{company}}. Sample dekh lijiye: " + SAMPLE + "\nSochte waqt bas itna: jo parent aapka naam " +
        "sunta hai, wo pehle Google karta hai. Admission season se pehle website live ho jaaye toh is saal asar dikhega. " +
        "Agencies 15-20 hazaar leti hain, hum 4,000 mein. Aur risk koi nahi, pasand aaye tabhi paise. Do din mein follow " +
        "up karunga. Reply STOP to opt out." },
      { key: 'followup', title: 'Day-2 follow-up', body:
        "Hi {{company}}, {{caller}} from SiteBhai. Sample dekha aapne? Parent admission se pehle institute Google karta hai; website na mile toh bade naam wale institute pe bharosa kar leta hai. " +
        "Har admission season mein ye bachche doosre institute chale jaate hain. Aapke liye abhi bhi 4,000 (regular 6,000), aaj raat tak live, pasand aaye tabhi paise. Bas 'haan' bhej dijiye, aaj hi live kar dun. Reply STOP to opt out." },
      { key: 'details', title: 'Full price list', body:
        "Poori price list, {{company}}:\n\n" +
        "Website: 4,000 (aaj shuru karein toh) / regular 6,000. Courses aur batches, fee structure, results/toppers, " +
        "faculty, admission enquiry form, mobile-friendly, 100+ pages (competitors 5-10 dete hain), SEO + AEO + GEO optimised (Google + AI dono pe dikhne ke liye). Aaj raat tak live, hosting free (fast " +
        "subdomain), koi monthly fee.\n" +
        "Apna domain (jaise aapkaclasses.in): pehla saal 1,499 (standard .in/.com), aapke naam register, DNS hum manage " +
        "karte hain; premium ho toh actual confirm karke, ya aap khud le lo hum free connect kar denge; phir 1,800/saal renewal.\n" +
        "Google Business Profile setup: FREE with website (Maps listing, timing, verification, taaki coaching near me pe dikhein).\n" +
        "WhatsApp Business setup: FREE with website (profile, catalog, auto-reply).\n" +
        "Custom tool (fee tracker, batch/attendance, test results portal): 7,999 se.\n" +
        "Chhote changes (batch timing, fees, results update): hamesha FREE, bas WhatsApp karo.\n" +
        "Bade changes (naya section, redesign): 1,499 se.\n\n" +
        "Aur sabse badi baat: pasand aaye tabhi paise. Sample: " + SAMPLE + "\nShuru karoon? Reply STOP to opt out." },
      { key: 'samples', title: 'Send samples', body:
        "Zaroor {{company}}, ek reference dekhiye, aur aapka apna demo bhi bana ke bhej sakta hoon: " + SAMPLE + "\nAajkal parent admission se pehle Google karta hai; jin institutes ki dhang ki website hai, unpe zyada bharosa karta hai. Aapke institute ki site results aur courses ke saath aise hi banegi. " +
        "SiteBhai IIT Madras + IIM founder ki company hai, koi risk nahi: pasand aaye tabhi 4,000 (regular 6,000), aaj raat tak live. Reply STOP to opt out." },
      { key: 'breakup', title: 'Break-up (last chance)', body:
        "Namaste {{company}}, {{caller}} from SiteBhai. Ye mera aakhri message, uske baad tang nahi karunga. " +
        "Do baatein saaf: (1) 4,000 wala rate aaj band ho raha hai, kal se 6,000. (2) Jab tak website nahi, jo log aapko online dhoondhte hain wo roz competitor ke paas jaate rahenge. " +
        "Website chahiye toh bas 'haan' likh dijiye, main aaj hi aapke naam se bana ke live kar dunga, paise tab bhi tabhi jab pasand aaye. Warna main aapko list se hata deta hoon, aur aapke kaam ke liye dil se shubhkaamnayein. Reply STOP to opt out." },
    ],
    steps: STEPS('sample', 'followup', 'samples', 'breakup'),
    flow: COACHING_FLOW,
  },

  // ============================ CLINICS ============================
  // ICP thesis: patients Google a doctor before visiting; a website = trust; small
  // practices always wanted one and were priced out. Tone: respectful, sober,
  // factual (doctors), no salesy medical claims anywhere.
  {
    name: 'Clinics', active: 1,
    scripts: [
      { title: '1. Opening (30 seconds)', body:
        "Goal of the call: get a yes to a WhatsApp. Respectful tone, 'doctor sahab'. Pain: patients Google them.\n\n" +
        "Step 1, just confirm (respectful): \"Namaste, {{company}} se baat ho rahi hai? Doctor sahab available hain?\"\n\n" +
        "Step 2, after the yes, intro + offer: \"{{caller}} bol raha hoon SiteBhai se, sirf ek minute lunga. Ye IIT Madras aur IIM se padhe founder ki company hai. Aaj kal naya patient " +
        "clinic aane se pehle doctor ka naam Google karta hai. Website mil jaaye toh bharosa ho jaata hai, na mile toh " +
        "wo agla naam dekh leta hai. Website ka socha hoga aapne, par agencies 15-20 hazaar bolti hain. Hum wahi " +
        "website 4,000 mein banate hain, aapki qualification, timings, appointment booking ke saath, aaj raat tak " +
        "live. Paise tabhi, jab pasand aaye. Sample WhatsApp karoon?\"" },
      { title: '2. If they say they will get back', body:
        "Doctors ke saath push bilkul nahi, respect hi close karta hai.\n\n" +
        "\"Bilkul doctor sahab, aaram se dekhiye. Sample abhi WhatsApp pe bhej deta hoon, aapke naam ke saath. Aaj " +
        "shuru karein toh 4,000, warna regular 6,000, par koi jaldi nahi. Do din baad ek chhota follow up kar lunga.\"\n\n" +
        "Then hit Send on WhatsApp and log Will get back." },
      { title: '3. If they do not pick up', body:
        "Patient ke saath honge. Turant 'Missed call' WhatsApp bhejo, phir 'No answer' log karo. Lunch time (1-3) ya " +
        "shaam ko dubara try karo, receptionist uthaye toh doctor ka time poochho." },
      { title: '4. Quick objection answers', body:
        "\"Practo/Justdial pe hoon\" -> Wahan aap doosre doctors ke beech listed ho, compare hota hai. Apni website = apni pehchaan, patient seedha aap tak. Dono saath chalte hain.\n" +
        "\"Kitna?\" -> 4,000 ek baar, koi monthly nahi. Agencies 15-20 hazaar leti hain. Aaj toh 4,000, regular 6,000.\n" +
        "\"Mehenga\" -> Do-teen consultations ke barabar, ek baar. Mahine ka ek naya patient bhi aaya toh kai guna wasool. Pay-after bhi hai.\n" +
        "\"Time nahi\" -> Bas naam, qualification, timings aur treatments ki list chahiye, baaki hum. Receptionist se bhi le sakte hain.\n" +
        "\"Apna domain milega?\" -> 4,000 mein fast subdomain pe live. Khud ka domain (jaise drsharma.in) pehla saal +1,499, phir 1,800/saal." },
      { title: '5. Follow-up call (day 2)', body:
        "\"Namaste doctor sahab, {{caller}} from SiteBhai. Jo sample bheja tha WhatsApp pe, dekh paaye aap? Pasand aaye " +
        "toh aaj raat tak live kar dun, aapke liye abhi bhi 4,000 mein, aur paise tabhi jab theek lage. Bataiye?\"" },
    ],
    templates: [
      { key: 'plans', title: 'Packages & care plans', body: PLANS_BODY },
      { key: 'missed', title: 'Missed call (send after no answer)', body:
        "Namaste {{company}}, {{caller}} from SiteBhai (IIT Madras + IIM founder ki company), abhi call kiya tha, shayad aap patients ke saath honge. Hum " +
        "doctors/clinics ke liye website banate hain: aapki qualification, timings, treatments aur WhatsApp appointment " +
        "booking ke saath, aaj raat tak live. Agencies 15-20 hazaar leti hain, hum sirf 4,000 mein, aur paise tabhi jab " +
        "bana ke pasand aaye. Sample: " + SAMPLE + "\nAaj shuru karein toh 4,000, regular 6,000. Fursat mein reply " +
        "kijiye. Reply STOP to opt out." },
      { key: 'sample', title: 'After call: sample + pricing', body:
        "Dhanyavaad doctor sahab ({{company}}). Ye raha sample: " + SAMPLE + "\nAisi hi website aapke clinic ke liye: " +
        "aapki qualification aur experience, treatments, consultation timings, WhatsApp appointment booking, clinic ka " +
        "map. Sab factual aur professional. Google Business aur WhatsApp setup bhi saath mein free. Aaj raat tak live, hosting free, koi monthly fee nahi. Chhote changes " +
        "(timing, number) hamesha free. Agencies 15-20 hazaar leti hain, aaj shuru karein toh sirf 4,000 (regular " +
        "6,000). Aur haan, SiteBhai IIT Madras aur IIM se padhe founder ki company (Conyso) ka hissa hai, koi freelancer nahi. Risk bhi koi nahi: hum bana ke dikha denge, pasand aaye tabhi 4,000. Shuru karoon? Reply STOP to opt out." },
      { key: 'btaayenge', title: 'After a "sochenge" call', body:
        "Koi jaldi nahi doctor sahab ({{company}}). Sample dekh lijiye: " + SAMPLE + "\nBas itna: naya patient clinic " +
        "aane se pehle aapka naam Google karta hai, website milte hi bharosa ban jaata hai. Agencies 15-20 hazaar leti " +
        "hain, hum 4,000 mein, aaj raat tak live. Aur risk koi nahi, pasand aaye tabhi paise. Do din mein follow up " +
        "karunga. Reply STOP to opt out." },
      { key: 'followup', title: 'Day-2 follow-up', body:
        "Namaste {{company}}, {{caller}} from SiteBhai. Sample dekha aapne? Naya patient clinic aane se pehle doctor ka naam Google karta hai; website mile toh bharosa banta hai, na mile toh agla naam dekh leta hai. " +
        "Har din ye naye patient doosri jagah ja rahe hain. Aapke liye abhi bhi 4,000 (regular 6,000), aaj raat tak live, paise tabhi jab theek lage. Bas 'haan' bhej dijiye, aaj hi live kar dun. Reply STOP to opt out." },
      { key: 'details', title: 'Full price list', body:
        "Poori price list, {{company}}:\n\n" +
        "Website: 4,000 (aaj shuru karein toh) / regular 6,000. Aapki qualification aur experience, treatments, " +
        "consultation timings, WhatsApp appointment booking, clinic ka map, mobile-friendly, 100+ pages (competitors 5-10 dete hain), SEO + AEO + GEO optimised (Google + AI dono pe dikhne ke liye). Aaj raat tak " +
        "live, hosting free (fast subdomain), koi monthly fee.\n" +
        "Apna domain (jaise drsharma.in): pehla saal 1,499 (standard .in/.com), aapke naam register, DNS hum manage " +
        "karte hain; premium ho toh actual confirm karke, ya aap khud le lo hum free connect kar denge; phir 1,800/saal renewal.\n" +
        "Google Business Profile setup: FREE with website (Maps listing, timing, verification, taaki doctor near me pe dikhein).\n" +
        "WhatsApp Business setup: FREE with website (profile, auto-reply, appointment messages).\n" +
        "Custom tool (appointment tracker, patient follow-up reminders): 7,999 se.\n" +
        "Chhote changes (timing, number, naya treatment): hamesha FREE, bas WhatsApp karo.\n" +
        "Bade changes (naya section, redesign): 1,499 se.\n\n" +
        "Aur sabse badi baat: pasand aaye tabhi paise. Sample: " + SAMPLE + "\nShuru karoon? Reply STOP to opt out." },
      { key: 'samples', title: 'Send samples', body:
        "Zaroor doctor sahab ({{company}}), ek reference dekhiye, aur aapka apna demo bhi bana ke bhej sakta hoon: " + SAMPLE + "\nAajkal naya patient doctor ka naam Google karta hai; jin doctors ki website hai, unpe zyada bharosa karta hai aur wahi choose karta hai. Aapke clinic ki site poori professional aise hi banegi. " +
        "SiteBhai IIT Madras + IIM founder ki company hai, koi risk nahi: pasand aaye tabhi 4,000 (regular 6,000), aaj raat tak live. Reply STOP to opt out." },
      { key: 'breakup', title: 'Break-up (last chance)', body:
        "Namaste {{company}}, {{caller}} from SiteBhai. Ye mera aakhri message, uske baad tang nahi karunga. " +
        "Do baatein saaf: (1) 4,000 wala rate aaj band ho raha hai, kal se 6,000. (2) Jab tak website nahi, jo log aapko online dhoondhte hain wo roz competitor ke paas jaate rahenge. " +
        "Website chahiye toh bas 'haan' likh dijiye, main aaj hi aapke naam se bana ke live kar dunga, paise tab bhi tabhi jab pasand aaye. Warna main aapko list se hata deta hoon, aur aapke kaam ke liye dil se shubhkaamnayein. Reply STOP to opt out." },
    ],
    steps: STEPS('sample', 'followup', 'samples', 'breakup'),
    flow: CLINIC_FLOW,
  },
];
