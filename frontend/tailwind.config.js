export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        "surface-dim": "#d9dadb",
        "surface": "#f8f9fa",
        "on-error-container": "#93000a",
        "tertiary-fixed-dim": "#4edea3",
        "error-container": "#ffdad6",
        "background": "#f8f9fa",
        "surface-container": "#edeeef",
        "tertiary": "#00180d",
        "surface-variant": "#e1e3e4",
        "tertiary-fixed": "#6ffbbe",
        "surface-container-highest": "#e1e3e4",
        "on-tertiary-fixed-variant": "#005236",
        "on-primary-fixed-variant": "#3d4756",
        "inverse-primary": "#bdc7d9",
        "secondary-fixed": "#d8e2ff",
        "tertiary-container": "#002f1e",
        "primary": "#0a1422",
        "on-secondary-fixed": "#001a42",
        "secondary-fixed-dim": "#adc6ff",
        "on-primary-container": "#8690a1",
        "on-surface-variant": "#44474c",
        "surface-bright": "#f8f9fa",
        "surface-container-low": "#f3f4f5",
        "on-primary": "#ffffff",
        "primary-container": "#1f2937",
        "on-error": "#ffffff",
        "on-tertiary-fixed": "#002113",
        "primary-fixed-dim": "#bdc7d9",
        "on-secondary-container": "#fefcff",
        "primary-fixed": "#d9e3f6",
        "surface-tint": "#555f6f",
        "on-primary-fixed": "#121c2a",
        "outline": "#75777c",
        "secondary-container": "#2170e4",
        "on-tertiary-container": "#00a371",
        "on-background": "#191c1d",
        "on-secondary-fixed-variant": "#004395",
        "inverse-surface": "#2e3132",
        "on-secondary": "#ffffff",
        "secondary": "#0058be",
        "surface-container-high": "#e7e8e9",
        "on-surface": "#191c1d",
        "on-tertiary": "#ffffff",
        "outline-variant": "#c5c6cc",
        "surface-container-lowest": "#ffffff",
        "inverse-on-surface": "#f0f1f2",
        "error": "#ba1a1a"
      },
      borderRadius: {
        "full": "9999px"
      },
      spacing: {
        "gutter": "24px",
        "margin-desktop": "32px",
        "section-gap": "48px",
        "margin-mobile": "16px",
        "base": "8px",
        "container-max": "1280px"
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        "headline-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "display-lg": ["Inter", "sans-serif"],
        "headline-sm": ["Inter", "sans-serif"],
        "headline-lg": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"]
      },
      fontSize: {
        "headline-md": ["22px", {"lineHeight": "28px", "fontWeight": "600"}],
        "label-sm": ["11px", {"lineHeight": "14px", "fontWeight": "600"}],
        "display-lg": ["36px", {"lineHeight": "44px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "headline-sm": ["18px", {"lineHeight": "24px", "fontWeight": "600"}],
        "headline-lg": ["28px", {"lineHeight": "36px", "letterSpacing": "-0.01em", "fontWeight": "600"}],
        "body-lg": ["16px", {"lineHeight": "26px", "fontWeight": "400"}],
        "body-md": ["14px", {"lineHeight": "22px", "fontWeight": "400"}],
        "label-md": ["12px", {"lineHeight": "16px", "letterSpacing": "0.01em", "fontWeight": "500"}]
      }
    }
  },
  plugins: []
};

