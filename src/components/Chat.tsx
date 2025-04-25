
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SendIcon, Eye, EyeOff, ChevronDown } from 'lucide-react';
import ChatMessage from './ChatMessage';
import WelcomeScreen from './WelcomeScreen';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChatInput } from "@/components/ui/chat-input";

const Chat: React.FC = () => {
  const { 
    chats, 
    currentChatId, 
    sendMessage, 
    isLoading,
    streamingContent,
    showThinking,
    setShowThinking,
    regenerateMessage
  } = useChat();
  
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isThinkingOpen, setIsThinkingOpen] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const currentChat = chats.find((chat) => chat.id === currentChatId);
  const messages = currentChat?.messages || [];
  
  // Extract any thinking content from streaming response
  const extractThinking = (content: string): { thinking: string | null, response: string } => {
    // Support multiple thinking formats from different LLM providers
    // Format 1: <think>...</think> (standard format)
    // Format 2: [thinking]...[/thinking] (alternative format)
    // Format 3: <!-- thinking: ... --> (comment format)
    // Format 4: {"thinking": "..."} (JSON format)
    
    let thinking: string | null = null;
    let response = content;
    
    // Try standard <think> format
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      response = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      return { thinking, response };
    }
    
    // Try alternative [thinking] format
    const altThinkMatch = content.match(/\[thinking\]([\s\S]*?)\[\/thinking\]/);
    if (altThinkMatch) {
      thinking = altThinkMatch[1].trim();
      response = content.replace(/\[thinking\][\s\S]*?\[\/thinking\]/, '').trim();
      return { thinking, response };
    }
    
    // Try HTML comment format
    const commentThinkMatch = content.match(/<!--\s*thinking:\s*([\s\S]*?)\s*-->/);
    if (commentThinkMatch) {
      thinking = commentThinkMatch[1].trim();
      response = content.replace(/<!--\s*thinking:\s*[\s\S]*?\s*-->/, '').trim();
      return { thinking, response };
    }
    
    // Try JSON format (for models that might output JSON)
    try {
      if (content.includes('"thinking"') || content.includes("'thinking'")) {
        // Extract JSON-like parts that might contain thinking
        const jsonMatch = content.match(/\{[\s\S]*?"thinking"[\s\S]*?\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.thinking) {
              thinking = parsed.thinking.trim();
              response = content.replace(jsonStr, '').trim();
              return { thinking, response };
            }
          } catch (e) {
            // Failed to parse as JSON, continue with other formats
          }
        }
      }
    } catch (e) {
      // If JSON parsing fails, continue with original content
    }
    
    return { thinking, response };
  };

  const { thinking, response } = streamingContent ? extractThinking(streamingContent) : { thinking: null, response: '' };
  
  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // Force scroll to bottom
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        
        // Check if we're actually at the bottom after scrolling
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isBottom = scrollHeight - scrollTop - clientHeight < 30;
        setIsAtBottom(isBottom);
      }
    }
  }, [messages, isLoading, streamingContent, currentChatId]);

  // Add scroll event listener to detect if user is at bottom
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Consider user at bottom if they're within 30px of the bottom
      const isBottom = scrollHeight - scrollTop - clientHeight < 30;
      setIsAtBottom(isBottom);
    };

    // Initial check - run this after a small delay to ensure accurate measurements
    setTimeout(() => {
      handleScroll();
    }, 100);
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollAreaRef, currentChatId]); // Add currentChatId as dependency to re-run when chat changes

  const scrollToBottom = () => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
      setIsAtBottom(true);
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() && !isLoading) {
      const messageToSend = inputValue;
      setInputValue('');
      await sendMessage(messageToSend);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRegenerate = async () => {
    if (!isLoading && currentChatId) {
      await regenerateMessage();
    }
  };

  if (!currentChatId && chats.length === 0) {
    return <WelcomeScreen />;
  }

  // Check if the last message is from the assistant and is currently being streamed
  const isLastMessageStreaming = 
    messages.length > 0 && 
    messages[messages.length - 1].role === 'assistant' && 
    isLoading;

  return (
    <div className="flex flex-col h-screen">
      <ScrollArea ref={scrollAreaRef} className="flex-1 pb-4">
        <div className="max-w-3xl mx-auto p-4">
          <div className="space-y-4 pb-40">  {/* Increased padding from pb-32 to pb-40 for more space at bottom */}
            {messages.map((message, index) => {
              const isUserMessage = message.role === 'user';
              const isLastUserMessageOfItsKind = isUserMessage && 
                messages.findIndex((m, i) => i > index && m.role === 'user' && m.content === message.content) === -1;
              
              const shouldShowMessage = 
                (!isUserMessage || isLastUserMessageOfItsKind) && 
                (!isLastMessageStreaming || index < messages.length - 1);
              
              return shouldShowMessage && (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  onRegenerate={
                    message.role === 'assistant' && messages[messages.length - 1].id === message.id && !isLoading
                      ? handleRegenerate 
                      : undefined
                  } 
                />
              );
            })}
            
            {isLoading && streamingContent && (
              <ChatMessage 
                message={{
                  id: 'streaming',
                  role: 'assistant',
                  content: response,
                  thinking: thinking
                }}
              />
            )}
          </div>
        </div>
      </ScrollArea>
      
      {!isAtBottom && (
        <div className="fixed bottom-40 left-[calc(69%+100px)] z-50 fade-in duration-300">
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 w-8 h-8" 
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="absolute bottom-6 left-0 right-0 z-10">
        <div className="max-w-2xl mx-auto px-4">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            isLoading={isLoading}
            placeholder="Ask a question..."
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;
