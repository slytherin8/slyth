/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all of your component files.
    content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: '#0066FF',
                secondary: '#6C63FF',
                success: '#28A745',
                danger: '#DC3545',
                warning: '#FFC107',
            }
        },
    },
    plugins: [],
}
