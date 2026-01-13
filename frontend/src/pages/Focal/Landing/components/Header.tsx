import androidIcon from '@/assets/android.png';
import iosIcon from '@/assets/ios.png';
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import resqwave_logo from '/resqwave_logo.png';

export function LandingHeader({ navOpen, setNavOpen, isScrolled, showHeader }: { navOpen: boolean, setNavOpen: (open: boolean) => void, isScrolled: boolean, showHeader: boolean }) {
  

  return (
    <header
      className={`flex items-center justify-between px-8 md:px-16 py-5 w-full fixed top-0 left-0 right-0`}
      style={{
        background: isScrolled ? 'rgba(24, 24, 27, 0.5)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(16px) saturate(180%)' : 'none',
        WebkitBackdropFilter: isScrolled ? 'blur(10px) saturate(180%)' : 'none',
        zIndex: 9999,
        transform: showHeader ? 'scale(0.9) translateY(0)' : 'scale(0.9) translateY(-100%)',
        transformOrigin: 'top center',
        width: '111.11%',
        marginLeft: '-5.56%',
        marginRight: '-5.56%',
        transition: 'all 0.3s ease-in-out',
      }}
    >
      {/* Left side: logo and name */}
      <a href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
        <img src={resqwave_logo} alt="ResQWave Logo" className="h-auto w-7" />
        <span className="font-medium text-base ">ResQWave</span>
      </a>
      <div className="hidden md:block">
        <nav className="header-navs">
          <a href="#importance" className="importance-link font-semibold">
            Importance
            <span className="underline-effect" />
          </a>
          <a href="#how" className="importance-link font-semibold">
            How it works
            <span className="underline-effect" />
          </a>
          <a href="#impact" className="importance-link font-semibold">
            Impact
            <span className="underline-effect" />
          </a>
          <a href="#faqs" className="importance-link font-semibold">
            FAQs
            <span className="underline-effect" />
          </a>
        </nav>
      </div>
      {/* Desktop nav and button */}
      <div className="hidden md:flex  items-center justify-end gap-3">
        <Button className="bg-[#5B9EFF] hover:bg-[#4A8EEE] transition-colors duration-300 cursor-pointer text-white text-[13px] px-5 py-1.5 rounded-[5px] ml-1 font-medium flex items-center gap-1" onClick={() => {}}>
          Get the App
          <img src={androidIcon} alt="Android" className="h-5 w-5" />
          <img src={iosIcon} alt="iOS" className="h-5 w-5" />
        </Button>
        {/* <Button className="bg-gradient-to-t from-[#3B82F6] to-[#5898FF] hover:from-[#2563eb] hover:to-[#60a5fa] transition-colors
            duration-300 cursor-pointer text-white text-[14px] px-6 py-2 rounded ml-1 font-medium" onClick={() => navigate('/register-focal')}>
          Register
        </Button> */}
      </div>
      {/* Mobile hamburger */}
      <button
        className="md:hidden ml-auto p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Open navigation menu"
        onClick={() => setNavOpen(!navOpen)}
      >
        <Menu size={28} />
      </button>
      {/* Mobile nav menu */}
      {navOpen && (
        <div 
          className="absolute top-full left-0 w-full border-b border-gray-700 z-50 flex flex-col items-end px-4 py-4 gap-4 md:hidden animate-slideDownFadeIn"
          style={{
            background: 'rgba(24, 24, 27, 0.7)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(10px) saturate(180%)',
          }}
        >
          <nav className="flex flex-col gap-4 w-full cursor-pointer">
            <a href="#importance" className="hover:text-blue-400 transition w-full font-semibold" onClick={() => setNavOpen(false)}>Importance</a>
            <a href="#how" className="hover:text-blue-400 transition w-full font-semibold" onClick={() => setNavOpen(false)}>How it works</a>
            <a href="#impact" className="hover:text-blue-400 transition w-full font-semibold" onClick={() => setNavOpen(false)}>Impact</a>
            <a href="#faqs" className="hover:text-blue-400 transition w-full font-semibold" onClick={() => setNavOpen(false)}>FAQs</a>
          </nav>
          <Button className="bg-[#5B9EFF] hover:bg-[#4A8EEE] text-white px-6 py-3 rounded-[5px] w-full cursor-pointer flex items-center justify-center gap-3 text-base font-medium" onClick={() => { setNavOpen(false); }}>
            Get the App
            <img src={androidIcon} alt="Android" className="h-6 w-6" />
            <img src={iosIcon} alt="iOS" className="h-6 w-6" />
          </Button>
          {/* <Button className="from-[#3B82F6] to-[#70A6FF] hover:from-[#2563eb] hover:to-[#60a5fa] text-white px-6 py-2 rounded w-full cursor-pointer" onClick={() => { setNavOpen(false); navigate('/register-focal'); }}>
            Register
          </Button> */}
        </div>
      )}
    </header>
  );
}
