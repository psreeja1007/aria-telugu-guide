import type { Metadata } from "next";
import Link from "next/link";
import { AriaAvatar } from "@/components/AriaAvatar";

export const metadata: Metadata = {
  title: "ఆరియా గురించి · About Aria",
};

export default function About() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1 font-semibold underline">
        ← ఆరియా దగ్గరికి వెళ్ళండి
      </Link>

      <div className="mt-6 flex items-center gap-4">
        <AriaAvatar size={64} />
        <div>
          <h1 className="text-3xl font-bold">ఆరియా గురించి</h1>
          <p className="text-muted">About Aria</p>
        </div>
      </div>

      <section className="mt-6 space-y-4 text-lg">
        <p>
          ఆరియా తెలుగు వాళ్ళ కోసం తయారైన ఒక స్నేహపూర్వక AI గైడ్. UPI, ఆన్‌లైన్ మోసాలు, Gen Z భాష, కొత్త భాషలు, దేశంలో ఏం
          జరుగుతోంది... ఏ విషయమైనా సులభమైన తెలుగులో, గట్టిగా చదివి వినిపిస్తూ వివరిస్తుంది. టైప్ చేయవచ్చు, లేదా మైక్ నొక్కి
          మాట్లాడవచ్చు.
        </p>
        <p className="text-base text-muted">
          Aria is a friendly AI guide for Telugu speakers. Ask about anything, by typing or speaking, and she explains it in
          simple Telugu, in pure Telugu or Telugu mixed with English, whichever you choose.
        </p>

        <h2 className="pt-2 text-xl font-bold">ఆరియా ఎలా పని చేస్తుంది?</h2>
        <ul className="list-disc space-y-1 ps-6">
          <li>మీ మాటను అర్థం చేసుకోవడం: Sarvam Saaras (speech to text)</li>
          <li>జవాబు ఆలోచించడం: Sarvam 105B (conversations)</li>
          <li>గట్టిగా చదివి వినిపించడం: Sarvam Bulbul (text to speech)</li>
        </ul>

        <h2 className="pt-2 text-xl font-bold">ముఖ్యమైన జాగ్రత్తలు</h2>
        <ul className="list-disc space-y-1 ps-6">
          <li>ఆరియా ఒక AI. కొన్నిసార్లు తప్పులు చేయవచ్చు. తాజా వార్తలు తనకి తెలియకపోవచ్చు.</li>
          <li>డబ్బు, ఆరోగ్యం, చట్టం విషయాల్లో నిపుణులను సంప్రదించండి.</li>
          <li>
            మీ UPI PIN, OTP, బ్యాంక్ వివరాలు, ఆధార్ నంబర్ ఎవరికీ చెప్పకండి, ఆరియాకి కూడా.
          </li>
          <li>
            సైబర్ మోసం జరిగితే: <strong>1930</strong> కి కాల్ చేయండి లేదా <strong>cybercrime.gov.in</strong> లో ఫిర్యాదు
            చేయండి. అత్యవసరమైతే <strong>112</strong>.
          </li>
          <li>మీ సంభాషణలను ఆరియా దాచుకోదు. ఈ బ్రౌజర్ ట్యాబ్ మూసేస్తే సంభాషణ పోతుంది.</li>
        </ul>
      </section>
    </main>
  );
}
