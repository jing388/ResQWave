import { ChatbotConvo } from "@/pages/Focal/Landing/components/ChatbotConvo";
import { LandingHeader } from "@/pages/Focal/Landing/components/Header";
import { LandingHero } from "@/pages/Focal/Landing/components/Hero";
import { useEffect, useState } from "react";
import { LandingCTA } from "./components/CTA";
import { LandingFAQs } from "./components/FAQs";
import { LandingFooter } from "./components/Footer";
import { LandingGoal } from "./components/Goal";
import { LandingHowItWorks } from "./components/HowItWorks";
import { LandingNumbers } from "./components/Numbers";

export function Landing() {
  const [navOpen, setNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Apply background/fixed style after minimal scroll
          if (currentScrollY > 20) {
            setIsScrolled(true);
          } else {
            setIsScrolled(false);
          }
          
          // Hide/show logic - only when scrolled down significantly
          if (currentScrollY < 100) {
            // Always show near top
            setShowHeader(true);
          } else if (currentScrollY < lastScrollY - 5) {
            // Scrolling up (with small buffer to avoid jitter)
            setShowHeader(true);
          } else if (currentScrollY > lastScrollY + 5) {
            // Scrolling down (with small buffer to avoid jitter)
            setShowHeader(false);
          }
          
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className="min-h-screen text-white flex flex-col primary-background" style={{ position: 'relative', overflow: 'hidden', maxWidth: '100vw', width: '100%' }}>
      {/* Global Radial Gradient Backgrounds with animation */}
      <div
        className="global-radial-gradient"
        style={{
          right: '-8%',
          top: '90%',
          width: 'min(900px, 80vw)',
          height: 'min(900px, 80vw)',
          background: 'radial-gradient(circle, rgba(0, 65, 161, 0.1) 0%, rgba(0, 97, 255, 0.1) 50%, rgba(23, 23, 23, 0.1) 100%)',
        }}
      />
      <div
        className="global-radial-gradient"
        style={{
          left: '-11%',
          top: '-35%',
          width: 'min(950px, 85vw)',
          height: 'min(950px, 85vw)',
          background: 'radial-gradient(circle, rgba(0, 65, 161, 0.1) 0%, rgba(0, 97, 255, 0.1) 40%, rgba(23, 23, 23, 0.1) 100%)',
        }}
      />
      {/* Header */}
      <LandingHeader navOpen={navOpen} setNavOpen={setNavOpen} isScrolled={isScrolled} showHeader={showHeader} />
      {/* Hero Section */}
      <LandingHero />
      <LandingGoal />
      <LandingHowItWorks />
      <LandingNumbers />
      <LandingFAQs />
      <LandingCTA />
      <LandingFooter />
      {/* Floating Chatbot Widget */}
      <ChatbotConvo />
     
    </div>
  );
}