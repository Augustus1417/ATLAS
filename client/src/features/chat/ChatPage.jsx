import React, { useState, useRef, useEffect } from 'react';
import { atlasApi } from '../../services/atlasApi';
import { useAuth } from '../../context/AuthContext';
import './chat.css';

export default function ChatPage() {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hey! 👋 I\'m your PC building assistant. Ask me anything about building a PC, component compatibility, or get personalized recommendations!',
      parts: null,
      sources: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Save the message before clearing input
    const userMessageText = input;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      role: 'user',
      content: userMessageText,
      parts: null,
      sources: null,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages
        .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
        .concat([
          {
            role: 'user',
            content: userMessageText,
          },
        ]);

      const response = await atlasApi.sendChatMessage(
        {
          message: userMessageText,
          conversation_history: conversationHistory,
        },
        token
      );

      const assistantMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: response.message,
        parts: response.recommended_parts,
        sources: response.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: messages.length + 2,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        parts: null,
        sources: null,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <h1>PC Building Chat</h1>
        <p>Welcome, {user?.username}!</p>
      </div>

      <div className="chat-container">
        <div className="messages-list">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-content">
                <p>{msg.content}</p>

                {msg.parts && msg.parts.length > 0 && (
                  <div className="recommended-parts">
                    <h4>Recommended Parts:</h4>
                    {msg.parts.map((part, idx) => (
                      <div key={idx} className="part-card">
                        <h5>{part.category}</h5>
                        <p className="part-name">{part.name}</p>
                        {part.listings && part.listings.length > 0 && (
                          <div className="listings">
                            {part.listings.map((listing, lidx) => (
                              <div key={lidx} className="listing">
                                <span className="store">{listing.store}</span>
                                <span className="price">
                                  ₱{listing.price?.toLocaleString() || 'N/A'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="sources">
                    <small>Sources: {msg.sources.join(', ')}</small>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message assistant loading">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me about PC builds, components, compatibility..."
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
