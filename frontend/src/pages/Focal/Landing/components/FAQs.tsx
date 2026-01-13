import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SquareLibrary } from "lucide-react";

export function LandingFAQs() {
  const faqs = [
    {
      question: "What is ResQWave?",
      answer:
        "ResQWave is an emergency communication system designed to keep communities connected during disasters. It enables reliable alerts and coordination even when traditional networks fail. The system focuses on safety, speed, and resilience.",
    },
    {
      question: "Who uses the ResQWave terminal?",
      answer:
        "ResQWave terminals are used by Focal Persons (community leaders) assigned by the barangay. They are responsible for initiating alerts and coordinating communication during emergencies. The system is designed to support quick and informed decision-making.",
    },
    {
      question: "How does ResQWave work without internet or mobile signal?",
      answer:
        "ResQWave operates using long-range radio signal technology instead of the internet or cellular networks. This allows communication to continue during power outages or network failures. Messages are transmitted directly between terminals.",
    },
    {
      question: "What kind of alerts can it send?",
      answer:
        "ResQWave can send user-initiated alerts and critical emergency alerts. User-initiated alerts are triggered when the terminal button is pressed to request immediate rescue. Critical alerts are automatically sent when the system detects that flood levels have reached a dangerous threshold.",
    },
    {
      question: "Who receives the alerts?",
      answer:
        "Alerts are received by barangay officials and designated responders within the network. This ensures that emergency information reaches authorized personnel first. It supports organized and controlled communication during incidents.",
    },
    {
      question: "How many communities can ResQWave connect?",
      answer:
        "For this thesis implementation, ResQWave connects communities within Barangay 175. For future scaling, the system can connect communities within the gateway’s coverage range of up to 15 kilometers for outdoor deployment. This allows expansion to multiple barangays or districts.",
    },
    {
      question: "Why is ResQWave important?",
      answer:
        "ResQWave ensures communication remains available when it is needed most. It reduces confusion, delays, and isolation during emergencies. Ultimately, it helps protect lives and strengthen community resilience.",
    },
  ];

  return (
    <section id="faqs" className="w-full py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-[5px] border border-zinc-700/50 transition-all duration-300 hover:bg-zinc-800/70 hover:border-zinc-600/70 hover:scale-105 cursor-pointer">
            <SquareLibrary className="w-4 h-4 text-zinc-300" />
            <span className="text-sm text-zinc-300">FAQS</span>
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Frequently Asked Questions
        </h2>

        {/* Accordion */}
        <style>{`
          .faq-accordion [data-state="open"] {
            will-change: height;
          }
          .faq-accordion [data-state="closed"] {
            will-change: height;
          }
          .faq-accordion .accordion-content-wrapper {
            transform: translateZ(0);
            backface-visibility: hidden;
          }
        `}</style>
        <Accordion type="single" collapsible className="w-full space-y-0 faq-accordion">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border-b border-white/20"
            >
              <AccordionTrigger className="text-white hover:no-underline text-base py-5 will-change-transform">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-gray-400 text-sm leading-relaxed accordion-content-wrapper">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}