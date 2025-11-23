export default function StagingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ 
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      marginRight: 'calc(-50vw + 50%)',
      padding: '0 2.5vw',
      maxWidth: '100vw'
    }}>
      {children}
    </div>
  );
}
