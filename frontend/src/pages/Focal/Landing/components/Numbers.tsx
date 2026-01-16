import { NumberTicker } from "@/components/ui/number-ticker";
import { HeartPulse, House, Timer, Users } from "lucide-react";

export function LandingNumbers() {
  const stats = [
    {
      icon: <House className="w-12 h-12 text-blue-500" />,
      title: "Connected Households",
      value: 125,
      description: "communities equipped with ResQWave terminals",
    },
    {
      icon: <Users className="w-12 h-12 text-yellow-500" />,
      title: "Individuals Covered",
      value: 500,
      description: "residents connected and protected",
    },
    {
      icon: <HeartPulse className="w-12 h-12 text-green-500" />,
      title: "Rescues Completed",
      value: 320,
      description: "successful rescues coordinated",
    },
    {
      icon: <Timer className="w-12 h-12 text-red-500" />,
      title: "Average Response Time",
      value: 5,
      description: "minutes from alert to official response",
    },
  ];

  return (
    <section id="impact" className="min-h-screen flex items-center px-8 md:px-16 lg:px-24 py-16">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          {/* Left Side - Text Content (40% width) */}
          <div className="space-y-6 lg:w-[45%]">
            <h2 className="text-4xl md:text-5xl font-bold">By the Numbers</h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Behind these numbers are real families, neighbors, and communities made safer through ResQWave,
              where reliable LoRa-powered terminals turn urgent signals into life-saving action.
            </p>
          </div>

          {/* Right Side - Stats Grid (50% width) */}
          <div className="grid grid-cols-1 pl-3 sm:grid-cols-2 gap-x-10 gap-y-10 lg:w-[55%]">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`bg-zinc-800/50 backdrop-blur-sm rounded-[5px] p-10 border border-zinc-700/50 hover:border-zinc-600/50 transition-all hover:transform hover:scale-105 ${
                  index < 2 ? 'sm:translate-x-20 lg:translate-x-24' : ''
                }`}
              >
                <div className="flex flex-col h-full">
                  {/* Icon */}
                  <div className="mb-4">{stat.icon}</div>
                  
                  {/* Title */}
                  <h3 className="text-white font-semibold mb-4 text-base">
                    {stat.title}
                  </h3>
                  
                  {/* Value */}
                  <div className="text-6xl font-bold text-white mb-4">
                    <NumberTicker value={stat.value} className="text-6xl font-bold text-white" />
                  </div>
                  
                  {/* Description */}
                  <p className="text-gray-400 text-base leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
