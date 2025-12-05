import { useState } from "react";
import { LandingHeader } from "@/pages/Focal/Landing/components/Header";
import { LandingHero } from "@/pages/Focal/Landing/components/Hero";
import { ChatbotConvo } from "@/pages/Focal/Landing/components/ChatbotConvo";

export function Landing() {
  const [navOpen, setNavOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  return (
    <div className="min-h-screen text-white flex flex-col primary-background" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Global Radial Gradient Backgrounds with animation */}
      <div
        className="global-radial-gradient"
        style={{
          right: '-8%',
          top: '90%',
          width: '900px',
          height: '900px',
          background: 'radial-gradient(circle, rgba(0, 65, 161, 0.1) 0%, rgba(0, 97, 255, 0.1) 50%, rgba(23, 23, 23, 0.1) 100%)',
        }}
      />
      <div
        className="global-radial-gradient"
        style={{
          left: '-11%',
          top: '-35%',
          width: '950px',
          height: '950px',
          background: 'radial-gradient(circle, rgba(0, 65, 161, 0.1) 0%, rgba(0, 97, 255, 0.1) 40%, rgba(23, 23, 23, 0.1) 100%)',
        }}
      />
      {/* Header */}
      <LandingHeader navOpen={navOpen} setNavOpen={setNavOpen} />
      {/* Hero Section */}
      <LandingHero showSearch={showSearch} setShowSearch={setShowSearch} />
      {/* Floating Chatbot Widget */}
      <ChatbotConvo />
    </div>
  );
}