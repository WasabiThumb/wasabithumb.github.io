const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const version = require("./buildSrc/versioning");


module.exports = (async () => {
    const vd = await version();
    return {
        entry: './src/index.ts',
        mode: vd.mode,
        devtool: vd.devtool,
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
            }),
            new webpack.BannerPlugin({
                banner: `Portfolio v. ${vd.version}\nWith <3 By Wasabi`
            })
        ],
        resolve: {
            extensions: ['.tsx', '.ts', '.js']
        },
        output: {
            filename: 'bundle.js',
            path: path.resolve(__dirname, 'dist')
        }
    };
});
