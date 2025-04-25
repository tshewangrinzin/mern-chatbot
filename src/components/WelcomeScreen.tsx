
import React from 'react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/context/ChatContext';
import { Plus, Settings } from 'lucide-react';
import SettingsDialog from './SettingsDialog';

const WelcomeScreen: React.FC = () => {
  const { createNewChat, apiConfig } = useChat();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const needsApiKey = !apiConfig.apiKey;

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center max-w-md px-4">
        <h1 className="text-4xl font-bold mb-6">Chat Interface</h1>
        <p className="text-lg text-muted-foreground mb-8">
          A modern interface for LLM conversations. Connect to your preferred AI model and start chatting.
        </p>
        
        {needsApiKey ? (
          <div className="space-y-4">
            <p className="text-amber-600 mb-4">
              Please set up your API key and configuration to get started.
            </p>
            <Button 
              onClick={() => setIsSettingsOpen(true)} 
              variant="outline" 
              className="mx-auto flex items-center gap-2"
            >
              <Settings size={16} />
              Configure API Settings
            </Button>
          </div>
        ) : (
          <Button
            onClick={createNewChat}
            className="mx-auto flex items-center gap-2"
          >
            <Plus size={16} />
            Start a New Chat
          </Button>
        )}
        
        <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      </div>
    </div>
  );
};

export default WelcomeScreen;
