// next.config.js
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/venue-finder",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;