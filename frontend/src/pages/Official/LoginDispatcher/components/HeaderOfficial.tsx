import { useNavigate } from "react-router-dom";
import resqwave_logo from '/resqwave_logo.png';

export function HeaderOfficial() {
    const navigate = useNavigate();
    return (
         <header
            className="flex items-center justify-between px-10 md:px-20 py-6 border-b border-[#404040] relative"
            style={{
                background: 'rgba(24, 24, 27, 0.5)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                borderBottom: '1px solid #404040',
                zIndex: 10,
                minHeight: '85px',
                height: '85px',
            }}
        >
            <div className="flex items-center flex-shrink-0" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                <img src={resqwave_logo} alt="ResQWave Logo" className="h-auto w-9" />
                <span className="font-medium text-lg ml-4 text-white" style={{ fontSize: '1.125rem' }}>ResQWave</span>
            </div>
            {/* <div className="flex flex-1 items-center justify-end gap-11">
                {showButton && (
                    <button
                        className="text-gray-300 hover:text-white text-[16px] flex items-center gap-2 bg-transparent border-none cursor-pointer"
                        onClick={handleClick}
                    >
                        <span className="underline text-[#BABABA] hover:text-gray-300 text-[15px] flex items-center gap-2 bg-transparent border-none cursor-pointer">{buttonText}</span>
                    </button>
                )}
            </div> */}
        </header>
    );
}