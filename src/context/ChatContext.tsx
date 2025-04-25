import React, { createContext, useContext, useState, useEffect } from 'react';
import { Chat, Message, ApiConfig } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';

interface ChatContextProps {
  chats: Chat[];
  currentChatId: string | null;
  apiConfig: ApiConfig;
  isLoading: boolean;
  setApiConfig: (config: ApiConfig) => void;
  createNewChat: () => void;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearChats: () => void;
  streamingContent: string;
  showThinking: boolean;
  setShowThinking: (show: boolean) => void;
  regenerateMessage: () => Promise<void>;
}

const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini'
};

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_API_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showThinking, setShowThinking] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    const savedApiConfig = localStorage.getItem('apiConfig');
    
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats);
        const formattedChats = parsedChats.map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.createdAt)
          }))
        }));
        setChats(formattedChats);
        
        if (formattedChats.length > 0) {
          setCurrentChatId(formattedChats[0].id);
        }
      } catch (error) {
        console.error('Failed to parse saved chats', error);
      }
    }

    if (savedApiConfig) {
      try {
        setApiConfig(JSON.parse(savedApiConfig));
      } catch (error) {
        console.error('Failed to parse saved API config', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('apiConfig', JSON.stringify(apiConfig));
  }, [apiConfig]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setChats(prevChats => [newChat, ...prevChats]);
    setCurrentChatId(newChat.id);
  };

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const deleteChat = (chatId: string) => {
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    
    if (currentChatId === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setCurrentChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
    }
  };

  const updateChatTitle = (chatId: string, messages: Message[]) => {
    if (messages.length >= 2) {
      const userMessage = messages.find(m => m.role === 'user')?.content || '';
      const newTitle = userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '');
      
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, title: newTitle, updatedAt: new Date() } 
            : chat
        )
      );
    }
  };

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

  const processStreamResponse = async (response: Response, chatId: string, userMessage?: Message): Promise<Message | null> => {
    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error?.message || errorMessage;
      } catch (e) {
        console.error("Couldn't parse error response", e);
      }
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullContent = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        
        if (line.includes('[DONE]')) continue;
        
        try {
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;
          
          const json = JSON.parse(jsonStr);
          const content = json.choices[0]?.delta?.content || '';
          
          if (content) {
            fullContent += content;
            setStreamingContent(fullContent);
          }
        } catch (error) {
          console.error('Error parsing stream:', error, line);
        }
      }
    }

    const { thinking, response: finalResponse } = extractThinking(fullContent);
    
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: fullContent,
      createdAt: new Date()
    };

    if (userMessage) {
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId
            ? { 
                ...chat, 
                messages: [...chat.messages, userMessage, assistantMessage],
                updatedAt: new Date()
              }
            : chat
        )
      );
    } else {
      setChats(prevChats => 
        prevChats.map(chat => {
          if (chat.id === chatId) {
            const messages = [...chat.messages];
            if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
              messages[messages.length - 1] = assistantMessage;
            }
            return { ...chat, messages, updatedAt: new Date() };
          }
          return chat;
        })
      );
    }

    return assistantMessage;
  };

  const sendMessage = async (content: string) => {
    if (!apiConfig.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your API key in the settings.",
        variant: "destructive",
      });
      return;
    }

    if (!currentChatId) {
      createNewChat();
    }

    const chatId = currentChatId || chats[0].id;
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      createdAt: new Date()
    };

    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId
          ? { 
              ...chat, 
              messages: [...chat.messages, userMessage],
              updatedAt: new Date()
            }
          : chat
      )
    );

    setStreamingContent('');
    
    try {
      setIsLoading(true);
      
      const currentChat = chats.find(chat => chat.id === chatId);
      
      if (!currentChat) {
        throw new Error('Chat not found');
      }
      
      const messages = [...currentChat.messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages,
          stream: true
        })
      });

      const assistantMessage = await processStreamResponse(response, chatId, userMessage);

      const updatedChat = chats.find(chat => chat.id === chatId);
      if (updatedChat && updatedChat.messages.length === 0) {
        updateChatTitle(chatId, [userMessage, assistantMessage!]);
      }
    } catch (error: any) {
      console.error('Failed to get response from API', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get response from API',
        variant: 'destructive',
      });

      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId
            ? { 
                ...chat, 
                messages: [...chat.messages],
                updatedAt: new Date()
              }
            : chat
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const regenerateMessage = async () => {
    if (!currentChatId || !apiConfig.apiKey) {
      toast({
        title: "Cannot Regenerate",
        description: "API key required or no active chat.",
        variant: "destructive",
      });
      return;
    }

    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (!currentChat || currentChat.messages.length < 2) {
      toast({
        title: "Cannot Regenerate",
        description: "Not enough messages to regenerate.",
        variant: "destructive",
      });
      return;
    }

    setStreamingContent('');
    
    try {
      setIsLoading(true);
      
      const messages = [...currentChat.messages];
      if (messages[messages.length - 1].role === 'assistant') {
        messages.pop();
      }
      
      const messagesToSend = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages: messagesToSend,
          stream: true
        })
      });

      await processStreamResponse(response, currentChatId);
    } catch (error: any) {
      console.error('Failed to regenerate response', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate response',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const clearChats = () => {
    setChats([]);
    setCurrentChatId(null);
  };

  return (
    <ChatContext.Provider 
      value={{
        chats,
        currentChatId,
        apiConfig,
        isLoading,
        setApiConfig,
        createNewChat,
        selectChat,
        deleteChat,
        sendMessage,
        clearChats,
        streamingContent,
        showThinking,
        setShowThinking,
        regenerateMessage
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
