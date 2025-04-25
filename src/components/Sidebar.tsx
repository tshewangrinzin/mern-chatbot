
import { cn } from '@/lib/utils';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Trash2, Settings, Menu } from 'lucide-react';
import { useChat } from '@/context/ChatContext';
import { 
  Sidebar as ShadcnSidebar, 
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import SettingsDialog from './SettingsDialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';

const Sidebar = () => {
  const { chats, currentChatId, createNewChat, selectChat, deleteChat, clearChats } = useChat();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <ShadcnSidebar variant="floating" collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={toggleSidebar}>
                    <Menu size={16} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Navigate</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={createNewChat}>
                    <Plus size={16} />
                    <span>New Chat</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {chats.length > 0 && (
                  <SidebarMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <SidebarMenuButton>
                          <Trash2 size={16} />
                          <span>Clear History</span>
                        </SidebarMenuButton>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear all chats?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. All your chat history will be permanently removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={clearChats}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Chat History</SidebarGroupLabel>
            <SidebarGroupContent>
              <ScrollArea className="h-[calc(100vh-280px)] sidebar-scrollarea">
                {chats.length > 0 ? (
                  <SidebarMenu>
                    {chats.map((chat) => (
                      <SidebarMenuItem key={chat.id}>
                        <SidebarMenuButton
                          onClick={() => selectChat(chat.id)}
                          className={cn(
                            currentChatId === chat.id && "bg-accent text-accent-foreground",
                            "group/item"
                          )}
                        >
                          <MessageSquare size={16} />
                          <span className="flex-1 truncate">{chat.title}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChat(chat.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No chats yet. Start a new conversation!
                  </div>
                )}
              </ScrollArea>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setIsSettingsOpen(true)}>
                <Settings size={16} />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </ShadcnSidebar>
      
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
};

export default Sidebar;
