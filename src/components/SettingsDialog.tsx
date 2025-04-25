
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useChat } from '@/context/ChatContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Model {
  id: string;
  name?: string;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const { apiConfig, setApiConfig } = useChat();
  const [formState, setFormState] = React.useState(apiConfig);
  const [modelInputType, setModelInputType] = React.useState<'select' | 'manual'>('select');
  const [availableModels, setAvailableModels] = React.useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = React.useState(false);
  const [modelError, setModelError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFormState(apiConfig);
    // Determine initial tab based on whether the model is in the predefined list
    const predefinedModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'];
    setModelInputType(predefinedModels.includes(apiConfig.model) ? 'select' : 'manual');
  }, [apiConfig, open]);

  // Fetch available models when baseUrl changes and we have an API key
  React.useEffect(() => {
    const fetchModels = async () => {
      if (!formState.baseUrl || !formState.apiKey) return;
      
      setIsLoadingModels(true);
      setModelError(null);
      
      try {
        // Construct the models endpoint URL
        const modelsUrl = `${formState.baseUrl.endsWith('/') ? formState.baseUrl.slice(0, -1) : formState.baseUrl}/models`;
        
        const response = await fetch(modelsUrl, {
          headers: {
            'Authorization': `Bearer ${formState.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle different API responses (OpenAI, Groq, etc.)
        let models: Model[] = [];
        if (data.data && Array.isArray(data.data)) {
          // Standard OpenAI/Groq format
          models = data.data.map((model: any) => ({
            id: model.id,
            name: model.name || model.id
          }));
        } else if (data.models && Array.isArray(data.models)) {
          // Alternative format some providers might use
          models = data.models.map((model: any) => ({
            id: typeof model === 'string' ? model : model.id,
            name: typeof model === 'string' ? model : (model.name || model.id)
          }));
        }
        
        setAvailableModels(models);
        
        // If we have models and the current model isn't in the list, select the first one
        if (models.length > 0 && !models.some(m => m.id === formState.model)) {
          setFormState(prev => ({ ...prev, model: models[0].id }));
          setModelInputType('select');
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        setModelError(error instanceof Error ? error.message : 'Failed to fetch models');
        // Fall back to predefined models
        setAvailableModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };
    
    fetchModels();
  }, [formState.baseUrl, formState.apiKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormState(prev => ({ ...prev, model: value }));
  };

  const handleModelInputTypeChange = (value: string) => {
    setModelInputType(value as 'select' | 'manual');
    // Reset the model value when switching between input types
    if (value === 'select') {
      // If we have available models, use the first one, otherwise use default
      if (availableModels.length > 0) {
        setFormState(prev => ({ ...prev, model: availableModels[0].id }));
      } else {
        setFormState(prev => ({ ...prev, model: 'gpt-4o-mini' }));
      }
    } else {
      setFormState(prev => ({ ...prev, model: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiConfig(formState);
    onOpenChange(false);
  };

  // Determine if we should show auto-detected models or fallback to predefined ones
  const showAutoDetectedModels = availableModels.length > 0;
  const predefinedModels = [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>API Settings</DialogTitle>
            <DialogDescription>
              Configure your LLM API settings. These settings will be saved in your browser.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                name="baseUrl"
                value={formState.baseUrl}
                onChange={handleChange}
                placeholder="https://api.openai.com/v1"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                value={formState.apiKey}
                onChange={handleChange}
                placeholder="sk-..."
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Model</Label>
              {isLoadingModels ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading available models...</span>
                </div>
              ) : (
                <Tabs 
                  defaultValue={modelInputType} 
                  value={modelInputType}
                  onValueChange={handleModelInputTypeChange}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="select">Select Model</TabsTrigger>
                    <TabsTrigger value="manual">Custom Model</TabsTrigger>
                  </TabsList>
                  <TabsContent value="select" className="mt-2">
                    {modelError && (
                      <div className="text-sm text-red-500 mb-2">
                        {modelError}. Using predefined models instead.
                      </div>
                    )}
                    <Select
                      value={formState.model}
                      onValueChange={handleSelectChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {showAutoDetectedModels ? (
                          availableModels.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name || model.id}
                            </SelectItem>
                          ))
                        ) : (
                          predefinedModels.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {showAutoDetectedModels && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ Models auto-detected from API
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="manual" className="mt-2">
                    <Input
                      id="model"
                      name="model"
                      value={formState.model}
                      onChange={handleChange}
                      placeholder="Enter model name (e.g., gpt-4-turbo)"
                      required
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={isLoadingModels}>Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
