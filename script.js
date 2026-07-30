async function fetchJSON(url) {
    try { const r = await fetch(url); if (!r.ok) throw Error(); return await r.json(); } catch { return null; }
}

async function loadAPIs() {
    const wiki = await fetchJSON('https://en.wikipedia.org/api/rest_v1/page/summary/Compton,_California');
    const el = document.getElementById('wiki-summary');
    if (wiki?.extract) {
        el.textContent = wiki.extract.split('. ').slice(0, 2).join('. ') + '.';
    } else {
        el.textContent = 'Compton \u2014 the Hub City in Los Angeles County. Incorporated 1888.';
    }
}

// ---------- Geolocation ----------
const COMPTON_LAT = 33.8958, COMPTON_LON = -118.2201;

function distanceMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getCityFromCoords(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'ComptonCommunityHub/1.0' } });
        if (!resp.ok) return null;
        const data = await resp.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || null;
        const state = addr.state || '';
        return city ? { city, state } : null;
    } catch { return null; }
}

async function getCityFact(city) {
    try {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(city)}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.extract) return null;
        const sentences = data.extract.split('. ').filter(s => s.length > 20);
        return sentences.slice(0, 2).join('. ') + '.';
    } catch { return null; }
}

function initGeo() {
    const btn = document.getElementById('geo-btn');
    const data = document.getElementById('geo-data');
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            data.textContent = 'Geolocation isn\u2019t supported by your browser \u2014 you can still browse every resource below.';
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Locating\u2026';
        navigator.geolocation.getCurrentPosition(
            async pos => {
                const lat = pos.coords.latitude, lon = pos.coords.longitude;
                const dist = distanceMiles(lat, lon, COMPTON_LAT, COMPTON_LON);

                if (dist < 3) {
                    data.textContent = `\u{1F4CD} You\u2019re right here in Compton \u{1F3E0} (about ${dist.toFixed(1)} mi from the Civic Center) \u2014 every resource below is close by.`;
                    btn.textContent = 'Locate Me Again';
                    btn.disabled = false;
                    trackEvent('location');
                    return;
                }

                const info = await getCityFromCoords(lat, lon);
                const city = info ? info.city : null;
                const state = info ? info.state : '';
                const loc = city ? (state ? `${city}, ${state}` : city) : 'your area';

                let fact = null;
                if (city) fact = await getCityFact(city);

                data.textContent = fact
                    ? `\u{1F4CD} You\u2019re in ${loc} (${dist.toFixed(1)} mi from Compton). Fun fact: ${fact}`
                    : `\u{1F4CD} You\u2019re in ${loc} (${dist.toFixed(1)} mi from Compton). These resources serve the 90220\u201390222 area.`;
                btn.textContent = 'Locate Me Again';
                btn.disabled = false;
                trackEvent('location');
            },
            () => {
                data.textContent = 'Couldn\u2019t get your location \u2014 you can still browse every resource below.';
                btn.textContent = 'Try Again';
                btn.disabled = false;
            },
            { timeout: 8000 }
        );
    });
}

// ---------- Compton Affirmations ----------
const comptonAffirmations = [
    "You belong here. Compton is stronger because you're in it.",
    "Every day you show up, you're building something bigger than yourself.",
    "Your story is part of Compton's story — and that story is one of resilience and power.",
    "You don't have to leave Compton to be somebody. You can be somebody right here.",
    "The same streets that raised legends are raising you. Keep going.",
    "Your presence in this community matters more than you know.",
    "Compton isn't just a city — it's a foundation. Stand tall on it.",
    "You are worthy of every resource, every opportunity, and every bit of peace you find here.",
    "Small steps toward your goals are still steps. Compton didn't build itself overnight.",
    "You are not alone. This community is here for you, and you are here for it."
];

// ---------- Notifications ----------
function requestNotifPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function sendNotification(title, body) {
    const icon = "https://www.cityofcompton.org/sites/default/files/styles/logo/public/2021-10/compton-logo.png";
    if (Notification.permission === "granted") {
        new Notification(title, { body, icon });
    }
}

function showComptonToast(type) {
    const container = document.getElementById("toast-container") || (() => {
        const el = document.createElement("div");
        el.id = "toast-container";
        document.body.appendChild(el);
        return el;
    })();

    const text = type === "affirmation"
        ? comptonAffirmations[Math.floor(Math.random() * comptonAffirmations.length)]
        : comptonFacts[Math.floor(Math.random() * comptonFacts.length)];
    const icon = type === "affirmation" ? "✨" : "💡";
    const title = type === "affirmation" ? "Compton Affirmation" : "Compton Pride";

    const toast = document.createElement("div");
    toast.className = "compton-toast";
    toast.innerHTML = `<span class="toast-icon">${icon}</span><div><strong>${title}</strong><br>${text}</div>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));

    sendNotification(title, text);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 6000);
}

function initNotifications() {
    requestNotifPermission();
    const btn = document.getElementById("notif-btn");
    if (btn) {
        btn.addEventListener("click", () => {
            const type = Math.random() < 0.5 ? "affirmation" : "fact";
            showComptonToast(type);
        });
    }
}

// ---------- Positive facts ----------
const comptonFacts = [
    'Compton is the hometown of tennis champions Venus and Serena Williams, who first trained on the city\u2019s public courts.',
    'Compton College has offered an affordable path to degrees and university transfer since 1927.',
    'The Compton Cowboys and Compton Jr. Posse keep a century-old Black cowboy tradition alive, mentoring youth through horsemanship.',
    'Community gardens and urban farming programs across the city are helping residents grow fresh produce and build food security.',
    'Public murals throughout Compton celebrate the city\u2019s history, culture, and community pride.',
    'Local nonprofits like the NHS Center for Sustainable Communities connect residents with clean energy grants and homeownership support.',
    'Compton Unified School District runs free after-school STEM, arts, and tutoring programs at every elementary and middle school.',
    'Many of hip-hop\u2019s most influential artists got their start in Compton, putting the city on the global cultural map.',
    'The Compton Self-Help Legal Center gives residents free access to the justice system without needing to hire a lawyer.',
    'Community health centers in Compton provide care to everyone, regardless of insurance status or ability to pay.'
];
let factIndex = 0;

function showFact(i) {
    const el = document.getElementById('fact-data');
    if (!el) return;
    el.style.opacity = 0;
    setTimeout(() => {
        el.textContent = comptonFacts[i];
        el.style.opacity = 1;
    }, 200);
}

function initFacts() {
    factIndex = Math.floor(Math.random() * comptonFacts.length);
    showFact(factIndex);
    const btn = document.getElementById('fact-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            factIndex = (factIndex + 1) % comptonFacts.length;
            showFact(factIndex);
            trackEvent('fact');
        });
    }
    setInterval(() => {
        factIndex = (factIndex + 1) % comptonFacts.length;
        showFact(factIndex);
    }, 12000);
}

// ---------- Badges / incentives ----------
const BADGE_DEFS = [
    { id: 'explorer',  icon: '\u{1F9ED}', name: 'Explorer',    desc: 'Visit all 7 sections' },
    { id: 'curious',   icon: '\u{1F50D}', name: 'Curious Mind', desc: 'Open 5 resource cards' },
    { id: 'connected', icon: '\u{1F91D}', name: 'Connected',    desc: 'Tap 3 phone numbers' },
    { id: 'local',     icon: '\u{1F4CD}', name: 'Located',      desc: 'Check your distance from Compton' },
    { id: 'informed',  icon: '\u2728', name: 'Informed',     desc: 'Read 3 Compton Pride facts' }
];

function loadState() {
    try {
        const p = JSON.parse(localStorage.getItem('comptonHubState'));
        if (!p) throw 0;
        return {
            sectionsVisited: new Set(p.sectionsVisited || []),
            cardsOpened: new Set(p.cardsOpened || []),
            phoneClicks: p.phoneClicks || 0,
            locationChecked: !!p.locationChecked,
            factsViewed: p.factsViewed || 0,
            earnedBadges: new Set(p.earnedBadges || [])
        };
    } catch {
        return { sectionsVisited: new Set(), cardsOpened: new Set(), phoneClicks: 0, locationChecked: false, factsViewed: 0, earnedBadges: new Set() };
    }
}

let hubState = loadState();

function saveState() {
    try {
        localStorage.setItem('comptonHubState', JSON.stringify({
            sectionsVisited: [...hubState.sectionsVisited],
            cardsOpened: [...hubState.cardsOpened],
            phoneClicks: hubState.phoneClicks,
            locationChecked: hubState.locationChecked,
            factsViewed: hubState.factsViewed,
            earnedBadges: [...hubState.earnedBadges]
        }));
    } catch {}
}

function checkBadges() {
    const met = {
        explorer: hubState.sectionsVisited.size >= 7,
        curious: hubState.cardsOpened.size >= 5,
        connected: hubState.phoneClicks >= 3,
        local: hubState.locationChecked,
        informed: hubState.factsViewed >= 3
    };
    Object.entries(met).forEach(([id, isMet]) => {
        if (isMet && !hubState.earnedBadges.has(id)) {
            hubState.earnedBadges.add(id);
            showToast(id);
        }
    });
}

function trackEvent(type, value) {
    if (type === 'section') hubState.sectionsVisited.add(value);
    if (type === 'card') hubState.cardsOpened.add(value);
    if (type === 'phone') hubState.phoneClicks++;
    if (type === 'location') hubState.locationChecked = true;
    if (type === 'fact') hubState.factsViewed++;
    checkBadges();
    saveState();
    renderBadges();
}

function renderBadges() {
    const list = document.getElementById('badges-list');
    if (!list) return;
    list.innerHTML = '';
    BADGE_DEFS.forEach(b => {
        const earned = hubState.earnedBadges.has(b.id);
        const chip = document.createElement('div');
        chip.className = 'badge-chip' + (earned ? ' earned' : '');
        chip.title = b.desc;
        chip.innerHTML = `<span class="badge-icon">${earned ? b.icon : '\u{1F512}'}</span><span class="badge-name">${b.name}</span>`;
        list.appendChild(chip);
    });
}

function showToast(badgeId) {
    const b = BADGE_DEFS.find(x => x.id === badgeId);
    if (!b) return;
    const toast = document.createElement('div');
    toast.className = 'badge-toast';
    toast.innerHTML = `<span class="toast-icon">${b.icon}</span><div><strong>Badge earned!</strong><br>${b.name} \u2014 ${b.desc}</div>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

document.addEventListener('click', e => {
    if (e.target.closest('.call-btn')) trackEvent('phone');
});

const sectionData = [
    {
        id: 'home', label: 'Welcome', icon: '\u{1F3E0}',
        cards: [],
        content: `
            <h2>Welcome, Compton</h2>
            <p class="lead">This hub connects you with resources to build skills, find opportunities, know your rights, and strengthen our community.</p>
            <div class="callout">
                <strong>You have power.</strong> The more you know about the resources around you \u2014 free education, job training, health care, legal help \u2014 the stronger you and your community become. Everything here is free or low-cost. Start anywhere.
            </div>
            <div class="resource-card" onclick="this.classList.toggle('expanded')">
                <h3>Quick Start \u2014 Pick a section above <span class="expand-icon">\u25BC</span></h3>
                <div class="preview">Education, jobs, health, housing, youth programs, and your legal rights \u2014 all in one place.</div>
                <div class="full">
                    <strong>\u{1F4DA} Education & Skills</strong> \u2014 GED, ESL, college, computer classes<br>
                    <strong>\u{1F4BC} Jobs & Training</strong> \u2014 Career counseling, job training, paid programs<br>
                    <strong>\u{1F3E5} Health & Wellness</strong> \u2014 Free/low-cost clinics, mental health, food<br>
                    <strong>\u{1F3E0} Housing & Legal</strong> \u2014 Tenant rights, legal aid, self-help center<br>
                    <strong>\u{1F476} Youth & Seniors</strong> \u2014 After-school, mentoring, senior services<br>
                    <strong>\u2696\uFE0F Know Your Rights</strong> \u2014 Legal rights, police, tenants, workers
                </div>
                <div class="meta">All resources serve the Compton area (90220, 90221, 90222).</div>
            </div>
            <div class="resource-card" onclick="this.classList.toggle('expanded')">
                <h3>Need help now? <span class="expand-icon">\u25BC</span></h3>
                <div class="preview">Emergency numbers and crisis hotlines available 24/7.</div>
                <div class="full">
                    <strong>Emergency:</strong> 911<br>
                    <strong>LA County Info Line:</strong> (800) 339-6993 \u2014 24/7 resource referral<br>
                    <strong>211 LA County:</strong> Dial 211 \u2014 health, housing, food, job help<br>
                    <strong>Crisis & Suicide Hotline:</strong> 988
                </div>
                <div class="meta"><a href="tel:911" class="call-btn">\u{1F4DE} Call 911</a> <a href="tel:988" class="call-btn">\u{1F4DE} Call 988</a></div>
            </div>
        `
    },
    {
        id: 'education', label: 'Education', icon: '\u{1F4DA}',
        cards: [
            { title:'High School Diploma & GED', org:'Compton Adult School', preview:'Free high school diploma classes, GED/HiSET test prep, and basic education for adults 18+.', full:'Day and evening classes at multiple locations across Compton. No cost. Open to adults 18+.', phone:'(310) 898-6470', cost:'Free' },
            { title:'English as a Second Language (ESL)', org:'Compton Adult School & Compton College', preview:'Free ESL classes from beginner to advanced. Also Vocational ESL (VESL).', full:'Learn English while training for a career \u2014 healthcare, childcare, coding, or office work.', phone:'(310) 898-6470', cost:'Free' },
            { title:'Compton College', org:'1111 E Artesia Blvd, Compton', preview:'Public community college offering degrees, transfers, and workforce certificates.', full:'Financial aid, scholarships, and support services available. Associate degrees and certificate programs.', phone:'(310) 900-1600', cost:'Financial aid available' },
            { title:'Citizenship Classes', org:'Compton Adult School', preview:'Free preparation for the U.S. citizenship test.', full:'Learn U.S. history, government, and the naturalization process.', phone:'(310) 898-6470', cost:'Free' },
            { title:'Computer & Digital Skills', org:'Compton Adult School', preview:'Free computer classes for digital literacy.', full:'Microsoft Office, online job search skills, basic computer operations.', phone:'(310) 898-6470', cost:'Free' },
            { title:'Forklift, Truck Driving & MC3', org:'Compton Adult School \u2014 CTE', preview:'Hands-on training for high-demand jobs.', full:'Multi-Craft Core Curriculum (MC3) for construction trades.', phone:'(310) 898-6470', cost:'Financial aid available' }
        ],
        content: ''
    },
    {
        id: 'jobs', label: 'Jobs & Training', icon: '\u{1F4BC}',
        cards: [
            { title:'Compton CareerLink', org:'700 N Bullis Rd, Compton', preview:'Free job search assistance, career counseling, resume help.', full:'They connect you with local employers and training programs. Monthly job listings.', phone:'(310) 605-5582', cost:'Free' },
            { title:'America\'s Job Center (AJCC)', org:'2909 E Pacific Commerce Dr, Compton', preview:'No-cost job training, LinkedIn help, financial literacy.', full:'Unemployment assistance, GED referrals, youth and veteran services.', cost:'Free' },
            { title:'EMS Corps Program', org:'NHS Center for Sustainable Communities', preview:'Paid 5-month EMT training for ages 18-26.', full:'Earn 17 college credits, monthly stipend, and job placement. Firefighting and emergency response.', phone:'(424) 785-8411', cost:'Paid training + college credit' },
            { title:'SECTOR Program', org:'EntreNous Community Empowerment', preview:'Paid training in culinary, construction, welding \u2014 up to $300/week.', full:'For adults 18+ who have been arrested, charged, or convicted. Must live in 90220, 90221, 90222, 90223, 90224, 90059, or 90061.', cost:'Up to $300/week' },
            { title:'YouthBuild Compton', org:'EntreNous Community Empowerment', preview:'Ages 16-24. Earn GED/diploma while learning construction.', full:'Build affordable housing. Leadership development and job placement included.', cost:'Free \u2014 paid training' },
            { title:'Small Business Development Center', org:'At NHS CSC Compton', preview:'Free business consulting for entrepreneurs.', full:'Business plans, financing, marketing, accounting, legal, social media.', phone:'(424) 785-8411', cost:'Free' },
            { title:'City of Compton Jobs', org:'Compton City Hall', preview:'The city hires for police, fire, admin, parks, public works.', full:'Check the city website for current openings and recruitment events.', phone:'(310) 605-5524' }
        ],
        content: ''
    },
    {
        id: 'health', label: 'Health & Food', icon: '\u{1F3E5}',
        cards: [
            { title:'ROADS Community Clinic', org:'121 S Long Beach Blvd, Compton', preview:'Full-service health center \u2014 medical, dental, behavioral health.', full:'Women\'s health, prenatal care, podiatry. Serves all ages. Insurance not required.', phone:'(310) 627-5850', cost:'Sliding scale / free' },
            { title:'AGHABY Community Health Center', org:'349 W Compton Blvd, Compton', preview:'Free and low-cost primary care, pediatric, women\'s health.', full:'No insurance needed. Near Civic Center.', phone:'(424) 785-8797', cost:'Free / low-cost' },
            { title:'Compton College Student Health Center', org:'Compton College', preview:'Medical care and mental health counseling for students.', full:'Wellness resources available by appointment.', phone:'(213) 226-7480', cost:'By appointment' },
            { title:'Compton Food Pantry', org:'St. James AME Church', preview:'Free groceries, fresh produce, essential items.', full:'Serves seniors, families, veterans, disabled. No ID or proof of income required.', phone:'(310) 801-1490', cost:'Free' },
            { title:'Salvation Army \u2014 Compton Corps', org:'736 E Compton Blvd, Compton', preview:'Food assistance, hot meals, utility help, bus tokens.', full:'Hot meals Mon 4:30PM. Snack packs Fri 10AM-12PM. After-school and summer programs.', phone:'(310) 639-3621', cost:'Free' },
            { title:'24/7 Crisis Support', org:'', preview:'988 \u2014 Suicide & Crisis Lifeline.', full:'LA County Mental Health: (800) 854-7771. Substance Abuse: (800) 992-1660. Child Abuse: (800) 540-4000.' }
        ],
        content: ''
    },
    {
        id: 'housing', label: 'Housing & Legal', icon: '\u{1F3E0}',
        cards: [
            { title:'Compton Self-Help Resource Center', org:'200 W Compton Blvd, Room 200F (Courthouse)', preview:'Free legal help for people without lawyers.', full:'Family law, eviction defense, landlord-tenant, small claims. Form help and court guidance.', phone:'(323) 402-5120', cost:'Free' },
            { title:'NHS Center for Sustainable Communities', org:'Compton CSC', preview:'Housing resources, financial counseling, homeownership programs.', full:'Clean energy grants, neighborhood revitalization.', phone:'(424) 785-8411' },
            { title:'Housing Choice Voucher (Section 8)', org:'Compton Housing Authority', preview:'Rental assistance for low-income families, seniors, disabled.', full:'Contact for application information and waitlist status.', phone:'(310) 605-5535' },
            { title:'Tenant Rights', org:'', preview:'Know your rights as a renter in Compton and LA County.', full:'Safe housing required. No eviction without court order. Rent increase limits. Right to organize. Retaliation is illegal.', phone:'(800) 379-2020' },
            { title:'Utility Assistance', org:'Salvation Army \u2014 Compton Corps', preview:'Help with water, gas, and electric bills.', full:'Call to schedule an appointment.', phone:'(310) 639-3621' }
        ],
        content: ''
    },
    {
        id: 'youth', label: 'Youth & Seniors', icon: '\u{1F476}',
        cards: [
            { title:'ASES After-School Program', org:'Compton Unified School District', preview:'Free after-school program for K-8 students.', full:'Tutoring, homework help, art, music, STEM. Runs school days until 6 PM at all elementary and middle schools.', cost:'Free' },
            { title:'Compton YAL', org:'Sheriff\'s Youth Foundation', preview:'Free after-school with tutoring, sports, arts, field trips.', full:'Reading workshop, computers, gardening, soccer, basketball, tennis, boxing. Leadership academy for teens.', cost:'Free' },
            { title:'The Thirkield Center', org:'Compton', preview:'Mentorship, STEM, mental health, food security, job readiness.', full:'Holistic youth development serving underserved youth in Compton.' },
            { title:'YouthBuild Compton', org:'EntreNous Community Empowerment', preview:'Ages 16-24. Earn GED/diploma while building housing.', full:'Construction skills, leadership development, job placement.', cost:'Free \u2014 paid training' },
            { title:'Sanctuary of Hope', org:'At NHS CSC Compton', preview:'Ages 16-25. Housing, counseling, mentoring, employment.', full:'For youth impacted by foster care, justice system, or housing insecurity.', phone:'(424) 785-8411' },
            { title:'Fire Explorer Program', org:'Compton Fire Department', preview:'Ages 14-21. Learn firefighting and leadership.', full:'Pathway to fire service careers.', cost:'Free' },
            { title:'Dollarhide Community Center', org:'301 N Tamarind Ave, Compton', preview:'Senior activities, bilingual programs, childcare, health services.', full:'Ages 55+ for seniors, 3+ general. Intergenerational programs.', phone:'(310) 605-5688' },
            { title:'Senior Transportation', org:'City of Compton Recreation Dept.', preview:'Transportation to medical appointments and grocery stores.', full:'Also community activities.', phone:'(310) 605-5688' }
        ],
        content: ''
    },
    {
        id: 'rights', label: 'Know Your Rights', icon: '\u2696\uFE0F',
        cards: [
            { title:'Police Encounters', org:'Your Rights', preview:'Remain silent. Refuse searches. Right to a lawyer.', full:'You have the right to remain silent. Say "I am exercising my right." You can refuse a search. If arrested, you have the right to a lawyer and a phone call. Stay calm. Keep hands visible.' },
            { title:'Tenant Rights', org:'Your Rights', preview:'Safe housing, no lockouts, rent protections.', full:'Landlord must provide heat, water, electricity. No eviction without court order. LA County limits rent increases. You can organize with other tenants. Retaliation is illegal.', phone:'(800) 379-2020' },
            { title:'Workers\' Rights', org:'Your Rights', preview:'Minimum wage, overtime, breaks, safe workplace.', full:'CA minimum wage $16.50/hr. Overtime 1.5x after 8hrs/day. Meal and rest breaks required. Undocumented workers have the same rights.', phone:'(833) 526-4636' },
            { title:'Immigration Rights', org:'Your Rights', preview:'Right to remain silent. Refuse ICE without warrant.', full:'Do not answer questions about status. Do not open door without judicial warrant. Right to a lawyer. Do not sign anything without legal advice.', cost:'Know your rights \u2014 regardless of status' },
            { title:'Free Legal Help', org:'Compton Self-Help Center', preview:'200 W Compton Blvd, Room 200F (Courthouse).', full:'Free legal information, form help for family law, landlord-tenant, small claims.', phone:'(323) 402-5120', cost:'Free' }
        ],
        content: ''
    }
];

function buildResourceCard(c) {
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.dataset.search = (c.title + ' ' + c.org + ' ' + c.preview).toLowerCase();

    let metaHTML = '';
    const parts = [];
    if (c.cost) parts.push(`<strong>${c.cost}</strong>`);
    if (c.phone) {
        parts.push(`<a href="tel:${c.phone.replace(/[^\d]/g,'')}" class="call-btn">\u{1F4DE} ${c.phone}</a>`);
    }
    metaHTML = parts.join(' \u00B7 ');

    card.innerHTML = `
        <h3>${c.title} <span class="expand-icon">\u25BC</span></h3>
        ${c.org ? `<div class="org">${c.org}</div>` : ''}
        <div class="preview">${c.preview}</div>
        ${c.full ? `<div class="full">${c.full}</div>` : ''}
        ${metaHTML ? `<div class="meta">${metaHTML}</div>` : ''}
    `;

    card.addEventListener('click', e => {
        if (e.target.closest('.call-btn, .copy-btn')) return;
        card.classList.toggle('expanded');
        if (card.classList.contains('expanded')) trackEvent('card', c.title);
    });
    return card;
}

const tabsContainer = document.getElementById('tabs');
const contentContainer = document.getElementById('content');
const searchInput = document.getElementById('search-input');
const resultCount = document.getElementById('result-count');
let allCards = [];
let currentSection = 'home';

function renderTabs() {
    sectionData.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.dataset.id = s.id;
        btn.textContent = s.icon + ' ' + s.label;
        if (s.cards.length) {
            const span = document.createElement('span');
            span.className = 'count';
            span.textContent = s.cards.length;
            btn.appendChild(span);
        }
        btn.addEventListener('click', () => switchTo(s.id));
        tabsContainer.appendChild(btn);
    });
}

function buildSection(section) {
    const div = document.createElement('div');
    div.className = 'section';
    div.id = 'section-' + section.id;

    let html = section.content || `<h2>${section.label}</h2><p class="lead">${section.label === 'Education & Skills' ? 'Free and low-cost programs to earn your diploma, learn English, gain job skills, or start college.' : section.label === 'Jobs & Training' ? 'Free job search help, career training, paid training programs, and connections to local employers.' : section.label === 'Health & Food' ? 'Access free and low-cost medical care, dental, mental health services, and food assistance.' : section.label === 'Housing & Legal' ? 'Know your rights as a tenant, get legal help, and find housing assistance.' : section.label === 'Youth & Seniors' ? 'Programs for all ages \u2014 from after-school tutoring to senior wellness.' : section.label === 'Know Your Rights' ? 'Knowledge is power. Understanding your legal rights protects you and your family.' : ''}</p>`;

    if (section.id !== 'home') {
        if (section.id === 'education') {
            html += `<div class="callout"><strong>Bilingual support available.</strong> Many programs offer services in Spanish. <em>Muchos programas ofrecen servicios en espa\u00F1ol.</em></div>`;
        }
        if (section.id === 'jobs') {
            html += `<div class="callout"><strong>You don't need a degree to start.</strong> Many programs pay you while you train and help with job placement after.</div>`;
        }
        if (section.id === 'health') {
            html += `<div class="callout"><strong>Your health matters.</strong> These clinics serve everyone regardless of insurance status or ability to pay.</div>`;
        }
        if (section.id === 'housing') {
            html += `<div class="callout"><strong>You have rights.</strong> Whether you rent, own, or are looking for housing \u2014 these organizations can help.</div>`;
        }
        if (section.id === 'rights') {
            html += `<div class="callout"><strong>These rights apply regardless of immigration status.</strong> Everyone in the U.S. has certain constitutional rights, no matter their documentation status.</div>`;
        }
    }

    div.innerHTML = html;
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-container';
    section.cards.forEach(c => {
        const cardEl = buildResourceCard(c);
        allCards.push(cardEl);
        cardContainer.appendChild(cardEl);
    });
    div.appendChild(cardContainer);
    return div;
}

function switchTo(id) {
    const existing = document.querySelector('.section.active');
    if (existing) existing.remove();

    const section = sectionData.find(s => s.id === id);
    if (!section) return;

    const el = document.querySelector(`#section-${id}`);
    let div;
    if (el) {
        div = el;
    } else {
        div = buildSection(section);
        contentContainer.appendChild(div);
    }
    div.classList.add('active');

    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.id === id);
    });
    currentSection = id;
    trackEvent('section', id);

    if (searchInput.value) filterCards(searchInput.value);

    setTimeout(() => {
        div.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
}

function filterCards(query) {
    const q = query.toLowerCase().trim();
    const activeSection = document.querySelector('.section.active');
    if (!activeSection) return;

    const cards = activeSection.querySelectorAll('.resource-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const text = card.dataset.search || card.textContent.toLowerCase();
        const match = !q || text.includes(q);
        card.style.display = match ? '' : 'none';
        if (match) visibleCount++;
    });

    if (q) {
        resultCount.textContent = `${visibleCount} result${visibleCount !== 1 ? 's' : ''}`;
    } else {
        resultCount.textContent = '';
    }
}

searchInput.addEventListener('input', e => filterCards(e.target.value));

const scrollBtn = document.getElementById('scroll-top');
window.addEventListener('scroll', () => {
    scrollBtn.classList.toggle('visible', window.scrollY > 300);
});
scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

renderTabs();
switchTo('home');
loadAPIs();
initGeo();
initFacts();
initNotifications();
renderBadges();
