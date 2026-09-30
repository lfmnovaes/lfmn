import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
export default withNextIntl({ allowedDevOrigins: ['127.0.0.1'] });
