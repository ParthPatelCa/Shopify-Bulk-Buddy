import '@shopify/polaris/build/esm/styles.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif', margin: 0, background: '#fafbfc' }}>
        {children}
      </body>
    </html>
  );
}
