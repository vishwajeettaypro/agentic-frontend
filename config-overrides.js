module.exports = function override(webpackConfig) {
  webpackConfig.ignoreWarnings = [
    ...(webpackConfig.ignoreWarnings || []),
    {
      module: /node_modules\/@coreui\/icons/,
    },
    /Failed to parse source map.*@coreui/,
  ];

  return webpackConfig;
};
