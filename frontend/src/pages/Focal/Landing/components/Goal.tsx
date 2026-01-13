import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Info } from "lucide-react";
import { useEffect, useRef } from "react";

const cloudName = import.meta.env.VITE_CLOUDINARY_NAME;

// Optimized video URL with quality and format settings
const videoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/w_1920,h_1080,c_fill,q_auto:low,f_auto,vc_auto/AdobeStock_428035875_1_hc8qmd.mp4`;

gsap.registerPlugin(ScrollTrigger);

export function LandingGoal() {
    const introWrapperRef = useRef<HTMLDivElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const rafId = useRef<number | null>(null);

    useEffect(() => {
        if (!introWrapperRef.current || !videoContainerRef.current) return;

        // Refresh ScrollTrigger before creating pin
        ScrollTrigger.refresh();

        // Pin the video section when scrolling through the goal section
        const pinTrigger = ScrollTrigger.create({
            trigger: introWrapperRef.current,
            start: "top top",
            end: "bottom bottom",
            pin: videoContainerRef.current,
            pinSpacing: false,
            pinReparent: false,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: 1,
            markers: false
        });

        // Use requestAnimationFrame for smoother scroll handling
        const handleScroll = () => {
            if (rafId.current !== null) {
                cancelAnimationFrame(rafId.current);
            }

            rafId.current = requestAnimationFrame(() => {
                const wrapper = introWrapperRef.current;
                if (!wrapper) return;

                const wrapperOffset = wrapper.offsetTop;
                const scrollPosition = window.scrollY - wrapperOffset;
                const windowHeight = window.innerHeight;
                
                const sections = wrapper.querySelectorAll('.tabs_let-content');
                const lastSectionIndex = sections.length - 1;

                // Only apply logic when wrapper is in view
                if (scrollPosition >= 0 && scrollPosition < wrapper.offsetHeight) {
                    sections.forEach((section, index) => {
                        const sectionStart = index * windowHeight;
                        const sectionEnd = (index + 1) * windowHeight;
                        
                        if (scrollPosition >= sectionStart && scrollPosition < sectionEnd) {
                            section.classList.add('is-1');
                        } else {
                            if (index !== lastSectionIndex) {
                                section.classList.remove('is-1');
                            }
                        }
                    });

                    // Keep is-1 class on the last section
                    if (scrollPosition >= lastSectionIndex * windowHeight) {
                        sections[lastSectionIndex]?.classList.add('is-1');
                    }
                }
            });
        };

        // Use passive listener for better scroll performance
        document.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial call

        return () => {
            document.removeEventListener('scroll', handleScroll);
            if (rafId.current !== null) {
                cancelAnimationFrame(rafId.current);
            }
            pinTrigger.kill();
        };
    }, []);


    return (
        <div id="importance" ref={introWrapperRef} className="relative w-full min-h-[300vh]">
            {/* Pinned Background Video */}
            <div ref={videoContainerRef} className="absolute top-0 left-0 w-full h-screen">
                <video
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                >
                    <source src={videoUrl} type="video/mp4" />
                </video>
                {/* Fade overlay on the right side */}
                <div className="absolute top-0 right-0 w-full lg:w-[90vw] h-full bg-gradient-to-l from-black to-transparent pointer-events-none"></div>
            </div>
            
            {/* Scrollable Content */}
            <div className="absolute top-0 left-0 right-0 mx-auto w-full lg:w-[50vw] lg:left-auto lg:right-0 lg:mx-0 min-h-full z-10">
                <div className="max-w-xl mx-auto lg:ml-[-10px] px-8 lg:pl-12 pt-24">
                    {/* Section 1: Why ResQWave Matters */}
                    <div className="tabs_let-content min-h-screen flex items-center opacity-30 transition-opacity duration-500">
                        <div>
                            <div className="flex gap-3 mb-6">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-[5px] border border-zinc-700/50 transition-all duration-300 hover:bg-zinc-800/70 hover:border-zinc-600/70 hover:scale-105 cursor-pointer">
                                    <Info className="w-4 h-4 text-zinc-300" />
                                    <span className="text-sm text-zinc-300">Why ResQWave Matters</span>
                                </div>
                            </div>
                            
                            <h5
                                className="text-[20px] md:text-[24px] lg:text-[28px] font-bold mb-6 leading-tight"
                                style={{
                                    background: "linear-gradient(180deg, #FFFFFF 0%, #BFBFBF 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                    color: "transparent"
                                }}
                            >
                                When disasters strike in the Philippines, communication often fails first.
                            </h5>
                            
                            <p className="text-[16px] md:text-[18px] text-gray-300 leading-relaxed">
                                Power outages, downed cell towers, and lack of internet leave communities cut off, making it harder for families to call for help and for officials to know who needs urgent rescue. In many cases, delays in communication cost lives.
                            </p>
                        </div>
                    </div>

                    {/* Section 2: Meralco Power Outages */}
                    <div className="tabs_let-content min-h-screen flex items-center opacity-30 transition-opacity duration-500">
                        <div>
                            <h5
                                className="text-[20px] md:text-[24px] lg:text-[28px] font-bold mb-6 leading-tight"
                                style={{
                                    background: "linear-gradient(180deg, #FFFFFF 0%, #BFBFBF 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                    color: "transparent"
                                }}
                            >
                                Meralco Power Outages During Monsoon Floods Leave Thousands Disconnected
                            </h5>
                            
                            <p className="text-[16px] md:text-[18px] text-gray-300 leading-relaxed mb-4">
                                When monsoon rains hit in July 2025, over 167,000 households across Metro Manila and nearby provinces lost power. Floodwaters delayed repairs, leaving families unable to charge phones or reach rescuers when they needed help most.
                            </p>
                            
                            <p className="text-[14px] md:text-[16px] text-gray-400 italic">
                                Joann Villanueva on "'Habagat' rains cause power outages, affect 167K Meralco customers"
                            </p>
                        </div>
                    </div>

                    {/* Section 3: Our Mission */}
                    <div className="tabs_let-content min-h-screen flex items-center opacity-30 transition-opacity duration-500">
                        <div>
                            <div className="flex gap-3 mb-6">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-[5px] border border-zinc-700/50 transition-all duration-300 hover:bg-zinc-800/70 hover:border-zinc-600/70 hover:scale-105 cursor-pointer">
                                    <Info className="w-4 h-4 text-zinc-300" />
                                    <span className="text-sm text-zinc-300">Our Mission</span>
                                </div>
                            </div>
                            
                            <h5
                                className="text-[20px] md:text-[24px] lg:text-[28px] font-bold mb-6 leading-tight"
                                style={{
                                    background: "linear-gradient(180deg, #FFFFFF 0%, #BFBFBF 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                    color: "transparent"
                                }}
                            >
                                ResQWave is on a mission to bridge the communication divide in disasters.
                            </h5>
                            
                            <p className="text-[16px] md:text-[18px] text-gray-300 leading-relaxed">
                                Empowered by LoRa-powered community terminals, ResQWave ensures that even in the darkest moments—without cell service or the internet—communities can send instant, reliable alerts through trusted focal persons. Every SOS reaches responders quickly, every signal is clear, and every life gets a lifeline.
                            </p>
                            <div className="h-50"></div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .tabs_let-content {
                    transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                    will-change: opacity;
                }
                .tabs_let-content.is-1 {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    )
}
