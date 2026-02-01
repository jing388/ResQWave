import { useNavigate } from "react-router-dom";
import resqwave_logo from "/resqwave_logo.png";

export function HeaderOfficial() {
  const navigate = useNavigate();
  return (
    <header
      className="flex items-center justify-between px-6 sm:px-10 md:px-20 py-4 sm:py-6 border-b border-[#404040] relative backdrop-blur-xl backdrop-saturate-[180%] z-10 min-h-[70px] h-[70px] sm:min-h-[85px] sm:h-[85px]"
    >
      <div
        className="flex items-center shrink-0 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <img src={resqwave_logo} alt="ResQWave Logo" className="h-auto w-6 sm:w-8" />
        <span
          className="font-medium text-base sm:text-lg ml-3 sm:ml-4 text-white"
        >
          ResQWave
        </span>
      </div>
    </header>
  );
}
