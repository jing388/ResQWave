import { useNavigate } from "react-router-dom";
import resqwave_logo from "/resqwave_logo.png";

export function HeaderOfficial() {
  const navigate = useNavigate();
  return (
    <header
      className="flex items-center justify-between px-10 md:px-20 py-6 border-b border-[#404040] relative"
      style={{
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(10px) saturate(180%)",
        borderBottom: "1px solid #404040",
        zIndex: 10,
        minHeight: "85px",
        height: "85px",
      }}
    >
      <div
        className="flex items-center shrink-0"
        onClick={() => navigate("/")}
        style={{ cursor: "pointer" }}
      >
        <img src={resqwave_logo} alt="ResQWave Logo" className="h-auto w-8" />
        <span
          className="font-medium text-lg ml-4 text-white"
          style={{ fontSize: "1.125rem" }}
        >
          ResQWave
        </span>
      </div>
    </header>
  );
}
