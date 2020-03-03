const webpack                    = require('webpack');
const LiveReloadPlugin           = require('webpack-livereload-plugin');
const webpackDashboard           = require('webpack-dashboard/plugin');
const path                       = require('path');
const isDevelopment              = process.env.NODE_ENV === 'development';
const MiniCssExtractPlugin       = require('mini-css-extract-plugin');
const {CleanWebpackPlugin}       = require('clean-webpack-plugin');
const CopyPlugin                 = require('copy-webpack-plugin');
const MergeJsonWebpackPlugin     = require('merge-jsons-webpack-plugin');
const WebpackBuildNotifierPlugin = require('webpack-build-notifier');
const OptimizeCSSAssetsPlugin    = require('optimize-css-assets-webpack-plugin');

console.log(isDevelopment);

module.exports = {
    mode : 'development',
    entry: {
        'content-script': './app/assets/js/content-script-v2.js',
        'chrome-reload' : './app/assets/js/chrome-reload.js',
        background      : './app/assets/js/background.js',
        popup           : [
            './app/assets/js/popup.js',
            './app/assets/sass/popup.scss'
        ],
        main            : './app/assets/sass/main.scss'
    },

    output: {
        path      : path.resolve(__dirname, 'dist'),
        publicPath: '/assets/',
        filename  : 'assets/js/[name].js'
    },

    devtool     : 'source-map',
    module      : {
        rules: [
            {
                test  : /\.(sa|sc|c)ss$/,
                loader: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader : 'css-loader',
                        options: {
                            modules  : false,
                            sourceMap: isDevelopment
                        }
                    },
                    {
                        loader : 'sass-loader',
                        options: {
                            sourceMap: isDevelopment
                        }
                    }
                ]
            }
        ]
    },
    optimization: {
        minimizer: [
            new OptimizeCSSAssetsPlugin({})
        ]
    },
    plugins     : [
        new WebpackBuildNotifierPlugin(),
        new LiveReloadPlugin({
            port: 35729
        }),
        new CleanWebpackPlugin({
            verbose                : true,  // Write Logs to Console
            cleanStaleWebpackAssets: false  // Automatically remove all unused webpack assets on rebuild
        }),
        new webpackDashboard(),
        new webpack.ProvidePlugin({
            $              : 'jquery',
            jQuery         : 'jquery',
            'window.jQuery': 'jquery'
        }),
        new MiniCssExtractPlugin({
            filename     : 'assets/css/[name].css',
            chunkFilename: 'assets/css/[id].css'
        }),
        new CopyPlugin([
            {
                from: 'app/pages',
                to  : 'pages'
            },
            {
                from: 'app/assets/img',
                to  : 'assets/img'
            },
            {
                from: 'app/_locales',
                to  : '_locales'
            }
        ]),
        new MergeJsonWebpackPlugin({
            'files' : [
                './app/manifest/manifest_base.json',
                './app/manifest/manifest_dev.json'
            ],
            'output': {
                'fileName': 'manifest.json'
            }
        })
    ],
    watch       : true, // Set to false to keep the grunt process alive
    watchOptions: {
        aggregateTimeout: 500
        // poll: true // Use this when you need to fallback to poll based watching (webpack 1.9.1+ only)
    },
    resolve     : {
        extensions: ['.js', '.jsx', '.scss'],
        alias     : {
            'jquery-ui': 'jquery-ui-dist/jquery-ui.js'
        }
    }
};
