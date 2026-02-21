import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'Playfair Display Fallback', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        navy: {
          DEFAULT: "hsl(var(--navy))",
          light: "hsl(var(--navy-light))",
          medium: "hsl(var(--navy-medium))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          dark: "hsl(var(--gold-dark))",
          light: "hsl(var(--gold-light))",
          foreground: "hsl(var(--gold-foreground))",
        },
        cream: "hsl(var(--cream))",
        slate: {
          DEFAULT: "hsl(var(--slate))",
          light: "hsl(var(--slate-light))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "glow-pulse": {
          "0%, 100%": { filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.4))" },
          "50%": { filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.7))" },
        },
        "confetti-fall": {
          "0%": { 
            transform: "translateY(0) rotate(0deg)",
            opacity: "1"
          },
          "100%": { 
            transform: "translateY(100vh) rotate(720deg)",
            opacity: "0"
          },
        },
        "sparkle-burst": {
          "0%": { 
            transform: "scale(0) rotate(0deg)",
            opacity: "1"
          },
          "50%": { 
            transform: "scale(1.5) rotate(180deg)",
            opacity: "0.8"
          },
          "100%": { 
            transform: "scale(0) rotate(360deg)",
            opacity: "0"
          },
        },
        "success-bounce": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
        },
        "badge-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "badge-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 8px hsl(var(--primary) / 0.3), inset 0 0 8px hsl(var(--primary) / 0.1)" 
          },
          "50%": { 
            boxShadow: "0 0 16px hsl(var(--primary) / 0.5), inset 0 0 12px hsl(var(--primary) / 0.2)" 
          },
        },
        "cinematic-zoom": {
          "0%": { 
            transform: "scale(1.0) translateX(0%)",
          },
          "50%": { 
            transform: "scale(1.15) translateX(-2%)",
          },
          "100%": { 
            transform: "scale(1.0) translateX(0%)",
          },
        },
        "text-glow": {
          "0%, 100%": { 
            textShadow: "0 0 4px hsl(var(--primary) / 0.3), 0 0 8px hsl(var(--primary) / 0.15)" 
          },
          "50%": { 
            textShadow: "0 0 8px hsl(var(--primary) / 0.5), 0 0 16px hsl(var(--primary) / 0.25)" 
          },
        },
        "shimmer-sweep": {
          "0%": { transform: "translateX(-100%) skewX(-12deg)" },
          "100%": { transform: "translateX(200%) skewX(-12deg)" },
        },
        "menu-slide-down": {
          "0%": { 
            opacity: "0",
            transform: "translateY(-10px) scaleY(0.95)",
          },
          "100%": { 
            opacity: "1",
            transform: "translateY(0) scaleY(1)",
          },
        },
        "menu-item-slide": {
          "0%": { 
            opacity: "0",
            transform: "translateX(-20px)",
          },
          "100%": { 
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "overlay-pulse": {
          "0%, 100%": { 
            opacity: "0.9",
          },
          "50%": { 
            opacity: "1",
          },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "confetti-fall": "confetti-fall 3s ease-out forwards",
        "sparkle-burst": "sparkle-burst 0.8s ease-out forwards",
        "success-bounce": "success-bounce 0.5s ease-in-out",
        "badge-shimmer": "badge-shimmer 3s ease-in-out infinite",
        "badge-glow": "badge-glow 2.5s ease-in-out infinite",
        "cinematic-zoom": "cinematic-zoom 25s ease-in-out infinite",
        "text-glow": "text-glow 3s ease-in-out infinite",
        "shimmer-sweep": "shimmer-sweep 1.5s ease-in-out infinite",
        "menu-slide-down": "menu-slide-down 0.3s ease-out forwards",
        "menu-item-slide": "menu-item-slide 0.3s ease-out forwards",
        "overlay-pulse": "overlay-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
