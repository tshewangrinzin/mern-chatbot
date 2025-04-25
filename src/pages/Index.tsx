
import React from 'react';
import Layout from '@/components/Layout';
import Chat from '@/components/Chat';
import { ChatProvider } from '@/context/ChatContext';

const Index = () => {
  return (
    <ChatProvider>
      <Layout>
        <Chat />
      </Layout>
    </ChatProvider>
  );
};

export default Index;
