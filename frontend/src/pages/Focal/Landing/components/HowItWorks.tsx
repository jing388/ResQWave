import { Waypoints } from "lucide-react";

export function LandingHowItWorks() {
  return (
    <section id="how" className="w-full px-4 md:px-8 lg:px-12 xl:px-16 py-20 relative flex items-center" style={{ zIndex: 20, minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto w-full">
        {/* Features Badge */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-[5px] border border-zinc-700/50 transition-all duration-300 hover:bg-zinc-800/70 hover:border-zinc-600/70 hover:scale-105 cursor-pointer">
            <Waypoints className="w-4 h-4 text-zinc-300" />
            <span className="text-sm text-zinc-300">Features</span>
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-30">
          How does ResQWave works?
        </h2>

        {/* Three Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3">
          {/* Step 01 */}
          <div className="flex flex-col p-6 border-l border-b border-white border-dotted transition-all hover:bg-blue-900/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-white text-black font-bold text-lg px-4 py-2 rounded-[5px] flex-shrink-0">
                01
              </div>
              <h3 className="text-xl font-semibold pt-2">Community Terminal Setup</h3>
            </div>
            <p className="text-gray-400 leading-relaxed mt-5">
              A LoRa-powered terminal is placed in each community and managed by a focal person responsible for sending alerts.
            </p>
          </div>

          {/* Step 02 */}
          <div className="flex flex-col p-6 border-l border-b border-white border-dotted transition-all hover:bg-blue-900/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-white text-black font-bold text-lg px-4 py-2 rounded-[5px] flex-shrink-0">
                02
              </div>
              <h3 className="text-xl font-semibold pt-2">Sending Emergency Alerts</h3>
            </div>
            <p className="text-gray-400 leading-relaxed mt-5">
              In times of flood or disaster, the focal person can send quick SOS signals or let the terminal's flood sensor trigger automatic alerts.
            </p>
          </div>

          {/* Step 03 */}
          <div className="flex flex-col p-6 border-l border-b border-white border-dotted transition-all hover:bg-blue-900/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-white text-black font-bold text-lg px-4 py-2 rounded-[5px] flex-shrink-0">
                03
              </div>
              <h3 className="text-xl font-semibold pt-2">Alerts Reach Officials</h3>
            </div>
            <p className="text-gray-400 leading-relaxed mt-5">
              The SOS and flood data are transmitted via the LoRa network and received in real-time by local officials, enabling faster response.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
