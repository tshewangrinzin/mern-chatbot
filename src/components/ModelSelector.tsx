import React, { useState, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Model {
  id: string;
  name: string;
}

interface ModelSelectorProps {
  className?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ className }) => {
  const { apiConfig, setApiConfig } = useChat();
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchModels = async () => {
      if (!apiConfig.baseUrl || !apiConfig.apiKey) {
        setError('API URL and API Key are required to fetch models');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiConfig.baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${apiConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }

        const data = await response.json();
        const modelList: Model[] = data.data?.map((model: any) => ({
          id: model.id,
          name: model.id.split('/').pop() || model.id
        })) || [];

        setModels(modelList);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch models');
        console.error('Error fetching models:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (apiConfig.baseUrl && apiConfig.apiKey) {
      fetchModels();
    }
  }, [apiConfig.baseUrl, apiConfig.apiKey]);

  const handleModelChange = (modelId: string) => {
    setApiConfig({
      ...apiConfig,
      model: modelId,
    });
    setOpen(false);
  };

  const filteredModels = models.filter(model =>
    model.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="px-2 py-1 rounded-lg text-sm text-muted-foreground transition-colors border border-dashed border-input hover:border-input hover:bg-muted flex items-center justify-between gap-1 h-auto w-auto"
          aria-expanded={open}
        >
          <span>{models.find(m => m.id === apiConfig.model)?.name || apiConfig.model || 'Select model'}</span>
          <span className="sr-only">Toggle model selection</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="end" side="top">
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CommandList>
            {isLoading ? (
              <CommandEmpty>Loading models...</CommandEmpty>
            ) : error ? (
              <CommandEmpty>{error}</CommandEmpty>
            ) : filteredModels.length === 0 ? (
              <CommandEmpty>No models found</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredModels.map((model) => (
                  <CommandItem
                    key={model.id}
                    onSelect={() => handleModelChange(model.id)}
                    className="cursor-pointer"
                  >
                    {model.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ModelSelector;