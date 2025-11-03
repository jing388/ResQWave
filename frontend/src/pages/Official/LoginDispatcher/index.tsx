import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { CircleAlert, Eye, EyeOff } from "lucide-react"
import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { HeaderOfficial } from "./components/HeaderOfficial"

export function LoginOfficial() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [ID, setID] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const success = await login(ID, password)

      if (success) {
        setIsLoading(false)
        // Both admin and dispatcher need 2FA - go to verification
        navigate("/verification-official")
      } else {
        setError("Invalid credentials. Please check your ID and password.")
        setIsLoading(false)
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      setError(err?.message || "An error occurred during login. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col primary-background" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="loginfocal-radial-gradient" />
      <HeaderOfficial />
      <main
        className="flex flex-1 flex-col items-center w-full px-10 sm:px-0"
        style={{ marginTop: '120px', zIndex: 20, position: 'relative' }}
      >
        <div
          className="flex flex-col items-center gap-4 mb-8"
          style={{
            width: '100%',
            maxWidth: window.innerWidth <= 480 ? '95vw' : '460px',
            minWidth: window.innerWidth <= 480 ? '0' : undefined,
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: window.innerWidth <= 480 ? '5vw' : 0,
            paddingRight: window.innerWidth <= 480 ? '5vw' : 0,
            boxSizing: 'border-box',
            ...(window.innerWidth <= 480
              ? { marginBottom: '1.5rem' }
              : {}),
          }}
        >
          <h1
            className="text-[43px] font-semibold text-white mb-1"
            style={window.innerWidth <= 480 ? { fontSize: '1.45rem' } : {}}
          >
            Sign in
          </h1>
          <p
            className="text-[#BABABA] text-center text-base mb-2 leading-relaxed"
            style={window.innerWidth <= 480 ? { fontSize: '0.82rem' } : {}}
          >
            Log in using your account credentials.<br />
            <span className="font-semibold mt-1 block">For dispatcher and admin use only.</span>
          </p>
        </div>

        {/* Error Alert UI - styled like focal login */}
        {error && (
          <div
            className="flex items-center gap-3 bg-[#291415] border border-[#F92626] text-red-200 rounded-md px-3 py-3 mb-4 animate-in fade-in w-full mx-auto"
            style={{
              maxWidth: window.innerWidth <= 480 ? '95vw' : '490px',
              minWidth: window.innerWidth <= 480 ? '0' : undefined,
              width: '100%',
              boxSizing: 'border-box',
              fontSize: window.innerWidth <= 480 ? '0.78rem' : undefined,
              paddingLeft: window.innerWidth <= 480 ? '5vw' : '1rem',
              paddingRight: window.innerWidth <= 480 ? '5vw' : '1rem',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <CircleAlert className="text-[#F92626]" size={window.innerWidth <= 480 ? 15 : 22} />
            <div>
              <span className="font-bold text-[#F92626]" style={window.innerWidth <= 480 ? { fontSize: '0.85rem' } : {}}>{error.includes("credentials") ? "Wrong credentials" : "Login failed"}</span><br />
              <span className="text-[#F92626] text-[13px]" style={window.innerWidth <= 480 ? { fontSize: '0.75rem' } : {}}>{error}</span>
            </div>
          </div>
        )}

        <form
          className="flex flex-col gap-3 w-full mx-auto"
          style={{
            maxWidth: window.innerWidth <= 480 ? '95vw' : '490px',
            minWidth: window.innerWidth <= 480 ? '0' : undefined,
            width: '100%',
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: window.innerWidth <= 480 ? '5vw' : 0,
            paddingRight: window.innerWidth <= 480 ? '5vw' : 0,
            boxSizing: 'border-box',
          }}
          onSubmit={handleSubmit}
        >
          <label
            className="block text-white text-[15px] font-light"
            style={window.innerWidth <= 480 ? { fontSize: '0.85rem' } : {}}
          >
            Email
          </label>
          <Input
            type="text"
            value={ID}
            onChange={e => {
              setID(e.target.value)
              if (error) setError("")
            }}
            aria-invalid={!!error}
            className="bg-[#171717] border border-[#404040] mb-1 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            style={{
              fontSize: window.innerWidth <= 480 ? '13px' : '16px',
              height: window.innerWidth <= 480 ? '38px' : '55px',
              width: window.innerWidth <= 480 ? '100%' : '100%',
              maxWidth: window.innerWidth <= 480 ? '260px' : undefined,
              marginLeft: window.innerWidth <= 480 ? 'auto' : undefined,
              marginRight: window.innerWidth <= 480 ? 'auto' : undefined,
              display: 'block',
            }}
          />

          <div className="mb-2">
            <label
              className="block text-white text-[15px] font-light mb-2"
              style={window.innerWidth <= 480 ? { fontSize: '0.85rem', marginBottom: '0.4rem' } : {}}
            >
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  if (error) setError("")
                }}
                aria-invalid={!!error}
                className="bg-[#171717] border border-[#404040] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                style={{
                  fontSize: window.innerWidth <= 480 ? '13px' : '16px',
                  height: window.innerWidth <= 480 ? '38px' : '55px',
                  width: '100%',
                  maxWidth: window.innerWidth <= 480 ? '260px' : undefined,
                  marginLeft: window.innerWidth <= 480 ? 'auto' : undefined,
                  marginRight: window.innerWidth <= 480 ? 'auto' : undefined,
                  display: 'block',
                }}
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={0}
                role="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{ zIndex: 2 }}
              >
                {showPassword ? <EyeOff size={window.innerWidth <= 480 ? 15 : 22} /> : <Eye size={window.innerWidth <= 480 ? 15 : 22} />}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="text-white py-6 rounded-md font-medium text-base flex items-center justify-center gap-2
             bg-gradient-to-t from-[#3B82F6] to-[#70A6FF] 
             hover:from-[#2C64C5] hover:to-[#2C64C5]
             transition duration-300 cursor-pointer mt-1"
            style={{
              opacity: isLoading ? 0.7 : 1,
              width: '100%',
              fontSize: window.innerWidth <= 480 ? '0.95rem' : undefined,
              paddingTop: window.innerWidth <= 480 ? '0.7rem' : undefined,
              paddingBottom: window.innerWidth <= 480 ? '0.7rem' : undefined,
            }}
          >
            {isLoading && (
              <span className="inline-block mr-2">
                <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </span>
            )}
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="text-center mt-4">
          <button
            className="text-[#A3A3A3] hover:text-[#929090] mt-2 text-md bg-transparent border-none cursor-pointer"
            onClick={() => navigate('/forgot-password-dispatcher')}
            style={window.innerWidth <= 480 ? { fontSize: '0.97rem' } : {}}
          >
            Forgot Password?
          </button>
        </div>
      </main>
    </div>
  )
}