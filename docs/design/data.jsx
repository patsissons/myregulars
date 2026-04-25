// Shared mock data + helpers for all design directions

const VAULT = {
  name: "Sam's Regulars",
  updatedAt: "2026-04-22",
  locations: [
    {
      id: "bb",
      name: "Blue Bottle — Mission",
      description: "Tues/Thurs mornings",
      groups: [
        {
          id: "g1",
          name: "Staff",
          people: [
            { id: "p1", name: "Alex Tran", initials: "AT", detail: "Barista. Cat named Mochi.", lastSeen: "2026-04-22", role: "Staff" },
            { id: "p2", name: "Jamie Reyes", initials: "JR", detail: "Manager, Tues–Sat.", lastSeen: "2026-04-15", role: "Staff" },
            { id: "p3", name: "Priya Shah", initials: "PS", detail: "New hire, makes a great cortado.", lastSeen: "2026-04-08", role: "Staff" },
          ],
        },
        {
          id: "g2",
          name: "Morning regulars",
          people: [
            { id: "p4", name: "Taylor Quinn", initials: "TQ", detail: "Brings a golden retriever named Biscuit.", lastSeen: "2026-04-22", role: "Regular" },
            { id: "p5", name: "Marcus Doyle", initials: "MD", detail: "Architect. Always on the corner table.", lastSeen: "2026-04-18", role: "Regular" },
            { id: "p6", name: "Ines Park", initials: "IP", detail: "Oat latte. Reads physical newspapers.", lastSeen: "2026-04-21", role: "Regular" },
          ],
        },
      ],
    },
    {
      id: "nopa",
      name: "Nopa Bar",
      description: "Friday nights",
      groups: [
        {
          id: "g3", name: "Staff", people: [
            { id: "p7", name: "Devon Liu", initials: "DL", detail: "Bartender. Makes a perfect Negroni.", lastSeen: "2026-04-19", role: "Staff" },
            { id: "p8", name: "Rae Okafor", initials: "RO", detail: "Floor manager. Two cats: Salt & Pepper.", lastSeen: "2026-04-12", role: "Staff" },
          ],
        },
        {
          id: "g4", name: "Trivia night", people: [
            { id: "p9", name: "Hugo Bennett", initials: "HB", detail: "Team captain of 'The Quiz Lebowskis'.", lastSeen: "2026-04-19", role: "Friend" },
            { id: "p10", name: "Lila Mendez", initials: "LM", detail: "Knows every 80s movie. Vet tech.", lastSeen: "2026-04-19", role: "Friend" },
          ],
        },
      ],
    },
    {
      id: "cf",
      name: "CrossFit SoMa",
      description: "Mon/Wed/Fri 6am",
      groups: [
        {
          id: "g5", name: "6am crew", people: [
            { id: "p11", name: "Nina Patel", initials: "NP", detail: "Coach. Two kids, soccer on weekends.", lastSeen: "2026-04-20", role: "Coach" },
            { id: "p12", name: "Owen Briggs", initials: "OB", detail: "Triathlete. Recovering from a knee thing.", lastSeen: "2026-04-22", role: "Regular" },
            { id: "p13", name: "Sarah Kim", initials: "SK", detail: "Engineer at Stripe. Kettlebell wizard.", lastSeen: "2026-04-15", role: "Regular" },
            { id: "p14", name: "Vic Romero", initials: "VR", detail: "Just moved from Denver. Has a husky.", lastSeen: "2026-04-22", role: "Regular" },
          ],
        },
      ],
    },
    {
      id: "lib",
      name: "Mission Branch Library",
      description: "Sunday afternoons",
      groups: [
        {
          id: "g6", name: "Regulars", people: [
            { id: "p15", name: "Eleanor Whit", initials: "EW", detail: "Retired teacher. Loves mystery novels.", lastSeen: "2026-04-13", role: "Regular" },
          ],
        },
      ],
    },
  ],
};

// Stable hue from initials so colored circles are consistent across views
function hueFromString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function daysAgo(iso, today = "2026-04-22") {
  const a = new Date(iso), b = new Date(today);
  return Math.round((b - a) / 86400000);
}
function lastSeenLabel(iso) {
  const d = daysAgo(iso);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return d + "d ago";
  if (d < 30) return Math.round(d / 7) + "w ago";
  return Math.round(d / 30) + "mo ago";
}

window.VAULT = VAULT;
window.hueFromString = hueFromString;
window.lastSeenLabel = lastSeenLabel;
window.daysAgo = daysAgo;
