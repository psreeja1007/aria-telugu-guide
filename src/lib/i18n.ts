import type { Style } from "@/lib/settings";

type Pair = { pure: string; mix: string };
const s = (pure: string, mix: string): Pair => ({ pure, mix });

const STRINGS = {
  greeting: s("నమస్కారం! నేను ఆరియా.", "Hi! నేను Aria."),
  tagline: s(
    "మీకు ఏ విషయం తెలుసుకోవాలన్నా అడగండి. సులభంగా, తెలుగులో వివరిస్తాను.",
    "ఏ topic అయినా అడగండి. Simple గా, తెలుగులో explain చేస్తా.",
  ),
  placeholder: s("ఇక్కడ టైప్ చేయండి...", "ఇక్కడ type చేయండి..."),
  tapToSpeak: s("మాట్లాడటానికి నొక్కండి", "Mic నొక్కి మాట్లాడండి"),
  orType: s("లేదా కింద టైప్ చేయండి", "లేదా కింద type చేయండి"),
  listening: s("వింటున్నాను... ఆపడానికి మళ్ళీ నొక్కండి", "వింటున్నా... Stop కి మళ్ళీ నొక్కండి"),
  transcribing: s("మీ మాట అర్థం చేసుకుంటున్నాను...", "మీ voice process చేస్తున్నా..."),
  thinking: s("ఆలోచిస్తున్నాను...", "ఆలోచిస్తున్నా..."),
  speaking: s("మాట్లాడుతున్నాను", "మాట్లాడుతున్నా"),
  stop: s("ఆపు", "Stop"),
  replay: s("మళ్ళీ వినండి", "మళ్ళీ వినండి"),
  send: s("పంపు", "Send"),
  mic: s("మైక్", "Mic"),
  newChat: s("కొత్త సంభాషణ", "New chat"),
  exploreTitle: s("ఈరోజు ఏం నేర్చుకుందాం?", "ఈరోజు ఏం నేర్చుకుందాం?"),
  exploreHint: s(
    "ఒక అంశం నొక్కండి, లేదా మీకు నచ్చిన ఏ విషయమైనా అడగండి.",
    "ఒక topic నొక్కండి, లేదా మీకు నచ్చిన ఏ విషయమైనా అడగండి.",
  ),
  topics: s("అంశాలు", "Topics"),
  settings: s("అమరికలు", "Settings"),
  close: s("మూసివేయి", "Close"),
  styleQuestion: s("ఆరియా ఎలా మాట్లాడాలి?", "Aria ఎలా మాట్లాడాలి?"),
  stylePure: s("స్వచ్ఛమైన తెలుగు", "స్వచ్ఛమైన తెలుగు"),
  styleMix: s("తెలుగు + English", "తెలుగు + English"),
  stylePureSample: s(
    "\"యూపీఐ అంటే ఫోన్ నుండి వెంటనే డబ్బు పంపే పద్ధతి.\"",
    "\"యూపీఐ అంటే ఫోన్ నుండి వెంటనే డబ్బు పంపే పద్ధతి.\"",
  ),
  styleMixSample: s(
    "\"UPI అంటే phone నుండి direct గా money పంపే simple method.\"",
    "\"UPI అంటే phone నుండి direct గా money పంపే simple method.\"",
  ),
  styleChangeLater: s("దీన్ని ఎప్పుడైనా పైన మార్చుకోవచ్చు.", "దీన్ని ఎప్పుడైనా పైన change చేయొచ్చు."),
  voiceLabel: s("ఆరియా గొంతు", "Aria voice"),
  voice1: s("గొంతు 1 (పూజ)", "Voice 1 (Pooja)"),
  voice2: s("గొంతు 2 (కవిత)", "Voice 2 (Kavitha)"),
  tryVoice: s("వినండి", "వినండి"),
  voiceSample: s(
    "నమస్కారం! నేను ఆరియా. మీకు ఏ సందేహం ఉన్నా నన్ను అడగండి.",
    "Hi! నేను Aria. మీకు ఏ doubt ఉన్నా నన్ను అడగండి.",
  ),
  autoSpeak: s("జవాబులు గట్టిగా చదివి వినిపించు", "Answers ని voice లో వినిపించు"),
  on: s("ఆన్", "On"),
  off: s("ఆఫ్", "Off"),
  pace: s("మాట్లాడే వేగం", "మాట్లాడే speed"),
  paceSlow: s("నెమ్మదిగా", "Slow"),
  paceNormal: s("మామూలుగా", "Normal"),
  textSize: s("అక్షరాల పరిమాణం", "Text size"),
  sizeNormal: s("మామూలు", "Normal"),
  sizeLarge: s("పెద్దగా", "Large"),
  safety: s(
    "జాగ్రత్త: మీ UPI PIN, OTP, బ్యాంక్ వివరాలు ఎవరికీ చెప్పకండి, ఆరియాకి కూడా. మోసం జరిగితే వెంటనే 1930 కి కాల్ చేయండి లేదా cybercrime.gov.in లో ఫిర్యాదు చేయండి.",
    "జాగ్రత్త: మీ UPI PIN, OTP, bank details ఎవరికీ చెప్పకండి, Aria కి కూడా. Fraud జరిగితే వెంటనే 1930 కి call చేయండి లేదా cybercrime.gov.in లో complaint ఇవ్వండి.",
  ),
  disclaimer: s(
    "ఆరియా ఒక AI. కొన్నిసార్లు తప్పులు చేయవచ్చు, తాజా వార్తలు తెలియకపోవచ్చు. డబ్బు, ఆరోగ్యం, చట్టం విషయాలు నిపుణులతో నిర్ధారించుకోండి.",
    "Aria ఒక AI. కొన్నిసార్లు తప్పులు చేయొచ్చు, latest news తెలియకపోవచ్చు. Money, health, legal విషయాలు experts తో confirm చేసుకోండి.",
  ),
  about: s("ఆరియా గురించి", "About Aria"),
  errGeneric: s("క్షమించండి, ఏదో తప్పు జరిగింది. మళ్ళీ ప్రయత్నించండి.", "Sorry, ఏదో problem వచ్చింది. మళ్ళీ try చేయండి."),
  errRate: s("చాలా ప్రశ్నలు ఒకేసారి వచ్చాయి. ఒక నిమిషం ఆగి మళ్ళీ అడగండి.", "చాలా requests వచ్చాయి. ఒక minute ఆగి మళ్ళీ try చేయండి."),
  errCredits: s("ఆరియా సేవ ప్రస్తుతం అందుబాటులో లేదు. తర్వాత ప్రయత్నించండి.", "Aria service ఇప్పుడు available లేదు. తర్వాత try చేయండి."),
  errConfig: s("సర్వర్ సెట్టింగ్‌లో సమస్య ఉంది (API key).", "Server setup లో problem ఉంది (API key)."),
  errOffline: s("ఇంటర్నెట్ కనెక్షన్ లేదు. చెక్ చేసి మళ్ళీ ప్రయత్నించండి.", "Internet connection లేదు. Check చేసి మళ్ళీ try చేయండి."),
  errMicDenied: s(
    "మైక్ అనుమతి లేదు. బ్రౌజర్ సెట్టింగ్స్‌లో మైక్‌ను అనుమతించండి, లేదా టైప్ చేయండి.",
    "Mic permission లేదు. Browser settings లో mic allow చేయండి, లేదా type చేయండి.",
  ),
  errMicUnsupported: s("ఈ బ్రౌజర్‌లో మైక్ పనిచేయదు. దయచేసి టైప్ చేయండి.", "ఈ browser లో mic పని చేయదు. Type చేయండి please."),
  errNoSpeech: s("మీ మాట వినబడలేదు. మళ్ళీ ప్రయత్నించండి.", "మీ voice వినబడలేదు. మళ్ళీ try చేయండి."),
  errVoice: s("గొంతు వినిపించలేకపోయాను, కానీ జవాబు పైన ఉంది.", "Voice play అవ్వలేదు, కానీ answer పైన ఉంది."),
  you: s("మీరు", "మీరు"),
} satisfies Record<string, Pair>;

export type StringKey = keyof typeof STRINGS;

export function t(style: Style, key: StringKey): string {
  return STRINGS[key][style];
}

export type Topic = { emoji: string; title: Pair; color: string; items: Pair[] };

export const TOPICS: Topic[] = [
  {
    emoji: "📱",
    title: s("డిజిటల్ జీవితం", "Digital life"),
    color: "digital",
    items: [
      s("యూపీఐ అంటే ఏమిటి? సురక్షితంగా ఎలా వాడాలి?", "UPI అంటే ఏంటి? Safe గా ఎలా use చేయాలి?"),
      s("ఆన్‌లైన్ మోసాలను ఎలా గుర్తించాలి?", "Online scams ని ఎలా గుర్తించాలి?"),
      s("డిజీలాకర్ అంటే ఏమిటి?", "DigiLocker అంటే ఏంటి?"),
      s("వాట్సాప్‌లో వీడియో కాల్ ఎలా చేయాలి?", "WhatsApp లో video call ఎలా చేయాలి?"),
      s("ఏఐ (కృత్రిమ మేధ) అంటే ఏమిటి?", "AI అంటే ఏంటి? ChatGPT ఎలా పని చేస్తుంది?"),
    ],
  },
  {
    emoji: "😎",
    title: s("యువత భాష", "Gen Z భాష"),
    color: "genz",
    items: [
      s("\"డెలులు\" (delulu) అంటే ఏమిటి?", "\"Delulu\" అంటే ఏంటి?"),
      s("\"నో క్యాప్\" (no cap) అంటే?", "\"No cap\" అంటే ఏంటి?"),
      s("\"రిజ్\" (rizz) అంటే ఏమిటి?", "\"Rizz\" అంటే ఏంటి?"),
      s("పిల్లలు వాడే కొత్త పదాలు నేర్పించు", "Gen Z కొత్త slang words నేర్పించు"),
      s("రీల్స్ ట్రెండ్స్ ఎలా పుడతాయి?", "Reels trends ఎలా start అవుతాయి?"),
    ],
  },
  {
    emoji: "🗣️",
    title: s("కొత్త భాష నేర్చుకోండి", "కొత్త language నేర్చుకోండి"),
    color: "language",
    items: [
      s("ప్రయాణానికి అవసరమైన హిందీ నేర్పించు", "Travel కి కావాల్సిన basic Hindi నేర్పించు"),
      s("బెంగళూరులో మాట్లాడటానికి కన్నడ నేర్పించు", "Bengaluru కోసం basic Kannada నేర్పించు"),
      s("ఆఫీసులో మాట్లాడే ఇంగ్లీష్ నేర్పించు", "Office లో మాట్లాడే English నేర్పించు"),
      s("చెన్నైలో అవసరమైన తమిళం నేర్పించు", "Chennai కోసం basic Tamil నేర్పించు"),
    ],
  },
  {
    emoji: "📰",
    title: s("ఏం జరుగుతోంది?", "ఏం జరుగుతోంది?"),
    color: "news",
    items: [
      s("ఏఐ మన ఉద్యోగాలను ఎలా మారుస్తోంది?", "AI మన jobs ని ఎలా మారుస్తోంది?"),
      s("గిగ్ కార్మికులు అంటే ఎవరు? వాళ్ళ హక్కుల ఉద్యమం ఏమిటి?", "Gig workers అంటే ఎవరు? వాళ్ళ rights movement ఏంటి?"),
      s("వాతావరణ మార్పు మన తెలుగు రాష్ట్రాలపై ఎలా ప్రభావం చూపుతోంది?", "Climate change మన Telugu states ని ఎలా affect చేస్తోంది?"),
      s("ఎలక్ట్రిక్ వాహనాలు కొనడం మంచిదేనా?", "Electric vehicles కొనడం worth ఆ?"),
      s("ఇ-రూపాయి (డిజిటల్ రూపాయి) అంటే ఏమిటి?", "e-Rupee (digital rupee) అంటే ఏంటి?"),
    ],
  },
];
