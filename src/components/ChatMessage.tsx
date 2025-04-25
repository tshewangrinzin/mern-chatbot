
import React, { useState } from 'react';
import { Message } from '@/types/chat';
import { Bot, User, Copy, RotateCw, Check, Code, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRegenerate }) => {
  const { toast } = useToast();
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [copyCodeState, setCopyCodeState] = useState<Record<string, 'idle' | 'copied'>>({});
  const [isThinkingOpen, setIsThinkingOpen] = useState(true);
  
  // Extract any thinking content
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

  const { thinking, response } = extractThinking(message.content);
  const displayContent = response || message.content;

  // Function to copy text to clipboard
  const copyToClipboard = async (text: string, type: 'message' | 'thinking' | 'code', codeIndex?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'message') {
        setCopyState('copied');
        setTimeout(() => setCopyState('idle'), 2000);
        toast({
          title: "Copied to clipboard",
          description: "Response copied to clipboard",
        });
      } else if (type === 'thinking') {
        toast({
          title: "Copied to clipboard",
          description: "Thinking process copied to clipboard",
        });
      } else if (type === 'code' && codeIndex !== undefined) {
        setCopyCodeState(prev => ({ ...prev, [codeIndex]: 'copied' }));
        setTimeout(() => {
          setCopyCodeState(prev => ({ ...prev, [codeIndex]: 'idle' }));
        }, 2000);
        toast({
          title: "Copied to clipboard",
          description: "Code snippet copied to clipboard",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };
  
  // Regenerate response handler
  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };

  // Track code blocks for copy buttons
  const codeBlocks: string[] = [];
  let codeBlockIndex = 0;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex justify-end">
        <div 
          className={`rounded-2xl relative group ${message.role === 'user' ? 'bg-chat-user inline-block max-w-max py-2 px-3' : 'bg-chat-assistant w-full p-4'}`}
        >
          <div className={`overflow-hidden`}>
            <div className={`prose prose-sm ${message.role === 'user' ? 'text-right' : ''}`}>
              {/* Show thinking content if available */}
              {thinking && message.role === 'assistant' && (
                <Collapsible 
                  open={isThinkingOpen} 
                  onOpenChange={setIsThinkingOpen}
                  className="mb-4"
                >
                  <div className="p-3 bg-[hsl(var(--thinking-bg))] rounded-xl border border-[hsl(var(--thinking-border))]">
                    <CollapsibleTrigger asChild>
                      <div className="font-medium text-[hsl(var(--thinking-text))] mb-1 text-sm flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                          </svg>
                          Thinking...
                          {isThinkingOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[hsl(var(--thinking-text))] hover:text-[hsl(var(--thinking-text))] hover:bg-[hsl(var(--thinking-hover))]"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (thinking) {
                              copyToClipboard(thinking, 'thinking');
                            }
                          }}
                        >
                          <Copy size={14} />
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="text-[hsl(var(--thinking-text))] whitespace-pre-wrap">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({ node, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeContent = String(children).replace(/\n$/, '');
                              
                              if (!className?.includes('language-')) {
                                return (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                              
                              // Store the code block for copy functionality
                              codeBlocks.push(codeContent);
                              const currentIndex = codeBlockIndex++;
                              
                              return (
                                <div className="relative">
                                  <div className="absolute right-2 top-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md"
                                      onClick={() => copyToClipboard(codeContent, 'code', currentIndex)}
                                    >
                                      {copyCodeState[currentIndex] === 'copied' ? (
                                        <Check size={14} />
                                      ) : (
                                        <Copy size={14} />
                                      )}
                                    </Button>
                                  </div>
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match?.[1] || ''}
                                    PreTag="div"
                                    {...props}
                                  >
                                    {codeContent}
                                  </SyntaxHighlighter>
                                </div>
                              );
                            },
                          }}
                        >
                          {thinking}
                        </ReactMarkdown>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )}
              
              {/* Reset code block index for response section */}
              {(() => { codeBlockIndex = 0; return null; })()}
              
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeContent = String(children).replace(/\n$/, '');
                    
                    if (!className?.includes('language-')) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                    
                    // Store the code block for copy functionality
                    codeBlocks.push(codeContent);
                    const currentIndex = codeBlockIndex++;
                    
                    return (
                      <div className="relative">
                        <div className="absolute right-2 top-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md"
                            onClick={() => copyToClipboard(codeContent, 'code', currentIndex)}
                          >
                            {copyCodeState[currentIndex] === 'copied' ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </Button>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match?.[1] || ''}
                          PreTag="div"
                          {...props}
                        >
                          {codeContent}
                        </SyntaxHighlighter>
                      </div>
                    );
                  },
                }}
              >
                {displayContent}
              </ReactMarkdown>
              
              {/* Action buttons for messages */}
              <div className={`opacity-0 group-hover:opacity-100 transition-opacity absolute ${message.role === 'user' ? 'right-4' : 'left-4'} -bottom-8 flex gap-2 z-20`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-gray-700"
                      onClick={() => copyToClipboard(displayContent, 'message')}
                    >
                      {copyState === 'copied' ? <Check size={16} /> : <Copy size={16} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" className="bg-popover text-popover-foreground">
                    <p>Copy</p>
                  </TooltipContent>
                </Tooltip>
                
                
                
                {message.role === 'assistant' && onRegenerate && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-gray-700"
                        onClick={handleRegenerate}
                      >
                        <RotateCw size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="bg-popover text-popover-foreground">
                      <p>Regenerate</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {message.role === 'assistant' && codeBlocks.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-gray-700"
                        onClick={() => copyToClipboard(codeBlocks.join('\n\n'), 'code', -1)}
                      >
                        <Code size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="bg-popover text-popover-foreground">
                      <p>Copy all code</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ChatMessage;
