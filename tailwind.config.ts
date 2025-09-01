module.exports = {
    theme: {
        extend: {
            keyframes: {
                blink: {
                    '0%, 100%': { opacity: '0' },
                    '50%': { opacity: '1' },
                }
            },
            animation: {
                blink: 'blink 1s steps(1, end) infinite',
            }
        },
    },
    plugins: [],
}