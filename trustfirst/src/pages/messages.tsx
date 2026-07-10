import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Search, Send, Paperclip, MoreHorizontal, CheckCheck, Loader2, MessageSquare } from "lucide-react";
import {
  useConversations,
  useChatMessages,
  useSendMessage,
  useRealtimeMessages,
  type Conversation,
  type ChatMessage,
} from "@/hooks/use-messages";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Messages() {
  const { user } = useAuth();
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const { data: msgs = [], isLoading: messagesLoading } = useChatMessages(selectedPartnerId ?? undefined);
  const sendMessageMutation = useSendMessage();

  // Initialize WebSockets realtime listener
  useRealtimeMessages();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Select first conversation if none selected
  useEffect(() => {
    if (selectedPartnerId === null && conversations.length > 0) {
      setSelectedPartnerId(conversations[0].partner.id);
    }
  }, [conversations, selectedPartnerId]);

  const selectedConvo = conversations.find((c) => c.partner.id === selectedPartnerId);

  const filteredConvos = conversations.filter((c) =>
    !search || c.partner.name.toLowerCase().includes(search.toLowerCase()) || (c.lastMessage?.content && c.lastMessage.content.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || selectedPartnerId === null) return;

    sendMessageMutation.mutate(
      { receiverId: selectedPartnerId, content: message.trim() },
      {
        onSuccess: () => {
          setMessage("");
        },
      }
    );
  };

  const getPartnerBg = (id: number) => {
    const colors = [
      "bg-purple-100 text-purple-750",
      "bg-orange-100 text-orange-750",
      "bg-teal-100 text-teal-750",
      "bg-blue-100 text-blue-750",
      "bg-pink-100 text-pink-750",
    ];
    return colors[id % colors.length];
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation List */}
        <aside className="w-80 border-r flex flex-col flex-shrink-0">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                className="pl-9 h-9 rounded-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground px-4">
                No active conversations found. Start a project to begin chatting!
              </div>
            ) : (
              filteredConvos.map((convo) => {
                const partner = convo.partner;
                const isSelected = selectedPartnerId === partner.id;
                const initials = getInitials(partner.name);
                const colorBg = getPartnerBg(partner.id);
                return (
                  <button
                    key={partner.id}
                    onClick={() => setSelectedPartnerId(partner.id)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-all text-left ${
                      isSelected ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarFallback className={`font-bold text-xs ${colorBg}`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-sm truncate">{partner.name}</span>
                        {convo.lastMessage && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {new Date(convo.lastMessage.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {convo.lastMessage?.content ?? "Start a conversation"}
                      </p>
                      <p className="text-[10px] uppercase font-semibold text-primary/70 mt-0.5 tracking-wider">
                        {partner.role}
                      </p>
                    </div>
                    {convo.unreadCount > 0 && (
                      <Badge className="bg-primary text-white text-xs min-w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">
                        {convo.unreadCount}
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-secondary/10">
          {selectedConvo ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between bg-background">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={`font-bold text-sm ${getPartnerBg(selectedConvo.partner.id)}`}>
                        {getInitials(selectedConvo.partner.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{selectedConvo.partner.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="text-green-600">● Online</span>
                      <span className="mx-1">·</span>
                      <span className="capitalize">{selectedConvo.partner.role}</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : msgs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm">No messages yet. Send a message to start the conversation.</p>
                  </div>
                ) : (
                  msgs.map((msg, i) => {
                    const isMe = msg.senderId === user?.id;
                    const dateObj = new Date(msg.createdAt);
                    const formattedTime = dateObj.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.2) }}
                        className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {!isMe && (
                          <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                            <AvatarFallback className={`text-xs font-bold ${getPartnerBg(selectedConvo.partner.id)}`}>
                              {getInitials(selectedConvo.partner.name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-xs lg:max-w-md ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? "bg-primary text-white rounded-tr-sm"
                                : "bg-background text-foreground rounded-tl-sm shadow-sm"
                            }`}
                          >
                            {msg.content}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? "flex-row-reverse" : ""}`}>
                            <span className="text-[10px] text-muted-foreground">{formattedTime}</span>
                            {isMe && <CheckCheck className="h-3 w-3 text-primary" />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t bg-background">
                <form onSubmit={handleSend} className="flex items-center gap-3">
                  <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 rounded-full">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 rounded-full bg-secondary border-none focus-visible:ring-1 focus-visible:ring-primary text-sm h-10 px-4"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full bg-primary hover:bg-primary/90 flex-shrink-0 h-10 w-10"
                    disabled={!message.trim() || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">Your Messages</h3>
              <p className="text-xs max-w-xs text-center leading-relaxed">
                Select an active conversation from the sidebar to view messages, share files, and collaborate.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
