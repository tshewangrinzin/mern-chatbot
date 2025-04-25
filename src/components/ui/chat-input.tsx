"use client";

import { useEffect, useRef, useCallback } from "react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    ImageIcon,
    FileUp,
    Paperclip,
    ArrowUpIcon,
    PlusIcon,
} from "lucide-react";
import ModelSelector from "@/components/ModelSelector";

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;
            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    isLoading?: boolean;
    placeholder?: string;
}

export function ChatInput({
    value,
    onChange,
    onSend,
    isLoading,
    placeholder = "Type a message...",
}: ChatInputProps) {
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 60,
        maxHeight: 200,
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !isLoading) {
                onSend();
                adjustHeight(true);
            }
        }
    };

    return (
        <div className="relative bg-background rounded-xl border border-input shadow-lg">
            <div className="overflow-y-auto">
                <Textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        adjustHeight();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={cn(
                        "w-full px-4 py-3",
                        "resize-none",
                        "bg-transparent",
                        "border-none",
                        "text-foreground text-sm",
                        "focus:outline-none",
                        "focus-visible:ring-0 focus-visible:ring-offset-0",
                        "placeholder:text-muted-foreground placeholder:text-sm",
                        "min-h-[60px]"
                    )}
                    style={{
                        overflow: "hidden",
                    }}
                />
            </div>

            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="group p-2 hover:bg-muted rounded-lg transition-colors flex items-center gap-1"
                    >
                        <Paperclip className="w-4 h-4 text-foreground" />
                        <span className="text-xs text-muted-foreground hidden group-hover:inline transition-opacity">
                            Attach
                        </span>
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <ModelSelector />
                    <button
                        type="button"
                        onClick={() => {
                            if (value.trim() && !isLoading) {
                                onSend();
                                adjustHeight(true);
                            }
                        }}
                        className={cn(
                            "px-1.5 py-1.5 rounded-lg text-sm transition-colors border border-input hover:border-input hover:bg-muted flex items-center justify-between gap-1",
                            value.trim()
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground"
                        )}
                    >
                        <ArrowUpIcon
                            className={cn(
                                "w-4 h-4",
                                value.trim()
                                    ? "text-primary-foreground"
                                    : "text-muted-foreground"
                            )}
                        />
                        <span className="sr-only">Send</span>
                    </button>
                </div>
            </div>
        </div>
    );
}