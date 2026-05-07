import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'DM Serif Display'", "serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'DM Sans'", "sans-serif"]
      },
      colors: {
        void: "#050508",
        surface: "#0d0d14",
        raised: "#12121c",
        border: "#1e1e2e",
        muted: "#2a2a3e",
        dim: "#6b6b8a",
        ghost: "#9999b8",
        bright: "#e8e8f4",
        plasma: {
          DEFAULT: "#7c6ef4",
          dim: "#4a3fa8",
          glow: "#a89cf8"
        },
        signal: {
          green: "#3dfaac",
          amber: "#f4c84a",
          red: "#f4504a",
          blue: "#4ab4f4"
        }
      },
      boxShadow: {
        "plasma": "0 0 20px rgba(124, 110, 244, 0.3)",
        "plasma-lg": "0 0 40px rgba(124, 110, 244, 0.4)",
        "signal-green": "0 0 12px rgba(61, 250, 172, 0.4)",
        "signal-amber": "0 0 12px rgba(244, 200, 74, 0.4)",
        "signal-red": "0 0 12px rgba(244, 80, 74, 0.4)"
      },
      animation: {
        "pulse-plasma": "pulse-plasma 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "flow": "flow 3s linear infinite",
        "scan": "scan 2s linear infinite"
      },
      keyframes: {
        "pulse-plasma": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(124, 110, 244, 0.2)" },
          "50%": { boxShadow: "0 0 24px rgba(124, 110, 244, 0.6)" }
        },
        flow: {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" }
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" }
        }
      }
    }
  },
  plugins: []
}

export default config
