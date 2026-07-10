import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Search, Send, Paperclip, MoreHorizontal, CheckCheck } from "lucide-react";

const CONVERSATIONS = [
  { id: 1, name: "Sarah Chen", initials: "SC", bg: "bg-purple-100 text-purple-700", role: "Client", lastMessage: "Looks great! Can you share the updated designs?", time: "2m", unread: 2, online: true, contract: "AI Dashboard" },
  { id: 2, name: "Marcus Johnson", initials: "MJ", bg: "bg-orange-100 text-orange-700", role: "Client", lastMessage: "When can you start the next milestone?", time: "1h", unread: 0, online: false, contract: "AI Chatbot" },
  { id: 3, name: "Emma Rodriguez", initials: "ER", bg: "bg-teal-100 text-teal-700", role: "Client", lastMessage: "Thanks for the proposal. We'll review it today.", time: "3h", unread: 0, online: false, contract: "E-Commerce Redesign" },
  { id: 4, name: "James Wilson", initials: "JW", bg: "bg-blue-100 text-blue-700", role: "Freelancer", lastMessage: "I've pushed the latest updates to the repo.", time: "Yesterday", unread: 0, online: true, contract: "SaaS Dashboard" },
];

const MESSAGES: Record<number, Array<{ id: number; text: string; from: "me" | "them"; time: string; status?: string }>> = {
  1: [
    { id: 1, text: "Hi James! I've reviewed your latest dashboard mockups and I'm really impressed!", from: "them", time: "10:02 AM" },
    { id: 2, text: "Thank you, Sarah! I'm glad you like it. I spent extra time on the data visualization layer.", from: "me", time: "10:05 AM" },
    { id: 3, text: "The charts look amazing. The color scheme matches our brand perfectly.", from: "them", time: "10:06 AM" },
    { id: 4, text: "I've also added the AI predictions panel you requested. It uses GPT-4 to forecast the metrics.", from: "me", time: "10:15 AM" },
    { id: 5, text: "That's exactly what we needed! 🎉", from: "them", time: "10:16 AM" },
    { id: 6, text: "Looks great! Can you share the updated designs?", from: "them", time: "10:30 AM" },
  ],
  2: [
    { id: 1, text: "The chatbot is live and handling queries perfectly!", from: "me", time: "Yesterday 3:00 PM" },
    { id: 2, text: "Incredible work, David! The response accuracy is above 94%.", from: "them", time: "Yesterday 3:15 PM" },
    { id: 3, text: "When can you start the next milestone?", from: "them", time: "Yesterday 5:00 PM" },
  ],
};

export default function Messages() {
  const { user } = useAuth();
  const [selected, setSelected] = useState(1);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const conversation = CONVERSATIONS.find(c => c.id === selected)!;
  const msgs = MESSAGES[selected] || [];

  const filteredConvos = CONVERSATIONS.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.contract.toLowerCase().includes(search.toLowerCase())
  );

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setMessage("");
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
              <Input placeholder="Search messages..." className="pl-9 h-9 rounded-full" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvos.map(convo => (
              <button
                key={convo.id}
                onClick={() => setSelected(convo.id)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-secondary/50 transition-all text-left ${selected === convo.id ? "bg-primary/5 border-l-2 border-primary" : ""}`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className={`font-bold ${convo.bg}`}>{convo.initials}</AvatarFallback>
                  </Avatar>
                  {convo.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-sm truncate">{convo.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{convo.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{convo.lastMessage}</p>
                  <p className="text-xs text-primary/70 mt-0.5">{convo.contract}</p>
                </div>
                {convo.unread > 0 && (
                  <Badge className="bg-primary text-white text-xs min-w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">{convo.unread}</Badge>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b flex items-center justify-between bg-background">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`font-bold ${conversation.bg}`}>{conversation.initials}</AvatarFallback>
                </Avatar>
                {conversation.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />}
              </div>
              <div>
                <div className="font-semibold text-sm">{conversation.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {conversation.online ? <span className="text-green-600">● Online</span> : <span>● Offline</span>}
                  <span className="mx-1">·</span>
                  <span>{conversation.contract}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {msgs.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex gap-3 ${msg.from === "me" ? "flex-row-reverse" : "flex-row"}`}
              >
                {msg.from === "them" && (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={`text-xs font-bold ${conversation.bg}`}>{conversation.initials}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-xs lg:max-w-md ${msg.from === "me" ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                    msg.from === "me"
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-secondary text-foreground rounded-tl-sm"
                  }`}>
                    {msg.text}
                  </div>
                  <div className={`flex items-center gap-1 mt-1 ${msg.from === "me" ? "flex-row-reverse" : ""}`}>
                    <span className="text-xs text-muted-foreground">{msg.time}</span>
                    {msg.from === "me" && <CheckCheck className="h-3 w-3 text-primary" />}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t bg-background">
            <form onSubmit={sendMessage} className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="icon" className="flex-shrink-0">
                <Paperclip className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="flex-1 rounded-full bg-secondary border-none focus-visible:ring-1 focus-visible:ring-primary"
              />
              <Button type="submit" size="icon" className="rounded-full bg-primary hover:bg-primary/90 flex-shrink-0" disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
