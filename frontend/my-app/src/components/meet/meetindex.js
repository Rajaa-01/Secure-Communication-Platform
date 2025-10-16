import React from 'react';
import MeetApp from './meetapp';
import { SocketProvider } from './context/SocketProvider';
import { ThemeProvider } from './context/ThemeContext';

const MeetRoot = () => {
  return (
    <React.StrictMode>
      <ThemeProvider>
        <SocketProvider>
          <MeetApp />
        </SocketProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
};

export default MeetRoot;