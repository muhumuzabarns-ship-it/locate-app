import { useState } from "react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "admin", text: "Hi 👋 Welcome to LOCATE! How can we help you find something?" }
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { from: "user", text: input }]);
    setInput("");
    // auto reply
    setTimeout(() => {
      setMessages(prev => [...prev, { from: "admin", text: "Thanks! Our team will reply soon on WhatsApp. Or message us on WhatsApp: +256..." }]);
    }, 1000);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed", bottom: "20px", right: "20px",
          background: "#25D366", color: "white", border: "none",
          borderRadius: "50px", padding: "14px 22px", 
          fontWeight: "bold", cursor: "pointer", zIndex: 9999,
          boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
        }}
      >
        💬 Message Us
      </button>

      {/* Chat Inbox Box */}
      {open && (
        <div style={{
          position: "fixed", bottom: "80px", right: "20px",
          width: "320px", height: "400px", background: "white",
          borderRadius: "15px", boxShadow: "0 5px 25px rgba(0,0,0,0.3)",
          zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{ background: "#075E54", color: "white", padding: "12px", fontWeight: "bold" }}>
            LOCATE Support
            <span onClick={() => setOpen(false)} style={{ float: "right", cursor: "pointer" }}>✕</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: "10px", overflowY: "auto", background: "#e5ddd5" }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                background: m.from === "user" ? "#dcf8c6" : "white",
                padding: "8px 12px", borderRadius: "8px",
                margin: "5px 0", maxWidth: "80%",
                alignSelf: m.from === "user" ? "flex-end" : "flex-start",
                marginLeft: m.from === "user" ? "auto" : "0"
              }}>
                {m.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: "flex", padding: "8px", background: "white" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              style={{ flex: 1, border: "1px solid #ddd", borderRadius: "20px", padding: "8px 12px" }}
            />
            <button onClick={sendMessage} style={{ background: "#25D366", border: "none", borderRadius: "50%", width: "36px", height: "36px", marginLeft: "5px", cursor: "pointer" }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}