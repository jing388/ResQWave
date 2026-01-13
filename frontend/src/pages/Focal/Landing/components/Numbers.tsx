import { HeartPulse, House, Timer, Users } from "lucide-react";

export function LandingNumbers() {
  const stats = [
    {
      icon: <House className="w-8 h-8 text-blue-500" />,
      title: "Connected Households",
      value: "125",
      description: "communities equipped with ResQWave terminals",
    },
    {
      icon: <Users className="w-8 h-8 text-yellow-500" />,
      title: "Individuals Covered",
      value: "500",
      description: "residents connected and protected",
    },
    {
      icon: <HeartPulse className="w-8 h-8 text-green-500" />,
      title: "Rescues Completed",
      value: "320",
      description: "successful rescues coordinated",
    },
    {
      icon: <Timer className="w-8 h-8 text-red-500" />,
      title: "Average Response Time",
      value: "5",
      description: "minutes from alert to official response",
    },
  ];

  return (
    <section id="impact" className="min-h-screen flex items-center px-8 md:px-16 lg:px-24 py-16">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
          {/* Left Side - Text Content (40% width) */}
          <div className="space-y-6 lg:w-[40%]">
            <h2 className="text-4xl md:text-5xl font-bold">By the Numbers</h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Behind these numbers are real families, neighbors, and communities made safer through ResQWave,
              where reliable LoRa-powered terminals turn urgent signals into life-saving action.
            </p>
          </div>

          {/* Right Side - Stats Grid (50% width) */}
          <div className="grid grid-cols-1 pl-3 sm:grid-cols-2 gap-x-8 gap-y-6 lg:w-[40%]">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`bg-zinc-800/50 backdrop-blur-sm rounded-[5px] p-6 border border-zinc-700/50 hover:border-zinc-600/50 transition-all hover:transform hover:scale-105 ${
                  index < 2 ? 'sm:translate-x-20 lg:translate-x-24' : ''
                }`}
              >
                <div className="flex flex-col h-full">
                  {/* Icon */}
                  <div className="mb-4">{stat.icon}</div>
                  
                  {/* Title */}
                  <h3 className="text-white font-semibold mb-3 text-sm">
                    {stat.title}
                  </h3>
                  
                  {/* Value */}
                  <div className="text-5xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  
                  {/* Description */}
                  <p className="text-gray-400 text-sm leading-relaxed">
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
