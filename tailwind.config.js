/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography";

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {},
  },
  plugins: [typography],
};
