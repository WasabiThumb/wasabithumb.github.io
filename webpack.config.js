const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules|static|dist|private/
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                "static/index.html",
                "static/.key.private",
                { from: "static/assets", to: path.resolve(__dirname, 'dist', 'assets') }
            ]
        })
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    }
}